import {
  layerInsertAt,
  placementAllowed,
  toolAllowed,
  type InsertTool,
} from './editing.js';
import type { LayerItem } from './selection/selection-model.js';
import type { AssetSummary, EditorSnapshot } from './session/types.js';

/**
 * Preferred atom order in layer insert menus. Catalog atoms not listed here follow
 * alphabetically. Promote or add atom documents in examples as the library grows
 * (select, toggle/checkbox, textarea, image, video, …).
 */
export const STANDARD_ATOM_IDS = [
  'button',
  'link',
  'form-input',
  'form-select',
  'form-toggle',
  'textarea',
] as const;

const PRIMITIVE_LABELS: Record<InsertTool, string> = {
  frame: 'Frame',
  text: 'Text',
  image: 'Image',
};

export type LayerInsertEntry =
  | { kind: 'primitive'; tool: InsertTool; label: string }
  | { kind: 'instance'; assetId: string; label: string };

/**
 * Atom documents are built from layout primitives (frames group children).
 * Composed documents insert catalog atoms; pages insert sections or components.
 */
export function layerInsertEntries(snap: EditorSnapshot): LayerInsertEntry[] {
  const kind = snap.document.kind;
  if (kind === 'atom') {
    return (['frame', 'text', 'image'] as const)
      .filter((tool) => toolAllowed('atom', tool))
      .map((tool) => ({ kind: 'primitive' as const, tool, label: PRIMITIVE_LABELS[tool] }));
  }
  if (kind === 'page') {
    return catalogInstances(snap, (asset) => asset.kind === 'section' || asset.kind === 'component');
  }
  return catalogInstances(snap, (asset) => asset.kind === 'atom');
}

function catalogInstances(
  snap: EditorSnapshot,
  include: (asset: AssetSummary) => boolean,
): LayerInsertEntry[] {
  const order = new Map(STANDARD_ATOM_IDS.map((id, index) => [id, index]));
  return snap.catalog
    .filter((asset) => include(asset) && asset.id !== snap.openId)
    .sort((left, right) => {
      const leftRank = order.get(left.id as (typeof STANDARD_ATOM_IDS)[number]) ?? 999;
      const rightRank = order.get(right.id as (typeof STANDARD_ATOM_IDS)[number]) ?? 999;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.name.localeCompare(right.name);
    })
    .map((asset) => ({
      kind: 'instance' as const,
      assetId: asset.id,
      label: asset.name,
    }));
}

/** Resolve the parent frame that will receive a contextual insert. */
export function layerInsertTarget(
  snap: EditorSnapshot,
  item: LayerItem,
  placement: 'inside' | 'below',
): { parentId: string; index: number } | null {
  const doc = snap.document;
  if (placement === 'inside') {
    const frame = doc.nodes[item.id];
    if (frame?.type !== 'frame') return null;
    return { parentId: item.id, index: frame.children.length };
  }
  return layerInsertAt(doc, item.id, 'after');
}

export function layerInsertEntriesForLayer(
  snap: EditorSnapshot,
  item: LayerItem,
  placement: 'inside' | 'below',
): LayerInsertEntry[] {
  const target = layerInsertTarget(snap, item, placement);
  if (!target) return [];
  const doc = snap.document;
  return layerInsertEntries(snap).filter((entry) => {
    if (entry.kind === 'primitive') {
      return placementAllowed(doc, target.parentId, entry.tool);
    }
    const assetKind = snap.catalog.find((asset) => asset.id === entry.assetId)?.kind;
    return assetKind
      ? placementAllowed(doc, target.parentId, 'instance', assetKind)
      : false;
  });
}
