import {
  applyCommand,
  canonicalizeFlat,
  DocumentError,
  toFlat,
  type Command,
  type CommandContext,
  type DocumentChange,
  type DocumentFile,
  type DocumentStore,
  type FlatDocument,
  type FlatNode,
} from '@facadeur/core';
import { loadTokens } from '@facadeur/tokens';
import * as Y from 'yjs';
import { ensureDocumentMaps, patchDocument, readDocument } from './codec.js';

/** Transaction origin for commands. Loading a document uses a different origin and is not undoable. */
export const COMMAND_ORIGIN = 'facadeur';

export interface YjsDocumentStore extends DocumentStore {
  /** Exposed for a future sync provider. UI code should use the DocumentStore methods. */
  readonly doc: Y.Doc;
  destroy(): void;
}

export function createDocumentStore(
  initial: DocumentFile | FlatDocument,
  options: CommandContext = {},
): YjsDocumentStore {
  const doc = new Y.Doc();
  const flat = isFlat(initial) ? canonicalizeFlat(initial) : toFlat(initial);
  assertDesignResolvable(flat);
  doc.transact(() => {
    ensureDocumentMaps(doc);
    patchDocument(doc, flat);
  }, 'load');

  const undoManager = new Y.UndoManager(
    [
      doc.getMap('meta'),
      doc.getMap('settings'),
      doc.getArray('fields'),
      doc.getArray('variants'),
      doc.getMap('nodes'),
      doc.getMap('tokens'),
      doc.getMap('fonts'),
      doc.getMap('styles'),
      doc.getMap('tokenInterface'),
    ],
    {
      trackedOrigins: new Set([COMMAND_ORIGIN]),
      // Each command is its own undo step. The default 500ms window would merge rapid edits.
      captureTimeout: 0,
    },
  );

  const listeners = new Set<(change: DocumentChange) => void>();
  const emit = (change: DocumentChange) => {
    for (const listener of [...listeners]) listener(change);
  };

  return {
    doc,
    getDocument() {
      return canonicalizeFlat(readDocument(doc));
    },
    getNode(id: string): FlatNode | undefined {
      return canonicalizeFlat(readDocument(doc)).nodes[id];
    },
    execute(command: Command) {
      const next = applyCommand(this.getDocument(), command, options);
      assertDesignResolvable(next);
      doc.transact(() => {
        patchDocument(doc, next);
      }, COMMAND_ORIGIN);
      const actual = this.getDocument();
      if (JSON.stringify(actual) !== JSON.stringify(next)) {
        throw new DocumentError(
          'diverged',
          'The Yjs document does not match the result of the command',
        );
      }
      emit({ reason: 'command', command });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    undo() {
      if (!undoManager.canUndo()) return;
      undoManager.undo();
      emit({ reason: 'undo' });
    },
    redo() {
      if (!undoManager.canRedo()) return;
      undoManager.redo();
      emit({ reason: 'redo' });
    },
    canUndo: () => undoManager.canUndo(),
    canRedo: () => undoManager.canRedo(),
    destroy() {
      undoManager.destroy();
      doc.destroy();
    },
  };
}

function isFlat(value: DocumentFile | FlatDocument): value is FlatDocument {
  return 'rootId' in value && 'nodes' in value;
}

/** References, cycles, and breakpoint names. Structural checks already ran in applyCommand. */
function assertDesignResolvable(doc: FlatDocument): void {
  loadTokens({
    tokens: doc.tokens,
    fonts: doc.fonts,
    breakpoints: doc.settings.breakpoints,
  });
}
