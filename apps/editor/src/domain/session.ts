import {
  DocumentError,
  toNested,
  validateCatalog,
  type Command,
  type DefaultKind,
  type DocumentFile,
  type DocumentStore,
  type FlatDocument,
  type FlatNode,
} from '@facadeur/core';
import { createDocumentStore, type YjsDocumentStore } from '@facadeur/store-yjs';
import type { DesignInput } from '@facadeur/tokens';
import { documentToJson, saveJsonFile, type JsonFileHandle } from './files.js';
import {
  clearDocumentSaved,
  isDocumentDirty,
  markDocumentSaved,
  type SavedJsonBaselines,
} from './save-state.js';
import { layerTree, nodeIdForHit, renderIdForNode, type LayerItem } from './selection-model.js';
import {
  chromeStorageKey,
  defaultViewportChrome,
  type ViewportChromeSettings,
} from './viewport-chrome.js';
import type { StyleEditMode } from './viewport-edit.js';

export type EditorTool = 'select' | 'frame' | 'text' | 'image';

export type EditorDrag = { kind: 'node'; nodeId: string } | { kind: 'asset'; assetId: string };

export interface AssetSummary {
  id: string;
  name: string;
  kind: DefaultKind;
}

export interface EditorNotice {
  tone: 'info' | 'error';
  text: string;
}

export interface EditorSnapshot {
  workspace: DefaultKind;
  openId: string;
  paintRoot: boolean;
  assets: AssetSummary[];
  layers: LayerItem | null;
  document: FlatDocument;
  design: FlatDocument;
  selectedNodeId: string | null;
  selectedRenderId: string | null;
  selectedNode: FlatNode | null;
  /** Breakpoint id of the frame the user last clicked. Null until then. */
  focusViewportId: string | null;
  /** When set, the right rail edits viewport chrome instead of node properties. */
  selectedViewportId: string | null;
  /** Per-breakpoint editor chrome for the open document (session memory, not in DSL). */
  viewportChrome: Readonly<Record<string, ViewportChromeSettings>>;
  /**
   * Where style, layout, and token edits land.
   * Stays on base until the user switches to the focused viewport's override.
   */
  editTarget: StyleEditMode;
  /** Definition of the selected instance, when that document is in the catalog. */
  componentTarget: FlatDocument | null;
  canUndo: boolean;
  canRedo: boolean;
  notice: EditorNotice | null;
  zoomLabel: string;
  /** Every document in the catalog, not only the current workspace. */
  catalog: AssetSummary[];
  tool: EditorTool;
  drag: EditorDrag | null;
  /** Bumps when a store is added or replaced. The stage remounts. */
  generation: number;
  /** Bumps when the design store changes. The stage calls setDesign. */
  designRevision: number;
  revision: number;
  /** Open document differs from the last successful save (or was never saved). */
  documentDirty: boolean;
  /** Design file differs from the last successful save (or was never saved). */
  designDirty: boolean;
}

export interface EditorSession {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EditorSnapshot;
  setWorkspace: (kind: DefaultKind) => void;
  openAsset: (id: string, focus?: 'root') => void;
  selectNode: (nodeId: string | null) => void;
  selectRendered: (renderedId: string | null) => void;
  /** Last clicked viewport frame. Does not change the selection or the edit target. */
  setFocusViewport: (breakpointId: string | null) => void;
  /** Select a viewport row (Layers or stage). Clears the node selection. */
  selectViewport: (breakpointId: string | null) => void;
  /** Update preview-only chrome for one breakpoint on the open document. */
  setViewportChrome: (breakpointId: string, patch: Partial<ViewportChromeSettings>) => void;
  /** Base, or a min-width override for the focused viewport. */
  setEditTarget: (target: StyleEditMode) => void;
  setTool: (tool: EditorTool) => void;
  beginDrag: (drag: EditorDrag) => void;
  endDrag: () => void;
  execute: (command: Command) => void;
  executeDesign: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  loadDocument: (file: DocumentFile, handle?: JsonFileHandle) => void;
  setNotice: (text: string, tone?: EditorNotice['tone']) => void;
  setZoom: (scale: number) => void;
  setZoomByHandler: (handler: ((factor: number) => void) | null) => void;
  zoomBy: (factor: number) => void;
  setFitHandler: (handler: (() => void) | null) => void;
  fit: () => void;
  boardDocuments: () => DocumentFile[];
  boardStores: () => DocumentStore[];
  designInput: () => DesignInput;
  filenameFor: (id: string) => string;
  fileHandle: (id: string) => JsonFileHandle | undefined;
  rememberHandle: (id: string, handle: JsonFileHandle) => void;
  /** Persist the open document. Returns true when bytes were written. */
  saveOpenDocument: () => Promise<boolean>;
  /** Persist the design document. Returns true when bytes were written. */
  saveDesign: () => Promise<boolean>;
}

