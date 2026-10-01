import {
  DocumentError,
  toNested,
  type CommandContext,
  type DefaultKind,
  type FlatDocument,
} from '@facadeur/core';
import type { YjsDocumentStore } from '@facadeur/store-yjs';
import { markDocumentSaved, type SavedJsonBaselines } from '../assets/save-state.js';
import type { JsonFileHandle } from '../assets/files.js';
import { isKind } from './kinds.js';
import type { DrillStackFrame } from '../navigation/drill-navigation.js';
import type { ViewportChromeSettings } from '../viewport/viewport-chrome.js';
import type { StyleEditMode } from '../viewport/viewport-edit.js';
import { registerSessionAssetDocuments } from './save.js';
import {
  buildDrillParentsForSnapshot,
  buildEditorSnapshot,
  readViewportChromeForOpenDocument,
} from './snapshot.js';
import type { createUndoHistory } from './undo-history.js';
import { renderIdForNode } from '../selection/selection-model.js';
import { resolveNestedSelection, type NestedSelection } from '../nested-selection.js';
import type {
  EditorDrag,
  EditorNotice,
  EditorSessionOptions,
  EditorSnapshot,
  EditorTool,
} from './types.js';

export function bindSessionDocumentStores(deps: {
  assetStores: Map<string, YjsDocumentStore>;
  unsubs: Map<YjsDocumentStore, () => void>;
  undoHistory: ReturnType<typeof createUndoHistory>;
  getOpenId: () => string;
  onStoreChange: (source: 'asset' | 'design') => void;
}) {
  const { assetStores, unsubs, undoHistory, getOpenId, onStoreChange } = deps;

  function watch(store: YjsDocumentStore, source: 'asset' | 'design') {
    unsubs.get(store)?.();
    unsubs.set(
      store,
      store.subscribe(() => onStoreChange(source)),
    );
  }

  function forget(store: YjsDocumentStore | undefined) {
    undoHistory.forget(store);
  }

  function openStore(): YjsDocumentStore {
    const openId = getOpenId();
    const store = assetStores.get(openId);
    if (!store) throw new DocumentError('missing-node', `No open document "${openId}"`);
    return store;
  }

  function openFlat(): FlatDocument {
    return openStore().getDocument();
  }

  function catalogDocuments(): ReadonlyMap<string, FlatDocument> {
    const documents = new Map<string, FlatDocument>();
    for (const store of assetStores.values()) {
      const document = store.getDocument();
      documents.set(document.id, document);
    }
    return documents;
  }

  function catalogNestedDocuments() {
    const documents = new Map<string, ReturnType<typeof toNested>>();
    for (const store of assetStores.values()) {
      const document = store.getDocument();
      documents.set(document.id, toNested(document));
    }
    return documents;
  }

  return {
    watch,
    forget,
    openStore,
    openFlat,
    catalogDocuments,
    catalogNestedDocuments,
  };
}

export function bootstrapSessionDocumentCatalog(options: {
  documents: EditorSessionOptions['documents'];
  designId: string;
  commandContext: CommandContext;
  assetStores: Map<string, YjsDocumentStore>;
  order: string[];
  syncKinds: () => void;
  watch: (store: YjsDocumentStore, source: 'asset' | 'design') => void;
  designStore: YjsDocumentStore;
  savedJson: SavedJsonBaselines;
  applyPreferredOpen: (id: string, workspace: DefaultKind) => void;
  rebuildSnapshot: () => void;
  updates?: Readonly<Record<string, Uint8Array>>;
}) {
  const {
    documents,
    designId,
    commandContext,
    assetStores,
    order,
    syncKinds,
    watch,
    designStore,
    savedJson,
    applyPreferredOpen,
    rebuildSnapshot,
  } = options;

  registerSessionAssetDocuments({
    documents,
    designId,
    commandContext,
    assetStores,
    order,
    updates: options.updates,
  });
  syncKinds();
  watch(designStore, 'design');
  for (const id of order) {
    const store = assetStores.get(id);
    if (store) watch(store, 'asset');
  }
  const preferred =
    documents.find((file) => file.id === 'specimen' && assetStores.has(file.id)) ??
    documents.find((file) => file.kind === 'page' && assetStores.has(file.id)) ??
    documents.find((file) => assetStores.has(file.id));
  if (preferred && isKind(preferred.kind)) {
    applyPreferredOpen(preferred.id, preferred.kind);
  }
  for (const id of order) {
    const store = assetStores.get(id);
    if (store) markDocumentSaved(savedJson, id, store.getDocument());
  }
  markDocumentSaved(savedJson, designId, designStore.getDocument());
  rebuildSnapshot();
}

