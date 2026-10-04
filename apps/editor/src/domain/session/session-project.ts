import {
  ProjectController,
  applyCommand,
  createControllerStore,
  toFlat,
  toNested,
  validateCatalog,
  type Command,
  type DocumentFile,
} from '@facadeur/core';
import { migratePreviewData } from '../preview-data.js';
import { validateProjectDesign } from '../project/design-validation.js';
import type { EditorSessionOptions } from './types.js';

/** The controller owns live data; renderer stores are views over that same state. */
export function createSessionProject(options: Pick<EditorSessionOptions, 'design' | 'documents'>) {
  const design = migratePreviewData(options.design);
  const documents = validateCatalog(
    options.documents.filter((file) => file.id !== design.id).map(migratePreviewData),
    { schemaCatalog: design.schemaCatalog },
  );
  const manifests = [design, ...documents].map(toFlat);
  manifests.forEach(validateProjectDesign);
  const project = new ProjectController({
    designDocumentId: design.id,
    documents: manifests,
    executeCommand(document, command, context) {
      const next = applyCommand(document, command, context);
      validateProjectDesign(next);
      return next;
    },
  });
  return {
    project,
    store: (id: string) => createControllerStore(project, id),
    loadDocument(file: DocumentFile) {
      const document = migratePreviewData(file);
      validateProjectDesign(document);
      const next = project.documents
        .filter((item) => item.id !== document.id)
        .map((item) => toNested(item.manifest));
      next.push(document);
      const nextDesign = next.find((item) => item.id === design.id)!;
      validateCatalog(
        next.filter((item) => item.id !== design.id),
        { schemaCatalog: nextDesign.schemaCatalog },
      );
      project.replaceDocument(toFlat(document));
      return createControllerStore(project, document.id);
    },
  };
}

/** Explicit global/document routing makes the controller API the session's mutation surface. */
export function executeProjectCommand(project: ProjectController, id: string, command: Command) {
  const document = () => project.styles.document(id);
  switch (command.type) {
    case 'setStyleBlock':
      return document().setStyleBlock(command.style);
    case 'setVariantStyleBlock':
      return document().setVariantStyleBlock(command.name, command.style);
    case 'setStyle':
      return document().setNodeStyle(command.nodeId, command.property, command.value);
    case 'setComponentToken':
      return document().setComponentToken(command.id, command.path, command.token);
    case 'removeComponentToken':
      return document().removeComponentToken(command.id);
    case 'renameComponentTokenPath':
      return document().renameComponentTokenPath(command.id, command.path);
    case 'setTokenInterface':
      return document().setTokenInterface(command.tokenInterface);
    default:
      break;
  }
  if (id === project.designDocumentId) {
    switch (command.type) {
      case 'setToken':
        return project.styles.setGlobalToken(command.path, command.token);
      case 'removeToken':
        return project.styles.removeGlobalToken(command.path);
      case 'setTokenGroup':
        return project.styles.setGlobalTokenGroup(command.path, command.group);
      case 'removeTokenGroup':
        return project.styles.removeGlobalTokenGroup(command.path);
      case 'setFont':
        return project.styles.setFont(command.font);
      case 'removeFont':
        return project.styles.removeFont(command.id);
      case 'setBreakpoints':
        return project.styles.setBreakpoints(command.breakpoints);
      case 'setSchemaCatalog':
        return project.updateSchemas(command.schemaCatalog);
      default:
        break;
    }
  }
  return project.updateDocument(id, command);
}
