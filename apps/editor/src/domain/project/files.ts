import { createHash, randomUUID } from 'node:crypto';
import { lstat, readFile, readdir, rename, unlink, open } from 'node:fs/promises';
import path from 'node:path';
import {
  ID_PATTERN,
  validateCatalog,
  validateDocumentFile,
  type DocumentFile,
} from '@facadeur/core';
import { reconcileLegacySchemaSnapshot } from '../schema/migrate-legacy-schema-library.js';
import type { SchemaLibraryState } from '../schema/schema-library.js';
import type { ProjectSnapshot } from './types.js';
import { validateProjectDesign } from './design-validation.js';

export class ProjectFileError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const directory = () =>
  path.resolve(process.env.FACADEUR_PROJECT_DIR ?? path.join(process.cwd(), '../../examples'));
const hash = (content: string) => createHash('sha256').update(content).digest('hex');
const recoveryPath = () => path.join(directory(), '..', '.facadeur', 'editor-recovery.json');

interface RecoveredProject {
  documents: DocumentFile[];
  sources: Record<string, string>;
  sourceHashes: Record<string, string | null>;
}

async function readRecovery(): Promise<RecoveredProject | null> {
  try {
    return JSON.parse(await readFile(recoveryPath(), 'utf8')) as RecoveredProject;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function atomicWrite(filename: string, content: string) {
  const temporary = path.join(path.dirname(filename), '.' + randomUUID() + '.tmp');
  try {
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(content, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, filename);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

function sourcePath(source: string) {
  if (
    typeof source !== 'string' ||
    source !== path.basename(source) ||
    !/^[a-zA-Z0-9_-]+\.json$/.test(source) ||
    source === 'schemas.json'
  ) {
    throw new ProjectFileError(400, 'Invalid project source');
  }
  return path.join(directory(), source);
}

async function readSource(source: string) {
  const filename = sourcePath(source);
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new ProjectFileError(409, 'Source must be a regular file');
  return readFile(filename, 'utf8');
}

/** Read only exported JSON; no CRDT history or second runtime owns the project. */
export async function readProjectFiles(): Promise<ProjectSnapshot> {
  const filenames = (await readdir(directory()))
    .filter((name) => name.endsWith('.json') && name !== 'schemas.json')
    .sort();
  const files: Array<{ source: string; hash: string | null; document: DocumentFile }> =
    await Promise.all(
      filenames.map(async (source) => {
        const text = await readSource(source);
        return { source, hash: hash(text), document: validateDocumentFile(JSON.parse(text)) };
      }),
    );
  const recovery = await readRecovery();
  const unsavedDocumentIds: string[] = [];
  for (const recovered of recovery?.documents ?? []) {
    const document = validateDocumentFile(recovered);
    const source = recovery!.sources[document.id]!;
    sourcePath(source);
    const current = files.find((entry) => entry.document.id === document.id);
    if ((current?.hash ?? null) !== recovery!.sourceHashes[document.id]) {
      throw new ProjectFileError(409, 'Recovered draft conflicts with changed source: ' + source);
    }
    if (current) current.document = document;
    else files.push({ document, source, hash: null });
    unsavedDocumentIds.push(document.id);
  }
  const designEntry = files.find((entry) => entry.source === 'project-template.json');
  if (!designEntry) throw new ProjectFileError(400, 'Missing project-template.json');
  const documents = files.filter((entry) => entry !== designEntry).map((entry) => entry.document);
  let library: SchemaLibraryState = { schemas: [], assignments: {} };
  try {
    library = JSON.parse(
      await readFile(path.join(directory(), 'schemas.json'), 'utf8'),
    ) as SchemaLibraryState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const reconciled = reconcileLegacySchemaSnapshot(designEntry.document, documents, library);
  const design = validateDocumentFile(reconciled.design);
  files.forEach((entry) => validateProjectDesign(entry.document));
  return {
    id: 'default',
    design,
    documents: validateCatalog(reconciled.documents, { schemaCatalog: design.schemaCatalog }),
    sources: Object.fromEntries(files.map((entry) => [entry.document.id, entry.source])),
    hashes: Object.fromEntries(files.map((entry) => [entry.document.id, entry.hash])),
    unsavedDocumentIds,
  };
}

let pendingSave: Promise<unknown> = Promise.resolve();

/** Serialize saves, reject changed sources, and atomically replace only the requested JSON file. */
export function saveProjectFile(
  id: string,
  body: { document: unknown; source: string; expectedHash: string | null },
) {
  const operation = pendingSave.then(async () => {
    if (!ID_PATTERN.test(id)) throw new ProjectFileError(400, 'Invalid document id');
    const document = validateDocumentFile(body.document);
    validateProjectDesign(document);
    if (document.id !== id)
      throw new ProjectFileError(400, 'Document id does not match the save target');
    if (typeof body.expectedHash !== 'string' && body.expectedHash !== null)
      throw new ProjectFileError(400, 'Missing source hash');
    const project = await readProjectFiles();
    const source = project.sources[id] ?? body.source;
    const filename = sourcePath(source);
    if (project.sources[id] && source !== body.source)
      throw new ProjectFileError(409, 'Source mapping changed');
    let current: string | null = null;
    try {
      current = await readSource(source);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if ((current === null ? null : hash(current)) !== body.expectedHash)
      throw new ProjectFileError(409, 'The source changed. Reload before saving.');
    const design = id === project.design.id ? document : project.design;
    const documents = project.documents.filter((item) => item.id !== id);
    if (id !== design.id) documents.push(document);
    validateCatalog(documents, { schemaCatalog: design.schemaCatalog });
    const content = JSON.stringify(document, null, 2) + '\n';
    await atomicWrite(filename, content);
    const recovery = await readRecovery();
    if (recovery?.documents.some((item) => item.id === id)) {
      recovery.documents = recovery.documents.filter((item) => item.id !== id);
      delete recovery.sources[id];
      delete recovery.sourceHashes[id];
      await atomicWrite(recoveryPath(), JSON.stringify(recovery, null, 2) + '\n');
    }
    return { document, source, hash: hash(content) };
  });
  pendingSave = operation.catch(() => {});
  return operation;
}

export function projectFileError(error: unknown) {
  return Response.json(
    { error: error instanceof Error ? error.message : String(error) },
    {
      status: error instanceof ProjectFileError ? error.status : 400,
    },
  );
}
