import {
  canAcceptCatalogChildren,
  defaultNestingRules,
  findNodeByUuid,
  findParentOfNode,
  type NodeDefinitionModel,
  type NodeModel,
} from '@facadeur/core';
import {
  layerInsertEntries,
  type LayerInsertEntry,
} from '../layer-insert-policy';
import type { LayerItem } from '../selection/selection-model';
import type { AssetSummary, EditorSnapshot } from '../session/types';

export function catalogLayerInsertTarget(
  definition: NodeDefinitionModel,
  item: LayerItem,
  placement: 'inside' | 'below',
): { parentUuid: string; index: number } | null {
  const node = findNodeByUuid(definition.root, item.id);
  if (!node) return null;
  if (placement === 'inside') {
    if (!canAcceptCatalogChildren(node)) return null;
    return { parentUuid: item.id, index: (node.dom.children ?? []).length };
  }
  const parentInfo = findParentOfNode(definition.root, item.id);
  if (!parentInfo) return null;
  return { parentUuid: parentInfo.parent.uuid, index: parentInfo.index + 1 };
}

export function catalogPlacementAllowed(
  docKind: NodeDefinitionModel['kind'],
  parent: NodeModel,
  entry: LayerInsertEntry,
  catalog: readonly AssetSummary[],
): boolean {
  if (!canAcceptCatalogChildren(parent)) return false;
  const rule = defaultNestingRules[docKind];
  if (!rule) return false;
  if (entry.kind === 'structural') return false;
  if (entry.kind === 'primitive') {
    return rule.nodeTypes.includes(entry.tool);
  }
  const assetKind = catalog.find((asset) => asset.id === entry.assetId)?.kind;
  if (!assetKind) return false;
  return rule.nodeTypes.includes('instance') && rule.instanceKinds.includes(assetKind);
}

export function catalogLayerInsertEntriesForLayer(
  snap: EditorSnapshot,
  item: LayerItem,
  placement: 'inside' | 'below',
): LayerInsertEntry[] {
  const definition = snap.openDefinition;
  if (!definition) return [];
  const target = catalogLayerInsertTarget(definition, item, placement);
  if (!target) return [];
  const parent = findNodeByUuid(definition.root, target.parentUuid);
  if (!parent) return [];
  const entries = layerInsertEntries(snap).filter((entry) => entry.kind !== 'structural');
  return entries.filter((entry) =>
    catalogPlacementAllowed(definition.kind, parent, entry, snap.catalog),
  );
}