export interface EditorSessionOptions {
  documents: readonly DocumentFile[];
  design: DocumentFile;
  /** Document id to filename, for the examples that are not `<id>.json`. */
  sources?: Readonly<Record<string, string>>;
}

const KINDS: readonly DefaultKind[] = ['atom', 'component', 'section', 'page'];

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
  const history: YjsDocumentStore[] = [];
  let redoStore: YjsDocumentStore | null = null;
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
  let snapshot: EditorSnapshot | null = null;

  const resolveKind = (componentId: string) => kinds.get(componentId);
  let designStore: YjsDocumentStore = createDocumentStore(options.design, { resolveKind });

  function filenameFor(id: string) {
    return sources[id] ?? `${id}.json`;
  }

  function syncKinds() {
    kinds.clear();
    for (const id of order) {
      const store = assetStores.get(id);
      if (!store) continue;
      const doc = store.getDocument();
      kinds.set(doc.id, doc.kind);
    }
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
    if (!store) return;
    unsubs.get(store)?.();
    unsubs.delete(store);
    const index = history.indexOf(store);
    if (index !== -1) history.splice(index, 1);
    if (redoStore === store) redoStore = null;
  }

  function noteCommand(store: YjsDocumentStore) {
    const index = history.indexOf(store);
    if (index !== -1) history.splice(index, 1);
    history.push(store);
    redoStore = null;
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

  function viewportChromeForOpenDocument(): Record<string, ViewportChromeSettings> {
    const prefix = `${openId}:`;
    const out: Record<string, ViewportChromeSettings> = {};
    for (const [key, value] of viewportChromeStore) {
      if (!key.startsWith(prefix)) continue;
      out[key.slice(prefix.length)] = value;
    }
    return out;
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
    const document = openFlat();
    const design = designStore.getDocument();
    const selectedNode = selectedNodeId ? (document.nodes[selectedNodeId] ?? null) : null;
    let componentTarget: FlatDocument | null = null;
    if (selectedNode?.type === 'instance') {
      componentTarget = assetStores.get(selectedNode.component)?.getDocument() ?? null;
    }
    const assets: AssetSummary[] = [];
    const catalog: AssetSummary[] = [];
    for (const id of order) {
      const store = assetStores.get(id);
      if (!store) continue;
      const doc = store.getDocument();
      if (!isKind(doc.kind)) continue;
      catalog.push({ id: doc.id, name: doc.name, kind: doc.kind });
      if (doc.kind !== workspace) continue;
      assets.push({ id: doc.id, name: doc.name, kind: doc.kind });
    }
    return {
      workspace,
      openId,
      paintRoot: document.kind !== 'page',
      assets,
      layers: layerTree(document),
      document,
      design,
      selectedNodeId,
      selectedRenderId,
      selectedNode,
      focusViewportId,
      selectedViewportId,
      viewportChrome: viewportChromeForOpenDocument(),
      editTarget,
      componentTarget,
      canUndo: history.some((store) => store.canUndo()),
      canRedo: redoStore?.canRedo() ?? false,
      notice,
      zoomLabel,
      catalog,
      tool,
      drag,
      generation,
      designRevision,
      revision,
      documentDirty: isDocumentDirty(savedJson, openId, document),
      designDirty: isDocumentDirty(savedJson, designId, design),
    };
  }

  function run(store: YjsDocumentStore, command: Command) {
    noteCommand(store);
    try {
      store.execute(command);
    } catch (error) {
      notice = { tone: 'error', text: errorText(error) };
      publish();
    }
  }

  for (const file of options.documents) {
    if (assetStores.has(file.id)) {
      throw new DocumentError('duplicate-id', `Duplicate document id "${file.id}"`);
    }
    if (file.id === designId) continue;
    const store = createDocumentStore(file, { resolveKind });
    assetStores.set(file.id, store);
    order.push(file.id);
  }
  if (!order.length) {
    throw new DocumentError('schema', 'The editor needs at least one document');
  }
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

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      if (!snapshot) throw new DocumentError('schema', 'Editor session is not ready');
      return snapshot;
    },
    setWorkspace(kind) {
      if (workspace === kind && isKind(openFlat().kind) && openFlat().kind === kind) return;
      workspace = kind;
      if (openFlat().kind !== kind) {
        const remembered = lastOpen.get(kind);
        const next =
          remembered &&
          assetStores.has(remembered) &&
          kindOfStore(assetStores.get(remembered)) === kind
            ? remembered
            : order.find((id) => kindOfStore(assetStores.get(id)) === kind);
        if (next) {
          openId = next;
          lastOpen.set(kind, next);
          clearSelection();
          clearViewportSelection();
          tool = 'select';
          drag = null;
        }
      }
      publish();
    },
    openAsset(id, focus) {
      const store = assetStores.get(id);
      if (!store) {
        notice = { tone: 'error', text: `Unknown component "${id}"` };
        publish();
        return;
      }
      const doc = store.getDocument();
      const kind = kindOf(doc);
      openId = id;
      workspace = kind;
      lastOpen.set(kind, id);
      tool = 'select';
      drag = null;
      if (focus === 'root') {
        selectedNodeId = doc.rootId;
        selectedRenderId = renderIdForNode(doc, doc.rootId, doc.kind !== 'page');
      } else {
        clearSelection();
        clearViewportSelection();
      }
      publish();
    },
    selectNode(nodeId) {
      if (!nodeId) {
        clearSelection();
        publish();
        return;
      }
      const doc = openFlat();
      if (!doc.nodes[nodeId]) return;
      const renderId = renderIdForNode(doc, nodeId, paintRoot());
      if (selectedNodeId === nodeId && selectedRenderId === renderId) return;
      clearViewportSelection();
      selectedNodeId = nodeId;
      selectedRenderId = renderId;
      publish();
    },
    setTool(next) {
      if (tool === next) return;
      tool = next;
      publish();
    },
    beginDrag(next) {
      drag = next;
      publish();
    },
    endDrag() {
      if (!drag) return;
      drag = null;
      publish();
    },
    selectRendered(renderedId) {
      if (!renderedId) {
        clearSelection();
        clearViewportSelection();
        publish();
        return;
      }
      const doc = openFlat();
      const nodeId = nodeIdForHit(doc, renderedId, paintRoot());
      if (!nodeId) {
        clearSelection();
        publish();
        return;
      }
      const renderId = renderIdForNode(doc, nodeId, paintRoot());
      if (selectedNodeId === nodeId && selectedRenderId === renderId) return;
      clearViewportSelection();
      selectedNodeId = nodeId;
      selectedRenderId = renderId;
      publish();
    },
    setFocusViewport(breakpointId) {
      const next = breakpointId && breakpointId.length > 0 ? breakpointId : null;
      if (focusViewportId === next) return;
      focusViewportId = next;
      publish();
    },
    selectViewport(breakpointId) {
      const next = breakpointId && breakpointId.length > 0 ? breakpointId : null;
      if (selectedViewportId === next && !selectedNodeId && focusViewportId === next) return;
      clearSelection();
      selectedViewportId = next;
      focusViewportId = next;
      publish();
    },
    setViewportChrome(breakpointId, patch) {
      if (!breakpointId) return;
      const key = chromeStorageKey(openId, breakpointId);
      const previous = viewportChromeStore.get(key) ?? defaultViewportChrome(kindOf(openFlat()));
      viewportChromeStore.set(key, { ...previous, ...patch });
      publish();
    },
    setEditTarget(target) {
      if (editTarget === target) return;
      editTarget = target;
      publish();
    },
    execute(command) {
      run(openStore(), command);
    },
    executeDesign(command) {
      run(designStore, command);
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
    loadDocument(file, handle) {
      try {
        if (file.id === designId) {
          const created = createDocumentStore(file, { resolveKind });
          const previous = designStore;
          designStore = created;
          forget(previous);
          previous.destroy();
          watch(created, 'design');
          if (handle) handles.set(file.id, handle);
          markDocumentSaved(savedJson, file.id, created.getDocument());
          designRevision += 1;
          notice = null;
          publish();
          return;
        }
        const nextFiles = order.map((id) => {
          if (id === file.id) return file;
          const store = assetStores.get(id);
          if (!store) throw new DocumentError('missing-node', `Missing document "${id}"`);
          return toNested(store.getDocument());
        });
        if (!assetStores.has(file.id)) nextFiles.push(file);
        validateCatalog(nextFiles);
        const created = createDocumentStore(file, { resolveKind });
        const previous = assetStores.get(file.id);
        assetStores.set(file.id, created);
        if (!order.includes(file.id)) order.push(file.id);
        syncKinds();
        forget(previous);
        previous?.destroy();
        watch(created, 'asset');
        if (handle) handles.set(file.id, handle);
        if (handle || previous) {
          markDocumentSaved(savedJson, file.id, created.getDocument());
        } else {
          clearDocumentSaved(savedJson, file.id);
        }
        const kind = kindOf(created.getDocument());
        openId = file.id;
        workspace = kind;
        lastOpen.set(kind, file.id);
        clearSelection();
        clearViewportSelection();
        tool = 'select';
        drag = null;
        generation += 1;
        notice = null;
        publish();
      } catch (error) {
        notice = { tone: 'error', text: errorText(error) };
        publish();
      }
    },
    setNotice(text, tone = 'info') {
      notice = { tone, text };
      publish();
    },
    setZoom(scale) {
      const label = `${Math.round(scale * 100)}%`;
      if (label === zoomLabel) return;
      zoomLabel = label;
      publish();
    },
    setZoomByHandler(handler) {
      zoomByHandler = handler;
    },
    zoomBy(factor) {
      zoomByHandler?.(factor);
    },
    setFitHandler(handler) {
      fitHandler = handler;
    },
    fit() {
      fitHandler?.();
    },
    boardDocuments() {
      return order.flatMap((id) => {
        const store = assetStores.get(id);
        return store ? [toNested(store.getDocument())] : [];
      });
    },
    boardStores() {
      return order.flatMap((id) => {
        const store = assetStores.get(id);
        return store ? [store] : [];
      });
    },
    designInput() {
      const doc = designStore.getDocument();
      return {
        tokens: doc.tokens,
        fonts: doc.fonts,
        breakpoints: doc.settings.breakpoints,
      };
    },
    filenameFor,
    fileHandle(id) {
      return handles.get(id);
    },
    rememberHandle(id, handle) {
      handles.set(id, handle);
    },
    async saveOpenDocument() {
      const snap = build();
      try {
        const result = await saveJsonFile({
          filename: filenameFor(snap.openId),
          text: documentToJson(snap.document),
          handle: handles.get(snap.openId),
        });
        if (result.handle) handles.set(snap.openId, result.handle);
        markDocumentSaved(savedJson, snap.openId, snap.document);
        const verb = result.via === 'download' ? 'Downloaded' : 'Saved';
        notice = { tone: 'info', text: `${verb} ${filenameFor(snap.openId)}` };
        publish();
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return false;
        notice = {
          tone: 'error',
          text: error instanceof Error ? error.message : 'Could not save',
        };
        publish();
        return false;
      }
    },
    async saveDesign() {
      const snap = build();
      const id = designId;
      try {
        const result = await saveJsonFile({
          filename: filenameFor(id),
          text: documentToJson(snap.design),
          handle: handles.get(id),
        });
        if (result.handle) handles.set(id, result.handle);
        markDocumentSaved(savedJson, id, snap.design);
        const verb = result.via === 'download' ? 'Downloaded' : 'Saved';
        notice = { tone: 'info', text: `${verb} ${filenameFor(id)}` };
        publish();
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return false;
        notice = {
          tone: 'error',
          text: error instanceof Error ? error.message : 'Could not save',
        };
        publish();
        return false;
      }
    },
  };
}

function kindOf(doc: FlatDocument): DefaultKind {
  if (!isKind(doc.kind)) {
    throw new DocumentError('unknown-kind', `Unsupported kind "${doc.kind}"`);
  }
  return doc.kind;
}

function kindOfStore(store: YjsDocumentStore | undefined): DefaultKind | null {
  if (!store) return null;
  const kind = store.getDocument().kind;
  return isKind(kind) ? kind : null;
}

function isKind(value: string): value is DefaultKind {
  return (KINDS as readonly string[]).includes(value);
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
