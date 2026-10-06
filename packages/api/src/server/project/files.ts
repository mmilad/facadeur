import { DomainError } from '../../errors.js';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, unlink, open } from 'node:fs/promises';
import path from 'node:path';
import {
  ID_PATTERN,
  DocumentError,
  validateCatalog,
  validateDocumentFile,
  type DocumentFile,
} from '@facadeur/core';
import { starterCatalog } from './starter-catalog.js';
import type { ProjectStorage } from '../../contracts/management.js';
import { reconcileLegacySchemaSnapshot } from '../../schema/reconcile.js';
import type { SchemaLibraryState } from '../../schema/types.js';
import type { ProjectSnapshot } from '../../contracts/project.js';
import { validateProjectDesign } from '../../schema/design-validation.js';

const defaultDirectory = () =>
  path.resolve(process.env.FACADEUR_PROJECT_DIR ?? path.join(process.cwd(), '../../examples'));

/** The compatibility project keeps the historical examples and recovery locations. */
export function legacyProjectStorage(): ProjectStorage {
  const directory = defaultDirectory();
  return {
    id: 'default',
    directory,
    recoveryPath: path.join(directory, '..', '.facadeur', 'editor-recovery.json'),
  };
}

const storageDirectory = (storage?: ProjectStorage) =>
  path.resolve(storage?.directory ?? legacyProjectStorage().directory);
const storageId = (storage?: ProjectStorage) => storage?.id ?? 'default';
const recoveryFilename = (storage?: ProjectStorage) =>
  storage?.recoveryPath
    ? path.resolve(storage.recoveryPath)
    : storage
      ? path.join(storageDirectory(storage), '.facadeur', 'editor-recovery.json')
      : legacyProjectStorage().recoveryPath!;
const hash = (content: string) => createHash('sha256').update(content).digest('hex');

interface RecoveredProject {
  documents: DocumentFile[];
  sources: Record<string, string>;
  sourceHashes: Record<string, string | null>;
}

async function assertTrustedPath(filename: string, allowMissing = false) {
  const resolved = path.resolve(filename);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  for (const segment of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    let stat;
    try {
      stat = await lstat(cursor);
    } catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    if (stat.isSymbolicLink())
      throw new DomainError('conflict', 'Project storage cannot contain symbolic links');
  }
  return resolved;
}

async function assertStorageDirectory(storage?: ProjectStorage, create = false) {
  const directory = storageDirectory(storage);
  if (create) await mkdir(directory, { recursive: true });
  await assertTrustedPath(directory);
  const actual = await realpath(directory);
  if (actual !== directory) throw new DomainError('conflict', 'Project directory is not trusted');
  const stat = await lstat(directory);
  if (!stat.isDirectory())
    throw new DomainError('conflict', 'Project directory must be a regular directory');
  return directory;
}

