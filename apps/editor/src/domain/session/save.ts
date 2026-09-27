import {
  DocumentError,
  toNested,
  validateCatalog,
  type DefaultKind,
  type DocumentFile,
  type FlatDocument,
} from '@facadeur/core';
import { createDocumentStore, type YjsDocumentStore } from '@facadeur/store-yjs';
import type { DesignInput } from '@facadeur/tokens';
import { renderIdForNode } from '../selection-model.js';
import { clearDocumentSaved, markDocumentSaved, type SavedJsonBaselines } from '../save-state.js';
import { documentToJson, saveJsonFile, type JsonFileHandle } from '../files.js';
import { errorText, kindOf } from './kinds.js';
import type { EditorNotice } from './types.js';

export function bindPersistDocumentSave(options: {
  build: () => { filename: string; document: FlatDocument; id: string };
  getHandle: (id: string) => JsonFileHandle | undefined;
  rememberHandle: (id: string, handle: JsonFileHandle) => void;
  markSaved: (id: string, document: FlatDocument) => void;
  setNotice: (notice: EditorNotice) => void;
  publish: () => void;
}): () => Promise<boolean> {
  return async () => {
    const target = options.build();
    return persistEditorJsonSave({
      filename: target.filename,
      document: target.document,
      handle: options.getHandle(target.id),
      onHandle: (handle) => options.rememberHandle(target.id, handle),
      onMarkedSaved: () => options.markSaved(target.id, target.document),
      setNotice: options.setNotice,
      publish: options.publish,
    });
  };
}

export function boardDocumentsForOrder(
  order: readonly string[],
  assetStores: ReadonlyMap<string, YjsDocumentStore>,
) {
  return order.flatMap((id) => {
    const store = assetStores.get(id);
    return store ? [toNested(store.getDocument())] : [];
  });
}

export function boardStoresForOrder(
  order: readonly string[],
  assetStores: ReadonlyMap<string, YjsDocumentStore>,
) {
  return order.flatMap((id) => {
    const store = assetStores.get(id);
    return store ? [store] : [];
  });
}

export function designInputFromStore(store: YjsDocumentStore): DesignInput {
  const doc = store.getDocument();
  return {
    tokens: doc.tokens,
    fonts: doc.fonts,
    breakpoints: doc.settings.breakpoints,
  };
}

export async function persistEditorJsonSave(options: {
  filename: string;
  document: FlatDocument;
  handle?: JsonFileHandle;
  onHandle: (handle: JsonFileHandle) => void;
  onMarkedSaved: () => void;
  setNotice: (notice: EditorNotice) => void;
  publish: () => void;
}): Promise<boolean> {
  try {
    const result = await saveJsonFile({
      filename: options.filename,
      text: documentToJson(options.document),
      handle: options.handle,
    });
    if (result.handle) options.onHandle(result.handle);
    options.onMarkedSaved();
    const verb = result.via === 'download' ? 'Downloaded' : 'Saved';
    options.setNotice({ tone: 'info', text: `${verb} ${options.filename}` });
    options.publish();
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    options.setNotice({
      tone: 'error',
      text: error instanceof Error ? error.message : 'Could not save',
    });
    options.publish();
    return false;
  }
}

export function registerSessionAssetDocuments(options: {
  documents: readonly DocumentFile[];
  designId: string;
  resolveKind: (componentId: string) => string | undefined;
  assetStores: Map<string, YjsDocumentStore>;
  order: string[];
}): void {
  for (const file of options.documents) {
    if (options.assetStores.has(file.id)) {
      throw new DocumentError('duplicate-id', `Duplicate document id "${file.id}"`);
    }
    if (file.id === options.designId) continue;
    const store = createDocumentStore(file, { resolveKind: options.resolveKind });
    options.assetStores.set(file.id, store);
    options.order.push(file.id);
  }
  if (!options.order.length) {
    throw new DocumentError('schema', 'The editor needs at least one document');
  }
}

