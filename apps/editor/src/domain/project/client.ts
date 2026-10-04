import {
  toFlat,
  toNested,
  validateCatalog,
  validateDocumentFile,
  type DocumentFile,
  type FlatDocument,
} from '@facadeur/core';
import { createEditorSession } from '../session.js';
import { reconcileLegacySchemaSnapshot } from '../schema/migrate-legacy-schema-library.js';
import type { ProjectSnapshot } from './types.js';
export type { ProjectSnapshot } from './types.js';

export async function loadProject(signal?: AbortSignal): Promise<ProjectSnapshot> {
  const project = await request<ProjectSnapshot>('/api/projects/default', { signal });
  if (!project || project.id !== 'default' || !project.sources || !project.hashes)
    throw new Error('Invalid project catalog');
  const reconciled = reconcileLegacySchemaSnapshot(
    validateDocumentFile(project.design),
    project.documents,
  );
  project.design = reconciled.design;
  project.documents = validateCatalog(reconciled.documents, {
    schemaCatalog: project.design.schemaCatalog,
  });
  return project;
}

/** Local JSON persistence; commands and live data belong exclusively to the controller. */
export function connectProject(project: ProjectSnapshot) {
  const sources = { ...project.sources };
  const hashes = { ...project.hashes };
  let pending: Promise<unknown> = Promise.resolve();
  const baselines = new Map<string, string>();
  const saveSnapshot = (id: string, document: FlatDocument) => {
    const operation = pending.then(async () => {
      const saved = await request<{ document: DocumentFile; source: string; hash: string }>(
        '/api/projects/default/documents/' + encodeURIComponent(id) + '/save',
        {
          method: 'POST',
          body: JSON.stringify({
            document: toNested(document),
            source: sources[id] ?? id + '.json',
            expectedHash: hashes[id] ?? null,
          }),
        },
      );
      sources[id] = saved.source;
      hashes[id] = saved.hash;
      const persisted = toFlat(validateDocumentFile(saved.document));
      baselines.set(id, JSON.stringify(persisted));
      return persisted;
    });
    pending = operation.catch(() => {});
    return operation;
  };
  const session = createEditorSession({
    documents: project.documents,
    design: project.design,
    sources,
    unsavedDocumentIds: project.unsavedDocumentIds,
    saveDocument: saveSnapshot,
  });
  for (const document of session.project.documents)
    baselines.set(document.id, JSON.stringify(document.manifest));
  return {
    session,
    async persistPendingChanges() {
      for (const document of session.project.documents) {
        const snapshot = document.manifest;
        if (baselines.get(document.id) === JSON.stringify(snapshot)) continue;
        const saved = await saveSnapshot(document.id, snapshot);
        session.markDocumentSaved(document.id, saved);
      }
    },
    destroy: () => session.destroy(),
  };
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? 'Project request failed (' + response.status + ')');
  return result as T;
}