async function readRecovery(storage?: ProjectStorage): Promise<RecoveredProject | null> {
  const filename = recoveryFilename(storage);
  try {
    await assertTrustedPath(path.dirname(filename));
    const stat = await lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new DomainError('conflict', 'Recovery data must be a regular file');
    return JSON.parse(await readFile(filename, 'utf8')) as RecoveredProject;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function atomicWrite(filename: string, content: string) {
  const parent = path.dirname(filename);
  await assertTrustedPath(parent, true);
  await mkdir(parent, { recursive: true });
  await assertTrustedPath(parent);
  const temporary = path.join(parent, '.' + randomUUID() + '.tmp');
  try {
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(content, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await assertTrustedPath(filename, true);
    await rename(temporary, filename);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

function sourcePath(source: string, storage?: ProjectStorage) {
  if (
    typeof source !== 'string' ||
    source !== path.basename(source) ||
    !/^[a-zA-Z0-9_-]+\.json$/.test(source) ||
    source === 'schemas.json'
  ) {
    throw new DomainError('invalid-input', 'Invalid project source');
  }
  return path.join(storageDirectory(storage), source);
}

async function readSource(source: string, storage?: ProjectStorage) {
  const filename = sourcePath(source, storage);
  await assertTrustedPath(filename);
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new DomainError('conflict', 'Source must be a regular file');
  return readFile(filename, 'utf8');
}

/** Create an isolated project directory with editable atoms and a starter section. */
export async function initializeProjectFiles(storage: ProjectStorage) {
  if (!storage.id || !storage.directory)
    throw new DomainError('invalid-input', 'Invalid project storage');
  // Reject existing symlinked ancestors before mkdir can follow them, then verify the
  // resulting directory again in assertStorageDirectory.
  await assertTrustedPath(storageDirectory(storage), true);
  const directory = await assertStorageDirectory(storage, true);
  for (const { source, document } of starterCatalog()) {
    const filename = sourcePath(source, storage);
    try {
      await assertTrustedPath(filename);
      await lstat(filename);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await atomicWrite(filename, JSON.stringify(document, null, 2) + '\n');
    }
  }
  return { ...storage, directory };
}

/** Apply the form-atom catalog upgrade once; keep existing definitions and recovered drafts. */
async function upgradeStarterAtoms(
  storage: ProjectStorage,
  files: Array<{ source: string; hash: string | null; document: DocumentFile }>,
  unsavedIds: readonly string[],
) {
  const marker = path.join(storageDirectory(storage), '.facadeur', 'starter-version.json');
  try {
    await assertTrustedPath(marker);
    const saved = JSON.parse(await readFile(marker, 'utf8')) as { version?: number };
    if ((saved.version ?? 0) >= 3) return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  for (const { source, document } of starterCatalog()) {
    if (document.group !== 'form') continue;
    if (
      files.some(
        (entry) =>
          entry.source === source ||
          entry.document.id === document.id ||
          (entry.document.slug ?? entry.document.id) === document.id,
      )
    )
      continue;
    const content = JSON.stringify(document, null, 2) + '\n';
    await atomicWrite(sourcePath(source, storage), content);
    files.push({ source, document, hash: hash(content) });
  }
  for (const entry of files) {
    const document = entry.document;
    if (document.kind !== 'atom' || document.group || unsavedIds.includes(document.id)) continue;
    if (
      document.root.type !== 'frame' ||
      !['input', 'textarea', 'select'].includes(document.root.tag?.toLowerCase() ?? '')
    )
      continue;
    document.group = 'form';
    const content = JSON.stringify(document, null, 2) + '\n';
    await atomicWrite(sourcePath(entry.source, storage), content);
    entry.hash = hash(content);
  }
  await atomicWrite(marker, JSON.stringify({ version: 3 }) + '\n');
}

/** Read only exported JSON; no CRDT history or second runtime owns the project. */
export async function readProjectFiles(storage?: ProjectStorage): Promise<ProjectSnapshot> {
  const directory = await assertStorageDirectory(storage);
  const filenames = (await readdir(directory))
    .filter((name) => name.endsWith('.json') && name !== 'schemas.json')
    .sort();
  const files: Array<{ source: string; hash: string | null; document: DocumentFile }> =
    await Promise.all(
      filenames.map(async (source) => {
        const text = await readSource(source, storage);
        return { source, hash: hash(text), document: validateDocumentFile(JSON.parse(text)) };
      }),
    );
  const recovery = await readRecovery(storage);
  const unsavedDocumentIds: string[] = [];
  for (const recovered of recovery?.documents ?? []) {
    const document = validateDocumentFile(recovered);
    const source = recovery!.sources[document.id]!;
    sourcePath(source, storage);
    const current = files.find((entry) => entry.document.id === document.id);
    if ((current?.hash ?? null) !== recovery!.sourceHashes[document.id]) {
      throw new DomainError('conflict', 'Recovered draft conflicts with changed source: ' + source);
    }
    if (current) current.document = document;
    else files.push({ document, source, hash: null });
    unsavedDocumentIds.push(document.id);
  }
  if (storage && storage.id !== 'default')
    await upgradeStarterAtoms(storage, files, unsavedDocumentIds);
  const designEntry = files.find((entry) => entry.source === 'project-template.json');
  if (!designEntry) throw new DomainError('invalid-input', 'Missing project-template.json');
  const documents = files.filter((entry) => entry !== designEntry).map((entry) => entry.document);
  let library: SchemaLibraryState = { schemas: [], assignments: {} };
  try {
    await assertTrustedPath(path.join(directory, 'schemas.json'), true);
    library = JSON.parse(
      await readFile(path.join(directory, 'schemas.json'), 'utf8'),
    ) as SchemaLibraryState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const reconciled = reconcileLegacySchemaSnapshot(designEntry.document, documents, library);
  const design = validateDocumentFile(reconciled.design);
  files.forEach((entry) => validateProjectDesign(entry.document));
  return {
    id: storageId(storage),
    design,
    documents: validateCatalog(reconciled.documents, { schemaCatalog: design.schemaCatalog }),
    sources: Object.fromEntries(files.map((entry) => [entry.document.id, entry.source])),
    hashes: Object.fromEntries(files.map((entry) => [entry.document.id, entry.hash])),
    unsavedDocumentIds,
  };
}

const pendingSaves = new Map<string, Promise<unknown>>();

function validateSaveInput<T>(validate: () => T) {
  try {
    return validate();
  } catch (error) {
    if (error instanceof DocumentError) throw new DomainError('invalid-input', error.message);
    throw error;
  }
}

/** Serialize saves per project, reject changed sources, and atomically replace one JSON file. */
export function saveProjectFile(
  id: string,
  body: { document: unknown; source: string; expectedHash: string | null },
  storage?: ProjectStorage,
) {
  const directory = storageDirectory(storage);
  const previous = pendingSaves.get(directory) ?? Promise.resolve();
  const operation = previous.then(async () => {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new DomainError('invalid-input', 'Invalid save input');
    if (!ID_PATTERN.test(id)) throw new DomainError('invalid-input', 'Invalid document id');
    const document = validateSaveInput(() => validateDocumentFile(body.document));
    validateSaveInput(() => validateProjectDesign(document));
    if (document.id !== id)
      throw new DomainError('invalid-input', 'Document id does not match the save target');
    if (typeof body.expectedHash !== 'string' && body.expectedHash !== null)
      throw new DomainError('invalid-input', 'Missing source hash');
    const project = await readProjectFiles(storage);
    const source = project.sources[id] ?? body.source;
    const filename = sourcePath(source, storage);
    if (project.sources[id] && source !== body.source)
      throw new DomainError('conflict', 'Source mapping changed');
    let current: string | null = null;
    try {
      current = await readSource(source, storage);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if ((current === null ? null : hash(current)) !== body.expectedHash)
      throw new DomainError('conflict', 'The source changed. Reload before saving.');
    const design = id === project.design.id ? document : project.design;
    const documents = project.documents.filter((item) => item.id !== id);
    if (id !== design.id) documents.push(document);
    validateSaveInput(() => validateCatalog(documents, { schemaCatalog: design.schemaCatalog }));
    const content = JSON.stringify(document, null, 2) + '\n';
    await atomicWrite(filename, content);
    const recovery = await readRecovery(storage);
    if (recovery?.documents.some((item) => item.id === id)) {
      recovery.documents = recovery.documents.filter((item) => item.id !== id);
      delete recovery.sources[id];
      delete recovery.sourceHashes[id];
      await atomicWrite(recoveryFilename(storage), JSON.stringify(recovery, null, 2) + '\n');
    }
    return { document, source, hash: hash(content) };
  });
  const settled = operation.catch(() => {});
  pendingSaves.set(directory, settled);
  void settled.finally(() => {
    if (pendingSaves.get(directory) === settled) pendingSaves.delete(directory);
  });
  return operation;
}
