import { DocumentError, type DefaultKind, type FlatDocument } from '@facadeur/core';
import type { ControllerDocumentStore } from '@facadeur/core';
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
  assetStores: Map<string, ControllerDocumentStore>;
  unsubs: Map<ControllerDocumentStore, () => void>;
  undoHistory: ReturnType<typeof createUndoHistory>;
  getOpenId: () => string;
  onStoreChange: (source: 'asset' | 'design') => void;
}) {
  const { assetStores, unsubs, undoHistory, getOpenId, onStoreChange } = deps;

  function watch(store: ControllerDocumentStore, source: 'asset' | 'design') {
    unsubs.get(store)?.();
    unsubs.set(
      store,
      store.subscribe((change) => {
        if (change.reason === 'command') undoHistory.noteCommand(store);
        onStoreChange(source);
      }),
    );
  }

  function forget(store: ControllerDocumentStore | undefined) {
    undoHistory.forget(store);
  }

  function openStore(): ControllerDocumentStore {
    const openId = getOpenId();
    const store = assetStores.get(openId);
    if (!store) throw new DocumentError('missing-node', `No open document "${openId}"`);
    return store;
  }

  return {
    watch,
    forget,
    openStore,
  };
}

export function bootstrapSessionDocumentCatalog(options: {
  documents: EditorSessionOptions['documents'];
  designId: string;
  getStore: (id: string) => ControllerDocumentStore;
  assetStores: Map<string, ControllerDocumentStore>;
  order: string[];
  syncKinds: () => void;
  watch: (store: ControllerDocumentStore, source: 'asset' | 'design') => void;
  designStore: ControllerDocumentStore;
  savedJson: SavedJsonBaselines;
  applyPreferredOpen: (id: string, workspace: DefaultKind) => void;
  rebuildSnapshot: () => void;
}) {
  const {
    documents,
    designId,
    getStore,
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
    getStore,
    assetStores,
    order,
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
  getSchemaCatalog: () => import('@facadeur/core').SchemaCatalog | undefined;
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
        deps.getSchemaCatalog(),
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
  catalogDocuments?: () => ReadonlyMap<string, FlatDocument>;
  order: string[];
  assetStores: Map<string, ControllerDocumentStore>;
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
      catalogDocuments: deps.catalogDocuments?.(),
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
