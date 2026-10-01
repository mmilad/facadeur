import type {
  Command,
  DefaultKind,
  DocumentFile,
  DocumentStore,
  FlatDocument,
  FlatNode,
} from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';
import type { JsonFileHandle } from '../files.js';
import type { LayerItem } from '../selection-model.js';
import type { ViewportChromeSettings } from '../viewport-chrome.js';
import type { StyleEditMode } from '../viewport-edit.js';
import type { DrillParent } from '../drill-navigation.js';
import type { VariantSummary } from '../variant-edit.js';

export type EditorTool = 'select' | 'frame' | 'text' | 'image';

export type EditorDrag = { kind: 'node'; nodeId: string } | { kind: 'asset'; assetId: string };

export interface AssetSummary {
  id: string;
  name: string;
  kind: DefaultKind;
  group?: string;
  variants?: readonly VariantSummary[];
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
  /** The open document with the active named variant resolved for editing UI. */
  activeDocument: FlatDocument;
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
  /** Public fields of the selected component, including recursive expose paths. */
  componentFields: import('@facadeur/core').FieldDefinition[];
  /** Public events of the selected component, including recursive expose paths. */
  componentEvents: import('@facadeur/core').EventDefinition[];
  /** Default plus named component variants with resolved editor documents. */
  componentVariants: import('../component-contract.js').ComponentVariantContract[];
  /** Session-only editing context. Null means the document's default variant. */
  activeVariantName: string | null;
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
  /** Session drill-in parents shown in the top bar breadcrumb. */
  drillParents: readonly DrillParent[];
}

export interface EditorSession {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EditorSnapshot;
  setWorkspace: (kind: DefaultKind) => void;
  openAsset: (id: string, focus?: 'root') => void;
  /** Instance double-click drill: push parent and open the master document. */
  drillToMaster: (componentId: string) => void;
  /** Open a breadcrumb parent and reselect its instance when possible. */
  navigateDrillParent: (index: number) => void;
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
  /** Selects a named variant for the current component without changing persisted JSON. */
  setActiveVariant: (name: string | null) => void;
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
