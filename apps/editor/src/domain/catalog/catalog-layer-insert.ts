import {
  canAcceptCatalogChildren,
  defaultNestingRules,
  findNodeByUuid,
  findParentOfNode,
  type NodeDefinitionModel,
  type NodeModel,
} from '@facadeur/core';
import type { DefaultKind } from '@facadeur/core';
import type { LayerItem } from './layer-tree';
import type { AssetSummary, EditorSnapshot } from '../session/types';

/** Available catalog layer insertions for a definition kind. */
export type LayerInsertEntry =
  | { kind: 'primitive'; tool: 'frame' | 'text' | 'image'; label: string }
  | { kind: 'structural'; tool: 'repeater' | 'switch'; label: string }
  | { kind: 'instance'; assetId: string; label: string };

const STANDARD_ATOM_IDS = [
  'button',
  'link',
  'form-input',
  'form-select',
  'form-toggle',
  'textarea',
];

export function catalogLayerInsertEntries(
  kind: DefaultKind,
  catalog: readonly AssetSummary[],
  openId: string,
): LayerInsertEntry[] {
  if (kind === 'atom') return [];
  if (kind === 'page') {
    return catalogInstances(
      catalog,
      openId,
      (asset) => asset.kind === 'section' || asset.kind === 'component',
    );
  }
  return [
    { kind: 'primitive', tool: 'frame', label: 'Frame' },
    { kind: 'structural', tool: 'repeater', label: 'Repeater' },
    { kind: 'structural', tool: 'switch', label: 'Switch' },
    ...catalogInstances(catalog, openId, (asset) => asset.kind === 'atom'),
  ];
}

function catalogInstances(
  catalog: readonly AssetSummary[],
  openId: string,
  include: (asset: AssetSummary) => boolean,
) {
  const order = new Map(STANDARD_ATOM_IDS.map((id, index) => [id, index]));
  return catalog
    .filter((asset) => include(asset) && asset.id !== openId)
    .sort((left, right) => {
      const leftRank = order.get(left.id) ?? 999;
      const rightRank = order.get(right.id) ?? 999;
      return leftRank - rightRank || left.name.localeCompare(right.name);
    })
    .map((asset) => ({ kind: 'instance' as const, assetId: asset.id, label: asset.name }));
}

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
  const entries = catalogLayerInsertEntries(definition.kind, snap.catalog, snap.openId).filter(
    (entry) => entry.kind !== 'structural',
  );
  return entries.filter((entry) =>
    catalogPlacementAllowed(definition.kind, parent, entry, snap.catalog),
  );
}
