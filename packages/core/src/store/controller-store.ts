import type { ProjectController } from '../controller/project/controller.js';
import type { FlatDocument } from '../document/flat.js';
import type { DocumentChange, DocumentStore } from './types.js';
import { notifyListeners } from '../controller/project/notifications.js';

export interface ControllerDocumentStore extends DocumentStore {
  destroy(): void;
}

/** A project view with history snapshots; live document state remains in ProjectController. */
export function createControllerStore(
  project: ProjectController,
  id: string,
): ControllerDocumentStore {
  project.document(id);
  const undo: FlatDocument[] = [];
  const redo: FlatDocument[] = [];
  const listeners = new Set<(change: DocumentChange) => void>();
  const unsubscribe = project.subscribe((change) => {
    if (change.documentId !== id) return;
    if (change.reason === 'command' && change.previousDocument) {
      undo.push(change.previousDocument);
      redo.length = 0;
    } else if (change.reason === 'load' || change.reason === 'remove') {
      undo.length = 0;
      redo.length = 0;
    }
    notifyListeners(listeners, {
      reason: change.reason === 'load' ? 'remote' : change.reason,
      command: change.command,
    });
  });
  const getDocument = () => project.document(id).manifest;
  return {
    getDocument,
    getNode: (nodeId) => getDocument().nodes[nodeId],
    execute: (command) => {
      project.updateDocument(id, command);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    canUndo: () => undo.length > 0,
    canRedo: () => redo.length > 0,
    undo() {
      const previous = undo.pop();
      if (!previous) return;
      redo.push(getDocument());
      project.replaceDocument(previous, 'undo');
    },
    redo() {
      const next = redo.pop();
      if (!next) return;
      undo.push(getDocument());
      project.replaceDocument(next, 'redo');
    },
    destroy() {
      unsubscribe();
      listeners.clear();
      undo.length = 0;
      redo.length = 0;
    },
  };
}
