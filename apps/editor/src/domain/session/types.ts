import type {
  CatalogPort,
  CatalogDesignCommand,
  CoreController,
  DefaultKind,
  DocumentFile,
  DocumentStore,
  FlatDocument,
  FlatNode,
  FieldDefinition,
  NodeDefinitionModel,
  ProjectCatalogModel,
} from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';
import type { JsonFileHandle } from '../assets/files';
import type { LayerItem } from '../selection/selection-model';
import type { NestedFieldContext, NestedSelection } from '../nested-selection';
import type { ViewportChromeSettings } from '../viewport/viewport-chrome';
import type { StyleEditMode } from '../viewport/viewport-edit';
import type { DrillParent } from '../navigation/drill-navigation';
import type { VariantSummary } from '../edits/variant-edit';
import type { AutomaticFieldGroup } from '../schema/component-contract';

export type EditorTool = 'select' | 'frame' | 'text' | 'image';

export type EditorDrag = { kind: 'node'; nodeId: string } | { kind: 'asset'; assetId: string };

export interface AssetSummary {
  id: string;
  slug?: string;
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
  activeDocument: FlatDocument;
  design: FlatDocument;
  selectedNodeId: string | null;
  selectedRenderId: string | null;
  selectedNode: FlatNode | null;
  nestedSelection: NestedSelection | null;
  fieldContext: NestedFieldContext | null;
  focusViewportId: string | null;
  selectedViewportId: string | null;
  viewportChrome: Readonly<Record<string, ViewportChromeSettings>>;
  editTarget: StyleEditMode;
  componentTarget: FlatDocument | null;
  componentFields: FieldDefinition[];
  automaticFieldGroups: AutomaticFieldGroup[];
  documentScopeFields: FieldDefinition[];
  componentEvents: import('@facadeur/core').EventDefinition[];
  componentVariants: import('../schema/component-contract').ComponentVariantContract[];
  activeVariantName: string | null;
  canUndo: boolean;
  canRedo: boolean;
  notice: EditorNotice | null;
  zoomLabel: string;
  catalog: AssetSummary[];
  tool: EditorTool;
  drag: EditorDrag | null;
  generation: number;
  designRevision: number;
  revision: number;
  documentDirty: boolean;
  designDirty: boolean;
  drillParents: readonly DrillParent[];
  openDefinition: NodeDefinitionModel | null;
  selectedCatalogNodeUuid: string | null;
}

export interface EditorSession {
  readonly core: CoreController;
  documentStores: () => DocumentStore[];
  markDocumentSaved: (id: string, document: FlatDocument) => void;
  destroy: () => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EditorSnapshot;
  setWorkspace: (kind: DefaultKind) => void;
  openAsset: (id: string, focus?: 'root') => void;
  drillToMaster: (componentId: string) => void;
  navigateDrillParent: (index: number) => void;
  selectNode: (nodeId: string | null) => void;
  selectRendered: (renderedId: string | null) => void;
  setNestedField: (field: string, value: import('@facadeur/core').FieldValue | null) => void;
  setFocusViewport: (breakpointId: string | null) => void;
  selectViewport: (breakpointId: string | null) => void;
  setViewportChrome: (breakpointId: string, patch: Partial<ViewportChromeSettings>) => void;
  setEditTarget: (target: StyleEditMode) => void;
  setActiveVariant: (name: string | null) => void;
  setTool: (tool: EditorTool) => void;
  beginDrag: (drag: EditorDrag) => void;
  endDrag: () => void;
  execute: (command: import('@facadeur/core').Command) => void;
  executeDesign: (command: CatalogDesignCommand) => void;
  executeDocument: (documentId: string, command: import('@facadeur/core').Command) => void;
  undo: () => void;
  redo: () => void;
  loadDocument: (file: DocumentFile, handle?: JsonFileHandle) => void;
  setNotice: (text: string, tone?: EditorNotice['tone']) => void;
  setZoom: (scale: number) => void;
  setZoomByHandler: (handler: ((factor: number) => void) | null) => void;
  zoomBy: (factor: number) => void;
  resetZoom: () => void;
  setFitHandler: (handler: (() => void) | null) => void;
  fit: () => void;
  boardDocuments: () => DocumentFile[];
  boardStores: () => DocumentStore[];
  designInput: () => DesignInput;
  filenameFor: (id: string) => string;
  fileHandle: (id: string) => JsonFileHandle | undefined;
  rememberHandle: (id: string, handle: JsonFileHandle) => void;
  saveOpenDocument: () => Promise<boolean>;
  saveDesign: () => Promise<boolean>;
}

export interface EditorSessionOptions {
  core?: CoreController;
  catalogPort?: CatalogPort;
  projectId?: string;
  projectCatalog?: ProjectCatalogModel;
}
