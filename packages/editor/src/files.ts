import {
  DocumentError,
  toNested,
  validateDocumentFile,
  type DocumentFile,
  type FlatDocument,
} from '@facadeur/core';

export interface JsonFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

export interface OpenedJson {
  name: string;
  text: string;
  handle?: JsonFileHandle;
}

export type SaveVia = 'handle' | 'picker' | 'dev' | 'download';

/** Nested document JSON, stable enough to diff in git. */
export function documentToJson(doc: FlatDocument): string {
  return `${JSON.stringify(toNested(doc), null, 2)}\n`;
}

export function parseDocumentText(text: string): DocumentFile {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new DocumentError('schema', 'File is not JSON');
  }
  return validateDocumentFile(data);
}

export function suggestedFilename(id: string, sources: Readonly<Record<string, string>>): string {
  return sources[id] ?? `${id}.json`;
}

/**
 * Open a document JSON. Uses the File System Access API when the browser has it,
 * otherwise a file input.
 */
export async function openJsonFile(): Promise<OpenedJson | null> {
  const picker = fileAccess().showOpenFilePicker;
  if (typeof picker === 'function') {
    try {
      const [handle] = await picker({
        multiple: false,
        types: jsonTypes(),
      });
      if (!handle) return null;
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), handle };
    } catch (error) {
      if (isAbort(error)) return null;
      throw error;
    }
  }
  return openWithInput();
}

/**
 * Write a document. Prefers an existing handle, then a save picker, then the
 * Vite dev route, then a download.
 */
export async function saveJsonFile(options: {
  filename: string;
  text: string;
  handle?: JsonFileHandle | null;
}): Promise<{ via: SaveVia; handle?: JsonFileHandle }> {
  if (options.handle) {
    await writeHandle(options.handle, options.text);
    return { via: 'handle', handle: options.handle };
  }
  const picker = fileAccess().showSaveFilePicker;
  if (typeof picker === 'function') {
    try {
      const handle = await picker({
        suggestedName: options.filename,
        types: jsonTypes(),
      });
      await writeHandle(handle, options.text);
      return { via: 'picker', handle };
    } catch (error) {
      if (isAbort(error)) throw error;
    }
  }
  if (await saveThroughDevServer(options.filename, options.text)) {
    return { via: 'dev' };
  }
  download(options.filename, options.text);
  return { via: 'download' };
}

export async function saveThroughDevServer(filename: string, text: string): Promise<boolean> {
  try {
    const response = await fetch('/__facadeur/examples', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ filename, text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function jsonTypes(): { description: string; accept: Record<string, string[]> }[] {
  return [{ description: 'Facadeur document', accept: { 'application/json': ['.json'] } }];
}

async function writeHandle(handle: JsonFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

function download(name: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openWithInput(): Promise<OpenedJson | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    let settled = false;
    const finish = (value: OpenedJson | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      resolve(value);
    };
    const onFocus = () => {
      window.setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 400);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      void file.text().then((text) => finish({ name: file.name, text }));
    });
    window.addEventListener('focus', onFocus);
    input.click();
  });
}

function fileAccess(): {
  showOpenFilePicker?: (options: {
    multiple?: boolean;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<JsonFileHandle[]>;
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<JsonFileHandle>;
} {
  return window as Window & {
    showOpenFilePicker?: (options: {
      multiple?: boolean;
      types?: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<JsonFileHandle[]>;
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<JsonFileHandle>;
  };
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
