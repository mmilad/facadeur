import type {
  CatalogDesignCommand,
  CoreController,
  DefaultKind,
  NodeDefinitionModel,
  Breakpoint,
  TokenTree,
} from '@facadeur/core';
import type { ProjectCatalog } from '@facadeur/domain';
import type { LayerItem } from '../catalog/layer-tree';
import type { StyleEditMode } from '../viewport/viewport-edit';
import type { SidebarViewModel } from '../sidebar/types';
import type { StageState } from '../viewport/stage';

export type EditorTool = 'select' | 'frame' | 'text' | 'image';

export type EditorDrag = { kind: 'node'; nodeId: string } | { kind: 'asset'; assetId: string };

export interface AssetSummary {
  id: string;
  slug?: string;
  name: string;
  kind: DefaultKind;
}

export interface EditorNotice {
  tone: 'info' | 'error';
  text: string;
}

export interface EditorSnapshot {
  sidebar: SidebarViewModel;
  workspace: DefaultKind;
  openId: string;
  assets: AssetSummary[];
  layers: LayerItem | null;
  design: EditorDesignSnapshot;
  selectedNodeId: string | null;
  selectedRenderId: string | null;
  focusViewportId: string | null;
  selectedViewportId: string | null;
  editTarget: StyleEditMode;
  notice: EditorNotice | null;
  zoomLabel: string;
  catalog: AssetSummary[];
  tool: EditorTool;
  drag: EditorDrag | null;
  generation: number;
  designRevision: number;
  revision: number;
  designDirty: boolean;
  openDefinition: NodeDefinitionModel | null;
  selectedCatalogNodeUuid: string | null;
}

export interface EditorDesignSnapshot {
  tokens: TokenTree;
  icons?: ProjectCatalog['icons'];
  breakpoints: Breakpoint[];
}

export interface EditorSession {
  readonly core: CoreController;
  destroy: () => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EditorSnapshot;
  markCatalogSaved: () => void;
  setWorkspace: (kind: DefaultKind) => void;
  openAsset: (id: string, focus?: 'root') => void;
  selectNode: (nodeId: string | null) => void;
  selectRendered: (renderedId: string | null) => void;
  setFocusViewport: (breakpointId: string | null) => void;
  selectViewport: (breakpointId: string | null) => void;
  setEditTarget: (target: StyleEditMode) => void;
  setTool: (tool: EditorTool) => void;
  beginDrag: (drag: EditorDrag) => void;
  endDrag: () => void;
  executeDesign: (command: CatalogDesignCommand) => void;
  setNotice: (text: string, tone?: EditorNotice['tone']) => void;
  setZoom: (scale: number) => void;
  setZoomByHandler: (handler: ((factor: number) => void) | null) => void;
  zoomBy: (factor: number) => void;
  resetZoom: () => void;
  setFitHandler: (handler: (() => void) | null) => void;
  fit: () => void;
  getCanvasTransform: (assetId: string) => StageState | null;
  rememberCanvasTransform: (assetId: string, state: StageState) => void;
}

export interface EditorSessionOptions {
  core?: CoreController;
  projectCatalog?: ProjectCatalog;
}
