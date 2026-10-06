import {
  toFlat,
  toNested,
  validateCatalog,
  validateDocumentFile,
  type FlatDocument,
} from '@facadeur/core';
import { createEditorSession } from '../session.js';
import { reconcileLegacySchemaSnapshot } from '../schema/migrate-legacy-schema-library.js';
import type { ProjectSnapshot } from '@facadeur/api';
import { api } from '../api.js';
export type { ProjectSnapshot } from '@facadeur/api';

export async function loadProject(
  signal?: AbortSignal,
  projectId = 'default',
): Promise<ProjectSnapshot> {
  const project = await api.projects.load(projectId, { signal });
  if (!project || project.id !== projectId || !project.sources || !project.hashes)
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
  const recovered = new Set(project.unsavedDocumentIds ?? []);
  const saveSnapshot = (id: string, document: FlatDocument) => {
    if (project.access?.canWrite === false)
      return Promise.reject(new Error('Your role allows viewing this project only.'));
    const operation = pending.then(async () => {
      const saved = await api.projects.save(project.id, id, {
        document: toNested(document),
        source: sources[id] ?? id + '.json',
        expectedHash: hashes[id] ?? null,
      });
      sources[id] = saved.source;
      hashes[id] = saved.hash;
      const persisted = toFlat(validateDocumentFile(saved.document));
      baselines.set(id, JSON.stringify(persisted));
      recovered.delete(id);
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
    project,
    hasPendingChanges() {
      if (project.access?.canWrite === false) return false;
      return session.project.documents.some(
        (document) =>
          recovered.has(document.id) ||
          baselines.get(document.id) !== JSON.stringify(document.manifest),
      );
    },
    async saveAllChanges() {
      for (const document of session.project.documents) {
        const snapshot = document.manifest;
        if (!recovered.has(document.id) && baselines.get(document.id) === JSON.stringify(snapshot))
          continue;
        const saved = await saveSnapshot(document.id, snapshot);
        session.markDocumentSaved(document.id, saved);
      }
    },
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