export function bindRefreshSelection(deps: {
  getSelectedNodeId: () => string | null;
  selectionDocument: () => FlatDocument;
  paintRoot: () => boolean;
  catalogDocuments: () => ReadonlyMap<string, FlatDocument>;
  prepareNestedDocument: (document: FlatDocument, variant?: string) => FlatDocument;
  getNestedSelection: () => NestedSelection | null;
  setNestedSelection: (selection: NestedSelection | null) => void;
  setSelectedRenderId: (id: string | null) => void;
  clearSelection: () => void;
}) {
  return () => {
    const selectedNodeId = deps.getSelectedNodeId();
    if (!selectedNodeId) return;
    const doc = deps.selectionDocument();
    if (!doc.nodes[selectedNodeId]) {
      deps.clearSelection();
      return;
    }
    const nestedSelection = deps.getNestedSelection();
    if (nestedSelection) {
      const next = resolveNestedSelection(
        doc,
        nestedSelection.renderId,
        deps.catalogDocuments(),
        deps.paintRoot(),
        deps.prepareNestedDocument,
      );
      if (!next || next.ownerNodeId !== selectedNodeId) {
        deps.clearSelection();
        return;
      }
      deps.setNestedSelection(next);
      deps.setSelectedRenderId(next.renderId);
      return;
    }
    deps.setSelectedRenderId(renderIdForNode(doc, selectedNodeId, deps.paintRoot()));
  };
}

export function bindBuildEditorSnapshot(deps: {
  openFlat: () => FlatDocument;
  getDesignDocument: () => FlatDocument;
  getWorkspace: () => DefaultKind;
  getOpenId: () => string;
  getSelectedNodeId: () => string | null;
  getSelectedRenderId: () => string | null;
  getNestedSelection: () => NestedSelection | null;
  getFocusViewportId: () => string | null;
  getSelectedViewportId: () => string | null;
  viewportChromeStore: Map<string, ViewportChromeSettings>;
  getEditTarget: () => StyleEditMode;
  getActiveVariantName: () => string | null;
  getNotice: () => EditorNotice | null;
  getZoomLabel: () => string;
  getTool: () => EditorTool;
  getDrag: () => EditorDrag | null;
  getGeneration: () => number;
  getDesignRevision: () => number;
  getRevision: () => number;
  order: string[];
  assetStores: Map<string, YjsDocumentStore>;
  savedJson: SavedJsonBaselines;
  designId: string;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getDrillStack: () => DrillStackFrame[];
}) {
  return (): EditorSnapshot => {
    const document = deps.openFlat();
    return buildEditorSnapshot({
      workspace: deps.getWorkspace(),
      openId: deps.getOpenId(),
      document,
      design: deps.getDesignDocument(),
      selectedNodeId: deps.getSelectedNodeId(),
      selectedRenderId: deps.getSelectedRenderId(),
      nestedSelection: deps.getNestedSelection(),
      focusViewportId: deps.getFocusViewportId(),
      selectedViewportId: deps.getSelectedViewportId(),
      viewportChrome: readViewportChromeForOpenDocument(deps.getOpenId(), deps.viewportChromeStore),
      editTarget: deps.getEditTarget(),
      activeVariantName:
        deps.getActiveVariantName() &&
        document.variantPresets?.some((preset) => preset.name === deps.getActiveVariantName())
          ? deps.getActiveVariantName()
          : null,
      notice: deps.getNotice(),
      zoomLabel: deps.getZoomLabel(),
      tool: deps.getTool(),
      drag: deps.getDrag(),
      generation: deps.getGeneration(),
      designRevision: deps.getDesignRevision(),
      revision: deps.getRevision(),
      order: deps.order,
      assetStores: deps.assetStores,
      savedJson: deps.savedJson,
      designId: deps.designId,
      canUndo: deps.canUndo(),
      canRedo: deps.canRedo(),
      drillParents: buildDrillParentsForSnapshot(deps.getDrillStack(), deps.assetStores),
    });
  };
}

export function createSessionSaveHooks(options: {
  handles: Map<string, JsonFileHandle>;
  savedJson: SavedJsonBaselines;
  setNotice: (notice: EditorNotice) => void;
  publish: () => void;
}) {
  const { handles, savedJson, setNotice, publish } = options;
  return {
    getHandle: (id: string) => handles.get(id),
    rememberHandle: (id: string, handle: JsonFileHandle) => handles.set(id, handle),
    markSaved: (id: string, document: FlatDocument) => markDocumentSaved(savedJson, id, document),
    setNotice,
    publish,
  };
}
