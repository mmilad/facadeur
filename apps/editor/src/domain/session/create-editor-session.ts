import { DocumentError, type Command, type DefaultKind, type FlatDocument } from '@facadeur/core';
import { createDocumentStore, type YjsDocumentStore } from '@facadeur/store-yjs';
import type { JsonFileHandle } from '../files.js';
import { markDocumentSaved, type SavedJsonBaselines } from '../save-state.js';
import { renderIdForNode } from '../selection-model.js';
import type { ViewportChromeSettings } from '../viewport-chrome.js';
import type { StyleEditMode } from '../viewport-edit.js';
import type { DrillStackFrame } from '../drill-navigation.js';
import { errorText, isKind, syncDocumentKinds } from './kinds.js';
import {
  applyOpenAssetChange,
  bindLoadDocument,
  bindPersistDocumentSave,
  boardDocumentsForOrder,
  boardStoresForOrder,
  designInputFromStore,
  registerSessionAssetDocuments,
} from './save.js';
import {
  buildDrillParentsForSnapshot,
  buildEditorSnapshot,
  readViewportChromeForOpenDocument,
} from './snapshot.js';
import { createEditorSessionSurface, createUndoHistory } from './undo-history.js';
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
  const sources = options.sources ?? {};
  const listeners = new Set<() => void>();
  const kinds = new Map<string, string>();
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
  let focusViewportId: string | null = null;
  let selectedViewportId: string | null = null;
  const viewportChromeStore = new Map<string, ViewportChromeSettings>();
  let editTarget: StyleEditMode = 'base';
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
  let designStore: YjsDocumentStore = createDocumentStore(options.design, { resolveKind });

  function filenameFor(id: string) {
    return sources[id] ?? `${id}.json`;
  }

  function syncKinds() {
    syncDocumentKinds(order, assetStores, kinds);
  }

  function watch(store: YjsDocumentStore, source: 'asset' | 'design') {
    unsubs.get(store)?.();
    unsubs.set(
      store,
      store.subscribe(() => {
        if (source === 'design') designRevision += 1;
        refreshSelection();
        if (notice?.tone === 'error') notice = null;
        publish();
      }),
    );
  }

  function forget(store: YjsDocumentStore | undefined) {
    undoHistory.forget(store);
  }

  function openStore(): YjsDocumentStore {
    const store = assetStores.get(openId);
    if (!store) throw new DocumentError('missing-node', `No open document "${openId}"`);
    return store;
  }

  function openFlat(): FlatDocument {
    return openStore().getDocument();
  }

  function paintRoot(): boolean {
    return openFlat().kind !== 'page';
  }

  function clearSelection() {
    selectedNodeId = null;
    selectedRenderId = null;
  }

  function clearViewportSelection() {
    selectedViewportId = null;
  }

  function refreshSelection() {
    if (!selectedNodeId) return;
    const doc = openFlat();
    if (!doc.nodes[selectedNodeId]) {
      clearSelection();
      return;
    }
    selectedRenderId = renderIdForNode(doc, selectedNodeId, paintRoot());
  }

  function publish() {
    revision += 1;
    snapshot = build();
    for (const listener of listeners) listener();
  }

  function build(): EditorSnapshot {
    return buildEditorSnapshot({
      workspace,
      openId,
      document: openFlat(),
      design: designStore.getDocument(),
      selectedNodeId,
      selectedRenderId,
      focusViewportId,
      selectedViewportId,
      viewportChrome: readViewportChromeForOpenDocument(openId, viewportChromeStore),
      editTarget,
      notice,
      zoomLabel,
      tool,
      drag,
      generation,
      designRevision,
      revision,
      order,
      assetStores,
      savedJson,
      designId,
      canUndo: undoHistory.canUndo(),
      canRedo: undoHistory.canRedo(),
      drillParents: buildDrillParentsForSnapshot(drillStack, assetStores),
    });
  }

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
        selectedNodeId = change.selectedNodeId;
        selectedRenderId = change.selectedRenderId;
        if (change.selectedNodeId === null) clearSelection();
        publish();
      },
    });
  }

  function applySelectNode(nodeId: string) {
    const doc = openFlat();
    if (!doc.nodes[nodeId]) return;
    const renderId = renderIdForNode(doc, nodeId, paintRoot());
    if (selectedNodeId === nodeId && selectedRenderId === renderId) return;
    clearViewportSelection();
    selectedNodeId = nodeId;
    selectedRenderId = renderId;
    publish();
  }

  function run(store: YjsDocumentStore, command: Command) {
    undoHistory.noteCommand(store);
    try {
      store.execute(command);
    } catch (error) {
      notice = { tone: 'error', text: errorText(error) };
      publish();
    }
  }

  registerSessionAssetDocuments({
    documents: options.documents,
    designId,
    resolveKind,
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
    options.documents.find((file) => file.id === 'specimen' && assetStores.has(file.id)) ??
    options.documents.find((file) => file.kind === 'page' && assetStores.has(file.id)) ??
    options.documents.find((file) => assetStores.has(file.id));
  if (preferred && isKind(preferred.kind)) {
    openId = preferred.id;
    workspace = preferred.kind;
    lastOpen.set(preferred.kind, preferred.id);
  }
  for (const id of order) {
    const store = assetStores.get(id);
    if (store) markDocumentSaved(savedJson, id, store.getDocument());
  }
  markDocumentSaved(savedJson, designId, designStore.getDocument());
  snapshot = build();

  const saveHooks = {
    getHandle: (id: string) => handles.get(id),
    rememberHandle: (id: string, handle: JsonFileHandle) => handles.set(id, handle),
    markSaved: (id: string, document: FlatDocument) => markDocumentSaved(savedJson, id, document),
    setNotice: (next: EditorNotice) => {
      notice = next;
    },
    publish,
  };

  return {
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
      run,
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
        resolveKind,
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
        build: () => {
          const snap = build();
          return { id: snap.openId, filename: filenameFor(snap.openId), document: snap.document };
        },
      }),
      saveDesign: bindPersistDocumentSave({
        ...saveHooks,
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
