import type { Command } from '../controller/document/commands/index.js';
import type { FlatDocument, FlatNode } from '../document/flat.js';

export interface DocumentChange {
  /** On remove, the document is absent and history is cleared; reads fail until it is loaded again. */
  reason: 'command' | 'undo' | 'redo' | 'remote' | 'remove';
  command?: Command;
}

/** Rendering and history access over a document owned by its project. */
export interface DocumentStore {
  getDocument(): FlatDocument;
  getNode(id: string): FlatNode | undefined;
  execute(command: Command): void;
  subscribe(listener: (change: DocumentChange) => void): () => void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
