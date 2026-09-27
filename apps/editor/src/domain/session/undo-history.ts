import { type Command, type DefaultKind, type FlatDocument } from '@facadeur/core';
import type { YjsDocumentStore } from '@facadeur/store-yjs';
import type { JsonFileHandle } from '../files.js';
import {
  chromeStorageKey,
  defaultViewportChrome,
  type ViewportChromeSettings,
} from '../viewport-chrome.js';
import type { StyleEditMode } from '../viewport-edit.js';
import { pushDrillFrame, stackThroughParent, type DrillStackFrame } from '../drill-navigation.js';
import { applyWorkspaceChange, kindOf, normalizeBreakpointId } from './kinds.js';
import { resolveRenderedSelection } from './snapshot.js';
import type { EditorDrag, EditorNotice, EditorSession, EditorTool } from './types.js';

export interface UndoHistory {
  noteCommand: (store: YjsDocumentStore) => void;
  forget: (store: YjsDocumentStore | undefined) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
}

export function createUndoHistory(): UndoHistory {
  const history: YjsDocumentStore[] = [];
  let redoStore: YjsDocumentStore | null = null;

  return {
    noteCommand(store) {
      const index = history.indexOf(store);
      if (index !== -1) history.splice(index, 1);
      history.push(store);
      redoStore = null;
    },
    forget(store) {
      if (!store) return;
      const index = history.indexOf(store);
      if (index !== -1) history.splice(index, 1);
      if (redoStore === store) redoStore = null;
    },
    canUndo() {
      return history.some((item) => item.canUndo());
    },
    canRedo() {
      return redoStore?.canRedo() ?? false;
    },
    undo() {
      const store = [...history].reverse().find((item) => item.canUndo());
      if (!store) return;
      redoStore = store;
      store.undo();
    },
    redo() {
      if (!redoStore?.canRedo()) return;
      redoStore.redo();
    },
  };
}

export function drillToMasterDocument(options: {
  componentId: string;
  openId: string;
  selectedNodeId: string | null;
  document: FlatDocument;
  assetStores: ReadonlyMap<string, YjsDocumentStore>;
  drillStack: DrillStackFrame[];
  applyDrillStack: (stack: DrillStackFrame[]) => void;
  openAsset: (id: string, focus?: 'root') => void;
  onMissing: () => void;
}): void {
  const instanceId = options.selectedNodeId;
  if (!instanceId) return;
  const node = options.document.nodes[instanceId];
  if (node?.type !== 'instance' || node.component !== options.componentId) return;
  if (!options.assetStores.has(options.componentId)) {
    options.onMissing();
    return;
  }
  const next = pushDrillFrame(options.drillStack, {
    documentId: options.openId,
    documentName: options.document.name,
    instanceNodeId: instanceId,
  });
  options.applyDrillStack(next);
  options.openAsset(options.componentId, 'root');
}

export function navigateDrillParentDocument(options: {
  index: number;
  drillStack: DrillStackFrame[];
  applyDrillStack: (stack: DrillStackFrame[]) => void;
  openAsset: (id: string) => void;
  openDocument: () => FlatDocument;
  selectInstance: (nodeId: string) => void;
}): void {
  if (options.index < 0 || options.index >= options.drillStack.length) return;
  const frame = options.drillStack[options.index]!;
  const next = stackThroughParent(options.drillStack, options.index);
  options.applyDrillStack(next);
  options.openAsset(frame.documentId);
  const parentDoc = options.openDocument();
  if (parentDoc.nodes[frame.instanceNodeId]) {
    options.selectInstance(frame.instanceNodeId);
  }
}

