import {
  DocumentError,
  readTokenTree,
  resolveChildFieldDefinition,
  resolveVariantDocument,
  toFlat,
  toNested,
  validateCatalog,
  type CommandContext,
  type DefaultKind,
  type FlatDocument,
} from '@facadeur/core';
import { createDocumentStore, type YjsDocumentStore } from '@facadeur/store-yjs';
import type { JsonFileHandle } from '../assets/files.js';
import type { SavedJsonBaselines } from '../assets/save-state.js';
import { markDocumentSaved, clearDocumentSaved } from '../assets/save-state.js';
import { renderIdForNode } from '../selection/selection-model.js';
import { resolveNestedSelection, type NestedSelection } from '../nested-selection.js';
import type { ViewportChromeSettings } from '../viewport/viewport-chrome.js';
import type { StyleEditMode } from '../viewport/viewport-edit.js';
import type { DrillStackFrame } from '../navigation/drill-navigation.js';
import { syncDocumentKinds } from './kinds.js';
import {
  applyOpenAssetChange,
  bindLoadDocument,
  bindPersistDocumentSave,
  boardDocumentsForOrder,
  boardStoresForOrder,
  designInputFromStore,
} from './save.js';
import { createEditorSessionSurface, createUndoHistory } from './undo-history.js';
import { migratePreviewData } from '../preview-data.js';
import { bindSessionCommandRunner } from './session-commands.js';
import {
  bindBuildEditorSnapshot,
  bindRefreshSelection,
  bindSessionDocumentStores,
  bootstrapSessionDocumentCatalog,
  createSessionSaveHooks,
} from './session-documents.js';
import { prepareNestedDocument } from './session-variant-context.js';
import { bindAcceptProjectDocuments } from './session-catalog.js';
import type {
  EditorDrag,
  EditorNotice,
  EditorSession,
  EditorSessionOptions,
  EditorSnapshot,
  EditorTool,
} from './types.js';

