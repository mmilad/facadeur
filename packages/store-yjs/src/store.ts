import {
  applyCommand,
  canonicalizeFlat,
  canonicalizeJson,
  DocumentError,
  toFlat,
  toNested,
  validateDefinitions,
  validateDocumentFile,
  validateLibraries,
  validateTree,
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

/** Server/API edits and incoming sync updates. Excluded from local Undo history. */
export const REMOTE_ORIGIN = 'facadeur-remote';

export interface YjsDocumentStore extends DocumentStore {
  /** Exposed for a future sync provider. UI code should use the DocumentStore methods. */
  readonly doc: Y.Doc;
  /** Validate and merge a Yjs update, notifying once if it changes shared state. */
  applyRemoteUpdate(update: Uint8Array): void;
  /** Apply a validated API command without adding it to local Undo history. */
  executeRemote(command: Command): void;
  destroy(): void;
}

/** Read a complete persisted Yjs document before its store is created. */
export function readDocumentFromUpdate(update: Uint8Array): FlatDocument {
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, update, REMOTE_ORIGIN);
    if (doc.store.pendingStructs || doc.store.pendingDs) {
      throw new DocumentError('schema', 'Yjs update is missing dependencies');
    }
    const document = canonicalizeFlat(readDocument(doc));
    if (!document.id) throw new DocumentError('schema', 'Yjs update has no document id');
    validateDocumentFile(toNested(document));
    return document;
  } finally {
    doc.destroy();
  }
}

/**
 * Create a local command store, or hydrate a shared history from `hydration.update`.
 * A supplied update must contain a valid document with the same id as `initial`;
 * its content is authoritative and initial is never seeded into that history.
 */
export function createDocumentStore(
  initial: DocumentFile | FlatDocument,
  options: CommandContext = {},
  hydration: { update?: Uint8Array } = {},
): YjsDocumentStore {
  const doc = new Y.Doc();
  const flat = isFlat(initial) ? canonicalizeFlat(initial) : toFlat(initial);
  try {
    if (hydration.update !== undefined) {
      // Import the server's history as-is; independently seeding initial would
      // create competing maps/arrays with unrelated Yjs identities.
      Y.applyUpdate(doc, hydration.update, REMOTE_ORIGIN);
      assertHydratedDocument(doc, flat.id, options);
    } else {
      assertDesignResolvable(flat);
      doc.transact(() => {
        ensureDocumentMaps(doc);
        patchDocument(doc, flat);
      }, 'load');
    }
  } catch (error) {
    doc.destroy();
    throw error;
  }

  const undoManager = new Y.UndoManager(
    [
      doc.getMap('meta'),
      doc.getMap('settings'),
      doc.getArray('fields'),
      doc.getArray('events'),
      doc.getMap('expose'),
      doc.getMap('previewData'),
      doc.getMap('variantLabels'),
      doc.getArray('variants'),
      doc.getArray('variantPresets'),
      doc.getMap('nodes'),
      doc.getMap('tokens'),
      doc.getMap('fonts'),
      doc.getMap('styles'),
      doc.getMap('tokenInterface'),
      doc.getMap('componentTokens'),
      doc.getMap('schemaCatalog'),
      doc.getMap('schemaUse'),
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
  const onTransaction = (transaction: Y.Transaction) => {
    if (
      transaction.changedParentTypes.size === 0 ||
      transaction.origin === COMMAND_ORIGIN ||
      transaction.origin === undoManager
    )
      return;
    emit({ reason: 'remote' });
  };
  doc.on('afterTransaction', onTransaction);

  function executeCommand(command: Command, origin: string): void {
    const next = applyCommand(canonicalizeFlat(readDocument(doc)), command, options);
    assertDesignResolvable(next);
    doc.transact(() => patchDocument(doc, next), origin);
    const actual = canonicalizeJson(
      JSON.parse(JSON.stringify(canonicalizeFlat(readDocument(doc)))),
    );
    const expected = canonicalizeJson(JSON.parse(JSON.stringify(next)));
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new DocumentError(
        'diverged',
        'The Yjs document does not match the result of the command',
      );
    }
  }

  return {
    doc,
    getDocument() {
      return canonicalizeFlat(readDocument(doc));
    },
    getNode(id: string): FlatNode | undefined {
      return canonicalizeFlat(readDocument(doc)).nodes[id];
    },
    execute(command: Command) {
      executeCommand(command, COMMAND_ORIGIN);
      emit({ reason: 'command', command });
    },
    executeRemote(command) {
      executeCommand(command, REMOTE_ORIGIN);
    },
    applyRemoteUpdate(update) {
      const candidate = new Y.Doc();
      try {
        Y.applyUpdate(candidate, Y.encodeStateAsUpdate(doc));
        Y.applyUpdate(candidate, update, REMOTE_ORIGIN);
        assertHydratedDocument(candidate, flat.id, options);
      } finally {
        candidate.destroy();
      }
      Y.applyUpdate(doc, update, REMOTE_ORIGIN);
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
      doc.off('afterTransaction', onTransaction);
      listeners.clear();
      undoManager.destroy();
      doc.destroy();
    },
  };
}

function assertHydratedDocument(doc: Y.Doc, expectedId: string, options: CommandContext): void {
  const hydrated = readDocument(doc);
  if (hydrated.id !== expectedId) {
    throw new DocumentError(
      'schema',
      `Hydrated document id "${hydrated.id}" does not match "${expectedId}"`,
    );
  }
  validateTree(hydrated, options);
  validateDefinitions(hydrated, options.schemaResolverContext);
  validateLibraries(hydrated, options);
  validateDocumentFile(toNested(hydrated));
  assertDesignResolvable(hydrated);
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