export interface EditorSessionSurfaceDeps {
  getWorkspace: () => DefaultKind;
  setWorkspace: (value: DefaultKind) => void;
  openFlat: () => FlatDocument;
  lastOpen: Map<DefaultKind, string>;
  assetStores: ReadonlyMap<string, YjsDocumentStore>;
  order: readonly string[];
  getOpenId: () => string;
  setOpenId: (id: string) => void;
  getSelectedNodeId: () => string | null;
  setSelectedNodeId: (id: string | null) => void;
  getSelectedRenderId: () => string | null;
  setSelectedRenderId: (id: string | null) => void;
  getFocusViewportId: () => string | null;
  setFocusViewportId: (id: string | null) => void;
  getSelectedViewportId: () => string | null;
  setSelectedViewportId: (id: string | null) => void;
  viewportChromeStore: Map<string, ViewportChromeSettings>;
  getEditTarget: () => StyleEditMode;
  setEditTarget: (target: StyleEditMode) => void;
  getActiveVariantName: () => string | null;
  setActiveVariantName: (name: string | null) => void;
  getNotice: () => EditorNotice | null;
  setNotice: (notice: EditorNotice | null) => void;
  getZoomLabel: () => string;
  setZoomLabel: (label: string) => void;
  getTool: () => EditorTool;
  setTool: (tool: EditorTool) => void;
  getDrag: () => EditorDrag | null;
  setDrag: (drag: EditorDrag | null) => void;
  getDrillStack: () => DrillStackFrame[];
  setDrillStack: (stack: DrillStackFrame[]) => void;
  designStore: YjsDocumentStore;
  handles: Map<string, JsonFileHandle>;
  undoHistory: UndoHistory;
  clearSelection: () => void;
  clearViewportSelection: () => void;
  publish: () => void;
  openAssetCore: (id: string, focus?: 'root', keepDrillStack?: boolean) => void;
  applySelectNode: (nodeId: string) => void;
  paintRoot: () => boolean;
  openStore: () => YjsDocumentStore;
  run: (store: YjsDocumentStore, command: Command) => void;
  loadDocument: EditorSession['loadDocument'];
  setZoomByHandler: (handler: ((factor: number) => void) | null) => void;
  getZoomByHandler: () => ((factor: number) => void) | null;
  setFitHandler: (handler: (() => void) | null) => void;
  getFitHandler: () => (() => void) | null;
  filenameFor: (id: string) => string;
  boardDocuments: () => ReturnType<EditorSession['boardDocuments']>;
  boardStores: () => ReturnType<EditorSession['boardStores']>;
  designInput: () => ReturnType<EditorSession['designInput']>;
  saveOpenDocument: () => Promise<boolean>;
  saveDesign: () => Promise<boolean>;
  resetToolAndDrag: () => void;
}