export function createEditorSession(options: EditorSessionOptions): EditorSession {
  if (!options.documents.length) {
    throw new DocumentError('schema', 'The editor needs at least one document');
  }
  const sources = { ...options.sources };
  const listeners = new Set<() => void>();
  // Hydration validates instance targets before any stores are registered.
  // Seed the entire catalog so design and forward asset references can resolve.
  const kinds = new Map<string, string>(
    [...options.documents, options.design].map((file) => [file.id, file.kind]),
  );
  const assetStores = new Map<string, YjsDocumentStore>();
  const order: string[] = [];
  const handles = new Map<string, JsonFileHandle>();
  const unsubs = new Map<YjsDocumentStore, () => void>();
  const lastOpen = new Map<DefaultKind, string>();
  const undoHistory = createUndoHistory();
  let fitHandler: (() => void) | null = null;
  let zoomByHandler: ((factor: number) => void) | null = null;
  let workspace: DefaultKind = 'page';
  let openId = options.documents[0]?.id ?? '';
  let selectedNodeId: string | null = null;
  let selectedRenderId: string | null = null;
  let nestedSelection: NestedSelection | null = null;
  let focusViewportId: string | null = null;
  let selectedViewportId: string | null = null;
  const viewportChromeStore = new Map<string, ViewportChromeSettings>();
  let editTarget: StyleEditMode = 'base';
  // This is deliberately session state. Variant overlays remain sparse data in the document;
  // selecting one only changes the editing context until a later command writes an override.
  let activeVariantName: string | null = null;
  let notice: EditorNotice | null = null;
  let zoomLabel = '100%';
  let tool: EditorTool = 'select';
  let drag: EditorDrag | null = null;
  let generation = 0;
  let designRevision = 0;
  let revision = 0;
  const designId = options.design.id;
  const savedJson: SavedJsonBaselines = new Map();
  let drillStack: DrillStackFrame[] = [];
  let snapshot: EditorSnapshot | null = null;

  const resolveKind = (componentId: string) => kinds.get(componentId);
  const commandContext: CommandContext = { resolveKind };
  let designStore: YjsDocumentStore = createDocumentStore(
    options.updates?.[designId] ? options.design : migratePreviewData(options.design),
    commandContext,
    { update: options.updates?.[designId] },
  );

  function filenameFor(id: string) {
    return sources[id] ?? `${id}.json`;
  }

  function syncKinds() {
    syncDocumentKinds(order, assetStores, kinds);
  }

  let onStoreChange: (source: 'asset' | 'design') => void = () => {};
  const { watch, forget, openStore, openFlat, catalogDocuments, catalogNestedDocuments } =
    bindSessionDocumentStores({
      assetStores,
      unsubs,
      undoHistory,
      getOpenId: () => openId,
      onStoreChange: (source) => onStoreChange(source),
    });

  function selectionDocument(): FlatDocument {
    const document = openFlat();
    if (
      !activeVariantName ||
      !document.variantPresets?.some((preset) => preset.name === activeVariantName)
    ) {
      return document;
    }
    return toFlat(resolveVariantDocument(toNested(document), activeVariantName));
  }

  function paintRoot(): boolean {
    return openFlat().kind !== 'page';
  }

  function clearSelection() {
    selectedNodeId = null;
    selectedRenderId = null;
    nestedSelection = null;
  }

  function clearViewportSelection() {
    selectedViewportId = null;
  }

  const refreshSelection = bindRefreshSelection({
    getSelectedNodeId: () => selectedNodeId,
    selectionDocument,
    paintRoot,
    catalogDocuments,
    prepareNestedDocument,
    getNestedSelection: () => nestedSelection,
    setNestedSelection: (selection) => {
      nestedSelection = selection;
    },
    setSelectedRenderId: (id) => {
      selectedRenderId = id;
    },
    clearSelection,
  });

  const build = bindBuildEditorSnapshot({
    openFlat,
    getDesignDocument: () => designStore.getDocument(),
    getWorkspace: () => workspace,
    getOpenId: () => openId,
    getSelectedNodeId: () => selectedNodeId,
    getSelectedRenderId: () => selectedRenderId,
    getNestedSelection: () => nestedSelection,
    getFocusViewportId: () => focusViewportId,
    getSelectedViewportId: () => selectedViewportId,
    viewportChromeStore,
    getEditTarget: () => editTarget,
    getActiveVariantName: () => activeVariantName,
    getNotice: () => notice,
    getZoomLabel: () => zoomLabel,
    getTool: () => tool,
    getDrag: () => drag,
    getGeneration: () => generation,
    getDesignRevision: () => designRevision,
    getRevision: () => revision,
    order,
    assetStores,
    savedJson,
    designId,
    canUndo: () => undoHistory.canUndo(),
    canRedo: () => undoHistory.canRedo(),
    getDrillStack: () => drillStack,
  });

  function publish() {
    revision += 1;
    snapshot = build();
    for (const listener of listeners) listener();
  }

  onStoreChange = (source) => {
    if (source === 'design') designRevision += 1;
    refreshSelection();
    if (notice?.tone === 'error') notice = null;
    publish();
  };

  function openAssetCore(id: string, focus?: 'root', keepDrillStack = false) {
    applyOpenAssetChange({
      id,
      focus,
      keepDrillStack,
      resetDrillStack: () => {
        drillStack = [];
      },
      assetStores,
      onMissing: () => {
        notice = { tone: 'error', text: `Unknown component "${id}"` };
        publish();
      },
      onOpened: (change) => {
        openId = change.openId;
        workspace = change.workspace;
        lastOpen.set(change.workspace, change.openId);
        tool = change.tool;
        drag = change.drag;
        if (change.clearViewport) clearViewportSelection();
        activeVariantName = null;
        nestedSelection = null;
        selectedNodeId = change.selectedNodeId;
        selectedRenderId = change.selectedRenderId;
        if (change.selectedNodeId === null) clearSelection();
        publish();
      },
    });
  }

  function applySelectNode(nodeId: string) {
    const doc = selectionDocument();
    if (!doc.nodes[nodeId]) return;
    const renderId = renderIdForNode(doc, nodeId, paintRoot());
    if (selectedNodeId === nodeId && selectedRenderId === renderId && !nestedSelection) return;
    clearViewportSelection();
    selectedNodeId = nodeId;
    selectedRenderId = renderId;
    nestedSelection = null;
    publish();
  }

  commandContext.resolveChildField = (node, path, field) =>
    resolveChildFieldDefinition(node, path, field, catalogNestedDocuments());

  function prepareCommandContext() {
    commandContext.globalTokenPaths = new Set(
      readTokenTree(designStore.getDocument().tokens).tokens.keys(),
    );
  }

  const runWithActiveVariant = bindSessionCommandRunner({
    undoHistory,
    assetStores,
    getOpenId: () => openId,
    getSnapshot: () => snapshot,
    resolveKind,
    catalogNestedDocuments,
    prepareCommandContext,
    setErrorNotice: (message) => {
      notice = { tone: 'error', text: message };
    },
    publish,
  });

  bootstrapSessionDocumentCatalog({
    documents: options.documents,
    updates: options.updates,
    designId,
    commandContext,
    assetStores,
    order,
    syncKinds,
    watch,
    designStore,
    savedJson,
    applyPreferredOpen: (id, kind) => {
      openId = id;
      workspace = kind;
      lastOpen.set(kind, id);
    },
    rebuildSnapshot: () => {
      snapshot = build();
    },
  });

  const saveHooks = createSessionSaveHooks({
    handles,
    savedJson,
    setNotice: (next) => {
      notice = next;
    },
    publish,
  });

  return {
    acceptProjectDocuments: bindAcceptProjectDocuments({
      assetStores,
      getDesignStore: () => designStore,
      kinds,
      commandContext,
      order,
      sources,
      savedJson,
      watch,
      publishCatalog: () => {
        generation += 1;
        publish();
      },
    }),
    syncStores: () => [designStore, ...assetStores.values()],
    markProjectSaved(id, saved) {
      const store = id === designId ? designStore : assetStores.get(id);
      if (!store) return;
      if (saved) markDocumentSaved(savedJson, id, store.getDocument());
      else clearDocumentSaved(savedJson, id);
      publish();
    },
    destroy() {
      for (const unsubscribe of unsubs.values()) unsubscribe();
      for (const store of assetStores.values()) store.destroy();
      designStore.destroy();
      listeners.clear();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      if (!snapshot) throw new DocumentError('schema', 'Editor session is not ready');
      return snapshot;
    },
    ...createEditorSessionSurface({
      getWorkspace: () => workspace,
      setWorkspace: (value) => {
        workspace = value;
      },
      openFlat,
      lastOpen,
      assetStores,
      order,
      getOpenId: () => openId,
      setOpenId: (id) => {
        openId = id;
      },
      getSelectedNodeId: () => selectedNodeId,
      setSelectedNodeId: (id) => {
        selectedNodeId = id;
      },
      getSelectedRenderId: () => selectedRenderId,
      setSelectedRenderId: (id) => {
        selectedRenderId = id;
      },
      getNestedSelection: () => nestedSelection,
      getFieldContext: () => snapshot?.fieldContext ?? null,
      setNestedSelection: (selection) => {
        nestedSelection = selection;
      },
      resolveNestedSelection: (renderedId) =>
        resolveNestedSelection(
          selectionDocument(),
          renderedId,
          catalogDocuments(),
          paintRoot(),
          prepareNestedDocument,
        ),
      getFocusViewportId: () => focusViewportId,
      setFocusViewportId: (id) => {
        focusViewportId = id;
      },
      getSelectedViewportId: () => selectedViewportId,
      setSelectedViewportId: (id) => {
        selectedViewportId = id;
      },
      viewportChromeStore,
      getEditTarget: () => editTarget,
      setEditTarget: (target) => {
        editTarget = target;
      },
      getActiveVariantName: () => activeVariantName,
      setActiveVariantName: (name) => {
        activeVariantName = name;
        refreshSelection();
      },
      getNotice: () => notice,
      setNotice: (value) => {
        notice = value;
      },
      getZoomLabel: () => zoomLabel,
      setZoomLabel: (label) => {
        zoomLabel = label;
      },
      getTool: () => tool,
      setTool: (value) => {
        tool = value;
      },
      getDrag: () => drag,
      setDrag: (value) => {
        drag = value;
      },
      getDrillStack: () => drillStack,
      setDrillStack: (stack) => {
        drillStack = stack;
      },
      designStore,
      handles,
      undoHistory,
      clearSelection,
      clearViewportSelection,
      publish,
      openAssetCore,
      applySelectNode,
      paintRoot,
      openStore,
      run: runWithActiveVariant,
      loadDocument: bindLoadDocument({
        designId,
        getDesignStore: () => designStore,
        setDesignStore: (store) => {
          designStore = store;
        },
        order,
        assetStores,
        handles,
        savedJson,
        commandContext,
        forget,
        watch,
        syncKinds,
        resetDrillStack: () => {
          drillStack = [];
        },
        onDesignLoaded: () => {
          designRevision += 1;
        },
        onAssetLoaded: (kind, file) => {
          openId = file.id;
          workspace = kind;
          lastOpen.set(kind, file.id);
          activeVariantName = null;
          clearSelection();
          clearViewportSelection();
          tool = 'select';
          drag = null;
          generation += 1;
        },
        onError: (message) => {
          notice = { tone: 'error', text: message };
        },
        onNoticeClear: () => {
          notice = null;
        },
        publish,
      }),
      setZoomByHandler: (handler) => {
        zoomByHandler = handler;
      },
      getZoomByHandler: () => zoomByHandler,
      setFitHandler: (handler) => {
        fitHandler = handler;
      },
      getFitHandler: () => fitHandler,
      filenameFor,
      boardDocuments: () => boardDocumentsForOrder(order, assetStores),
      boardStores: () => boardStoresForOrder(order, assetStores),
      designInput: () => designInputFromStore(designStore),
      saveOpenDocument: bindPersistDocumentSave({
        ...saveHooks,
        saveDocument: options.saveDocument,
        validate: () => validateCatalog(boardDocumentsForOrder(order, assetStores)),
        build: () => {
          const snap = build();
          return { id: snap.openId, filename: filenameFor(snap.openId), document: snap.document };
        },
      }),
      saveDesign: bindPersistDocumentSave({
        ...saveHooks,
        saveDocument: options.saveDocument,
        build: () => {
          const snap = build();
          return { id: designId, filename: filenameFor(designId), document: snap.design };
        },
      }),
      resetToolAndDrag: () => {
        tool = 'select';
        drag = null;
      },
    }),
  };
}
