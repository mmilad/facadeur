import type { CoreController } from '@facadeur/core';
import { catalogAssetSummaries } from '../catalog/asset-list';
import { catalogLayerTree } from '../catalog/layer-tree';
import type { AssetSummary, EditorDrag, EditorNotice, EditorSnapshot, EditorTool } from './types';
import type { DefaultKind } from '@facadeur/core';
import type { StyleEditMode } from '../viewport/viewport-edit';
import type { SidebarLayer } from '../sidebar/types';
import { defaultNestingRules } from '@facadeur/core';
import { findNodeByUuid } from '@facadeur/core';
import {
  catalogLayerInsertEntries,
  catalogLayerInsertTarget,
  catalogPlacementAllowed,
} from '../catalog/catalog-layer-insert';

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
  const openDefinition = coreSnap.openDefinition;
  const design = input.core.getDesignSnapshot();
  const catalogAssets = catalogAssetSummaries(input.core);
  const assets = catalogAssets.filter((asset) => asset.kind === input.workspace);
  const layers = openDefinition
    ? catalogLayerTree(openDefinition.uuid, openDefinition.root, input.core)
    : null;
  const openKind = openDefinition?.kind ?? input.workspace;
  const sidebarLayers = (item: typeof layers): SidebarLayer | null =>
    item
      ? {
          id: item.id,
          address: item.address,
          label: item.name,
          type: item.type,
          tagName: item.tagName,
          virtual: item.virtual,
          documentId: item.documentId,
          canDelete: Boolean(
            openDefinition &&
            !item.virtual &&
            item.documentId === input.openId &&
            item.id !== openDefinition.root.uuid,
          ),
          insertInside: sidebarInsertOptions(item, 'inside'),
          insertBelow: sidebarInsertOptions(item, 'below'),
          children: item.children.map((child) => sidebarLayers(child)!),
        }
      : null;
  function sidebarInsertOptions(item: NonNullable<typeof layers>, placement: 'inside' | 'below') {
    if (!openDefinition) return [];
    const target = catalogLayerInsertTarget(openDefinition, item, placement);
    const parent = target ? findNodeByUuid(openDefinition.root, target.parentUuid) : null;
    if (!parent) return [];
    return catalogLayerInsertEntries(openDefinition.kind, catalogAssets, input.openId)
      .filter((entry) => catalogPlacementAllowed(openDefinition.kind, parent, entry, catalogAssets))
      .map((entry) => ({
        kind: entry.kind,
        value: entry.kind === 'instance' ? entry.assetId : entry.tool,
        label: entry.label,
      }));
  }
  const sidebar = {
    project: {
      assets: catalogAssets.map(({ id, name, slug, kind, category }) => ({
        id,
        label: name,
        slug,
        kind,
        category,
      })),
      openId: input.openId,
      draggableAssetIds: catalogAssets
        .filter(
          (asset) =>
            asset.id !== input.openId &&
            defaultNestingRules[openKind].instanceKinds.includes(asset.kind),
        )
        .map((asset) => asset.id),
    },
    layers: {
      title: openDefinition
        ? (input.core.getDefinitionDisplayName(openDefinition.uuid) ?? openDefinition.name)
        : 'Design',
      rootId: openDefinition?.root.uuid ?? null,
      layers: sidebarLayers(layers),
      selectedId: input.selectedNodeId,
      selectedRenderId: input.selectedRenderId,
      draggedNodeId: input.drag?.kind === 'node' ? input.drag.nodeId : null,
    },
    inspector: null,
  } as const;

  return {
    sidebar,
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
