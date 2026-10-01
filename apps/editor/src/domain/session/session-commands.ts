import { toNested, type Command } from '@facadeur/core';
import type { YjsDocumentStore } from '@facadeur/store-yjs';
import { errorText } from './kinds.js';
import type { createUndoHistory } from './undo-history.js';
import { applyActiveVariantCommand, variantEditableCommand } from './session-variant-context.js';
import type { EditorSnapshot } from './types.js';

export function bindSessionCommandRunner(deps: {
  undoHistory: ReturnType<typeof createUndoHistory>;
  assetStores: Map<string, YjsDocumentStore>;
  getOpenId: () => string;
  getSnapshot: () => EditorSnapshot | null;
  resolveKind: (componentId: string) => string | undefined;
  catalogNestedDocuments: () => Map<string, ReturnType<typeof toNested>>;
  /** Stores close over one context object. Refresh design token paths before each command. */
  prepareCommandContext: () => void;
  setErrorNotice: (message: string) => void;
  publish: () => void;
}) {
  const {
    undoHistory,
    assetStores,
    getOpenId,
    getSnapshot,
    resolveKind,
    catalogNestedDocuments,
    prepareCommandContext,
    setErrorNotice,
    publish,
  } = deps;

  function run(store: YjsDocumentStore, command: Command) {
    undoHistory.noteCommand(store);
    try {
      prepareCommandContext();
      store.execute(command);
    } catch (error) {
      setErrorNotice(errorText(error));
      publish();
    }
  }

  function runWithActiveVariant(store: YjsDocumentStore, command: Command) {
    const activeStore = assetStores.get(getOpenId());
    const variantName = getSnapshot()?.activeVariantName;
    if (store !== activeStore || !variantName || !variantEditableCommand(command)) {
      run(store, command);
      return;
    }
    try {
      run(
        store,
        applyActiveVariantCommand({
          store,
          activeStore,
          variantName,
          command,
          resolveKind,
          catalogNestedDocuments,
        }),
      );
    } catch (error) {
      setErrorNotice(errorText(error));
      publish();
    }
  }

  return runWithActiveVariant;
}
