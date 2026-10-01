import { toNested, validateCatalog, type CommandContext } from '@facadeur/core';
import { createDocumentStore, type YjsDocumentStore } from '@facadeur/store-yjs';
import {
  clearDocumentSaved,
  markDocumentSaved,
  type SavedJsonBaselines,
} from '../assets/save-state.js';
import type { EditorSession } from './types.js';

/** Private additive registration; existing stores belong to the transport's merge path. */
export function bindAcceptProjectDocuments(deps: {
  assetStores: Map<string, YjsDocumentStore>;
  getDesignStore: () => YjsDocumentStore;
  kinds: Map<string, string>;
  commandContext: CommandContext;
  order: string[];
  sources: Record<string, string>;
  savedJson: SavedJsonBaselines;
  watch: (store: YjsDocumentStore, source: 'asset' | 'design') => void;
  publishCatalog: () => void;
}): EditorSession['acceptProjectDocuments'] {
  return (entries) => {
    const existing = [deps.getDesignStore(), ...deps.assetStores.values()];
    const existingIds = new Set(existing.map((store) => store.getDocument().id));
    const additions = entries.filter((entry) => !existingIds.has(entry.document.id));
    if (!additions.length) return;
    const current = existing.map((store) => toNested(store.getDocument()));
    validateCatalog([...current, ...additions.map((entry) => entry.document)]);

    // Every target must resolve before hydrating the first forward reference.
    const previousKinds = new Map(deps.kinds);
    for (const entry of additions) deps.kinds.set(entry.document.id, entry.document.kind);
    const prepared: Array<{ entry: (typeof additions)[number]; store: YjsDocumentStore }> = [];
    try {
      for (const entry of additions) {
        const store = createDocumentStore(entry.document, deps.commandContext, {
          update: entry.update,
        });
        prepared.push({ entry, store });
      }
      // The Yjs history is authoritative; validate its actual catalog as well.
      validateCatalog([...current, ...prepared.map(({ store }) => toNested(store.getDocument()))]);
    } catch (error) {
      for (const { store } of prepared) store.destroy();
      deps.kinds.clear();
      for (const [id, kind] of previousKinds) deps.kinds.set(id, kind);
      throw error;
    }
    for (const { entry, store } of prepared) {
      const document = store.getDocument();
      deps.assetStores.set(document.id, store);
      deps.kinds.set(document.id, document.kind);
      deps.order.push(document.id);
      deps.sources[document.id] = entry.source;
      deps.watch(store, 'asset');
      if (entry.saved) markDocumentSaved(deps.savedJson, document.id, document);
      else clearDocumentSaved(deps.savedJson, document.id);
    }
    deps.publishCatalog();
  };
}
