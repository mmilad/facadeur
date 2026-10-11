import { defaultBreakpoints, emptyTokenTree, type CoreController } from '@facadeur/core';
import { catalogAssetSummaries } from '../catalog/asset-list';
import { catalogLayerTree } from '../catalog/layer-tree';
import type { AssetSummary, EditorDrag, EditorNotice, EditorSnapshot, EditorTool } from './types';
import type { DefaultKind, ProjectCatalogModel } from '@facadeur/core';
import type { StyleEditMode } from '../viewport/viewport-edit';

export function buildCatalogEditorSnapshot(input: {
  core: CoreController;
  workspace: DefaultKind;
  openId: string;
  selectedNodeId: string | null;
  selectedRenderId: string | null;
  tool: EditorTool;
  drag: EditorDrag | null;
  notice: EditorNotice | null;
  zoomLabel: string;
  generation: number;
  designRevision: number;
  revision: number;
  catalogDirty: boolean;
  focusViewportId: string | null;
  selectedViewportId: string | null;
  editTarget: StyleEditMode;
}): EditorSnapshot {
  const coreSnap = input.core.getSnapshot();
  const catalog = coreSnap.catalog;
  const openDefinition = coreSnap.openDefinition;
  const design = {
    tokens: catalog.tokens ?? emptyTokenTree(),
    ...(catalog.icons ? { icons: catalog.icons } : {}),
    breakpoints: [...(catalog.globalStyles?.breakpoints ?? defaultBreakpoints)],
  };
  const catalogAssets = catalogAssetSummaries(catalog);
  const assets = catalogAssets.filter((asset) => asset.kind === input.workspace);
  const layers = openDefinition
    ? catalogLayerTree(openDefinition.uuid, openDefinition.root, catalog)
    : null;

  return {
    workspace: input.workspace,
    openId: input.openId,
    assets,
    layers,
    design,
    selectedNodeId: input.selectedNodeId,
    selectedRenderId: input.selectedRenderId,
    focusViewportId: input.focusViewportId,
    selectedViewportId: input.selectedViewportId,
    editTarget: input.editTarget,
    notice: input.notice,
    zoomLabel: input.zoomLabel,
    catalog: catalogAssets,
    tool: input.tool,
    drag: input.drag,
    generation: input.generation,
    designRevision: input.designRevision,
    revision: input.revision,
    designDirty: input.catalogDirty,
    openDefinition,
    selectedCatalogNodeUuid: coreSnap.selectedNodeUuid,
  };
}

export function initialCatalogAsset(
  assets: AssetSummary[],
): { id: string; kind: DefaultKind } | null {
  const page = assets.find((asset) => asset.kind === 'page');
  if (page) return page;
  const component = assets.find((asset) => asset.kind === 'component');
  if (component) return component;
  const atom = assets.find((asset) => asset.kind === 'atom');
  return atom ?? null;
}