export function createEditorSessionSurface(
  deps: EditorSessionSurfaceDeps,
): Omit<EditorSession, 'subscribe' | 'getSnapshot'> {
  return {
    setWorkspace(kind) {
      const nextWorkspace = applyWorkspaceChange({
        kind,
        workspace: deps.getWorkspace(),
        openFlatKind: deps.openFlat().kind,
        remembered: deps.lastOpen.get(kind),
        assetStores: deps.assetStores,
        order: deps.order,
        onSwitch: (next) => {
          deps.setOpenId(next);
          deps.lastOpen.set(kind, next);
          deps.setActiveVariantName(null);
          deps.clearSelection();
          deps.clearViewportSelection();
          deps.resetToolAndDrag();
        },
      });
      if (!nextWorkspace) return;
      deps.setWorkspace(nextWorkspace);
      deps.publish();
    },
    openAsset: (id, focus) => deps.openAssetCore(id, focus),
    drillToMaster(componentId) {
      drillToMasterDocument({
        componentId,
        openId: deps.getOpenId(),
        selectedNodeId: deps.getSelectedNodeId(),
        document: deps.openFlat(),
        assetStores: deps.assetStores,
        drillStack: deps.getDrillStack(),
        applyDrillStack: deps.setDrillStack,
        openAsset: (id, focus) => deps.openAssetCore(id, focus, true),
        onMissing: () => {
          deps.setNotice({ tone: 'error', text: `Unknown component "${componentId}"` });
          deps.publish();
        },
      });
    },
    navigateDrillParent(index) {
      navigateDrillParentDocument({
        index,
        drillStack: deps.getDrillStack(),
        applyDrillStack: deps.setDrillStack,
        openAsset: (id) => deps.openAssetCore(id, undefined, true),
        openDocument: deps.openFlat,
        selectInstance: deps.applySelectNode,
      });
    },
    selectNode(nodeId) {
      if (!nodeId) {
        deps.clearSelection();
        deps.publish();
        return;
      }
      deps.applySelectNode(nodeId);
    },
    setTool(next) {
      if (deps.getTool() === next) return;
      deps.setTool(next);
      deps.publish();
    },
    beginDrag(next) {
      deps.setDrag(next);
      deps.publish();
    },
    endDrag() {
      if (!deps.getDrag()) return;
      deps.setDrag(null);
      deps.publish();
    },
    selectRendered(renderedId) {
      if (!renderedId) {
        deps.clearSelection();
        deps.clearViewportSelection();
        deps.publish();
        return;
      }
      const hit = resolveRenderedSelection(deps.openFlat(), renderedId, deps.paintRoot());
      if (!hit) {
        deps.clearSelection();
        deps.publish();
        return;
      }
      if (deps.getSelectedNodeId() === hit.nodeId && deps.getSelectedRenderId() === hit.renderId) {
        return;
      }
      deps.clearViewportSelection();
      deps.setSelectedNodeId(hit.nodeId);
      deps.setSelectedRenderId(hit.renderId);
      deps.publish();
    },
    setFocusViewport(breakpointId) {
      const next = normalizeBreakpointId(breakpointId);
      if (deps.getFocusViewportId() === next) return;
      deps.setFocusViewportId(next);
      deps.publish();
    },
    selectViewport(breakpointId) {
      const next = normalizeBreakpointId(breakpointId);
      if (
        deps.getSelectedViewportId() === next &&
        !deps.getSelectedNodeId() &&
        deps.getFocusViewportId() === next
      ) {
        return;
      }
      deps.clearSelection();
      deps.setSelectedViewportId(next);
      deps.setFocusViewportId(next);
      deps.publish();
    },
    setViewportChrome(breakpointId, patch) {
      if (!breakpointId) return;
      const key = chromeStorageKey(deps.getOpenId(), breakpointId);
      const previous =
        deps.viewportChromeStore.get(key) ?? defaultViewportChrome(kindOf(deps.openFlat()));
      deps.viewportChromeStore.set(key, { ...previous, ...patch });
      deps.publish();
    },
    setEditTarget(target) {
      if (deps.getEditTarget() === target) return;
      deps.setEditTarget(target);
      deps.publish();
    },
    setActiveVariant(name) {
      const normalized = name === 'default' || name === null ? null : name;
      if (normalized !== null) {
        const exists = deps.openFlat().variantPresets?.some((preset) => preset.name === normalized);
        if (!exists) {
          deps.setNotice({ tone: 'error', text: `Unknown variant "${normalized}"` });
          deps.publish();
          return;
        }
      }
      if (deps.getActiveVariantName() === normalized) return;
      deps.setActiveVariantName(normalized);
      deps.publish();
    },
    execute: (command) => deps.run(deps.openStore(), command),
    executeDesign: (command) => deps.run(deps.designStore, command),
    undo: () => deps.undoHistory.undo(),
    redo: () => deps.undoHistory.redo(),
    loadDocument: deps.loadDocument,
    setNotice(text, tone = 'info') {
      deps.setNotice({ tone, text });
      deps.publish();
    },
    setZoom(scale) {
      const label = `${Math.round(scale * 100)}%`;
      if (label === deps.getZoomLabel()) return;
      deps.setZoomLabel(label);
      deps.publish();
    },
    setZoomByHandler: deps.setZoomByHandler,
    zoomBy: (factor) => deps.getZoomByHandler()?.(factor),
    setFitHandler: deps.setFitHandler,
    fit: () => deps.getFitHandler()?.(),
    boardDocuments: deps.boardDocuments,
    boardStores: deps.boardStores,
    designInput: deps.designInput,
    filenameFor: deps.filenameFor,
    fileHandle: (id) => deps.handles.get(id),
    rememberHandle: (id, handle) => deps.handles.set(id, handle),
    saveOpenDocument: deps.saveOpenDocument,
    saveDesign: deps.saveDesign,
  };
}