export function applyOpenAssetChange(options: {
  id: string;
  focus?: 'root';
  keepDrillStack: boolean;
  resetDrillStack: () => void;
  assetStores: ReadonlyMap<string, YjsDocumentStore>;
  onMissing: () => void;
  onOpened: (change: {
    openId: string;
    workspace: DefaultKind;
    tool: 'select';
    drag: null;
    selectedNodeId: string | null;
    selectedRenderId: string | null;
    clearViewport: boolean;
  }) => void;
}): void {
  if (!options.keepDrillStack) options.resetDrillStack();
  const store = options.assetStores.get(options.id);
  if (!store) {
    options.onMissing();
    return;
  }
  const doc = store.getDocument();
  const kind = kindOf(doc);
  if (options.focus === 'root') {
    options.onOpened({
      openId: options.id,
      workspace: kind,
      tool: 'select',
      drag: null,
      selectedNodeId: doc.rootId,
      selectedRenderId: renderIdForNode(doc, doc.rootId, doc.kind !== 'page'),
      clearViewport: false,
    });
    return;
  }
  options.onOpened({
    openId: options.id,
    workspace: kind,
    tool: 'select',
    drag: null,
    selectedNodeId: null,
    selectedRenderId: null,
    clearViewport: true,
  });
}

export function bindLoadDocument(
  options: Omit<Parameters<typeof loadEditorDocument>[0], 'file' | 'handle'>,
): (file: DocumentFile, handle?: JsonFileHandle) => void {
  return (file, handle) => loadEditorDocument({ ...options, file, handle });
}

export function loadEditorDocument(options: {
  file: DocumentFile;
  handle?: JsonFileHandle;
  designId: string;
  getDesignStore: () => YjsDocumentStore;
  setDesignStore: (store: YjsDocumentStore) => void;
  order: string[];
  assetStores: Map<string, YjsDocumentStore>;
  handles: Map<string, JsonFileHandle>;
  savedJson: SavedJsonBaselines;
  resolveKind: (componentId: string) => string | undefined;
  forget: (store: YjsDocumentStore | undefined) => void;
  watch: (store: YjsDocumentStore, source: 'asset' | 'design') => void;
  syncKinds: () => void;
  resetDrillStack: () => void;
  onDesignLoaded: () => void;
  onAssetLoaded: (kind: DefaultKind, file: DocumentFile) => void;
  onError: (message: string) => void;
  onNoticeClear: () => void;
  publish: () => void;
}): void {
  try {
    if (options.file.id === options.designId) {
      const created = createDocumentStore(options.file, { resolveKind: options.resolveKind });
      const previous = options.getDesignStore();
      options.setDesignStore(created);
      options.forget(previous);
      previous.destroy();
      options.watch(created, 'design');
      if (options.handle) options.handles.set(options.file.id, options.handle);
      markDocumentSaved(options.savedJson, options.file.id, created.getDocument());
      options.onDesignLoaded();
      options.onNoticeClear();
      options.publish();
      return;
    }
    options.resetDrillStack();
    const nextFiles = options.order.map((id) => {
      if (id === options.file.id) return options.file;
      const store = options.assetStores.get(id);
      if (!store) throw new DocumentError('missing-node', `Missing document "${id}"`);
      return toNested(store.getDocument());
    });
    if (!options.assetStores.has(options.file.id)) nextFiles.push(options.file);
    validateCatalog(nextFiles);
    const created = createDocumentStore(options.file, { resolveKind: options.resolveKind });
    const previous = options.assetStores.get(options.file.id);
    options.assetStores.set(options.file.id, created);
    if (!options.order.includes(options.file.id)) options.order.push(options.file.id);
    options.syncKinds();
    options.forget(previous);
    previous?.destroy();
    options.watch(created, 'asset');
    if (options.handle) options.handles.set(options.file.id, options.handle);
    if (options.handle || previous) {
      markDocumentSaved(options.savedJson, options.file.id, created.getDocument());
    } else {
      clearDocumentSaved(options.savedJson, options.file.id);
    }
    options.onAssetLoaded(kindOf(created.getDocument()), options.file);
    options.onNoticeClear();
    options.publish();
  } catch (error) {
    options.onError(errorText(error));
    options.publish();
  }
}
