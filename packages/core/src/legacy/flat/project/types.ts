import type { FlatDocument } from '../../../document/flat';
import type { Command, CommandContext } from '../document/commands/index';

/** Executes a document command and returns the resulting canonicalizable document. */
export type DocumentCommandExecutor = (
  document: FlatDocument,
  command: Command,
  context: CommandContext,
) => FlatDocument;

export interface ProjectControllerOptions {
  designDocumentId: string;
  documents: readonly FlatDocument[];
  /** Allows an external store (for example Yjs) to own command application. */
  executeCommand?: DocumentCommandExecutor;
}

/** Published after commit. Each subscriber receives its own payload copy; remove means absent. */
export interface ProjectChange {
  reason: 'command' | 'undo' | 'redo' | 'load' | 'remove';
  documentId: string;
  command?: Command;
  previousDocument?: FlatDocument;
}
