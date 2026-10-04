import {
  ProjectController,
  createControllerStore,
  toFlat,
  type DocumentFile,
} from '@facadeur/core';

/** Test renderer contracts against the same controller-backed view as the editor. */
export function createTestDocumentStore(document: DocumentFile) {
  const project = new ProjectController({
    designDocumentId: document.id,
    documents: [toFlat(document)],
  });
  return createControllerStore(project, document.id);
}
