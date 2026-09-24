import type { Command } from './commands.js';
import type { FlatDocument, FlatNode } from './flat.js';

export interface DocumentChange {
  reason: 'command' | 'undo' | 'redo';
  /** Present when `reason` is `command`. Undo and redo restore the inverse. */
  command?: Command;
}

/**
 * The only way UI code changes a document: read, run a command, subscribe.
 * Undo and redo are part of the interface so callers never touch a CRDT directly.
 */
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
