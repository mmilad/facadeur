import { createId, findParent } from '@facadeur/core';
import {
  insertDraft,
  placementAllowed,
  refusalMessage,
  type InsertTool,
} from '../../../domain/editing.js';
import {
  layerInsertEntriesForLayer,
  layerInsertTarget,
  type LayerInsertEntry,
} from '../../../domain/layer-insert-policy.js';
import type { LayerItem } from '../../../domain/selection/selection-model.js';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';

export function canEditLayerItem(item: LayerItem, snap: EditorSnapshot): boolean {
  return !item.virtual && item.documentId === snap.openId;
}

export function canDeleteLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  return canEditLayerItem(item, snap) && item.id !== snap.document.rootId;
}

export function canInsertInsideLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  if (!canEditLayerItem(item, snap)) return false;
  return layerInsertEntriesForLayer(snap, item, 'inside').length > 0;
}

export function canInsertBelowLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  if (!canEditLayerItem(item, snap) || item.id === snap.document.rootId) return false;
  return layerInsertEntriesForLayer(snap, item, 'below').length > 0;
}

export function insertLayerEntry(
  session: EditorSession,
  snap: EditorSnapshot,
  item: LayerItem,
  entry: LayerInsertEntry,
  placement: 'inside' | 'below',
): void {
  if (placement === 'inside' && !canInsertInsideLayer(item, snap)) return;
  if (placement === 'below' && !canInsertBelowLayer(item, snap)) return;

  const doc = snap.document;
  const spot = layerInsertTarget(snap, item, placement);
  if (!spot) return;

  if (entry.kind === 'structural') {
    if (!placementAllowed(doc, spot.parentId, entry.tool)) return;
    const id = createId();
    session.execute({
      type: 'insert',
      parentId: spot.parentId,
      index: spot.index,
      node: { id, type: entry.tool, name: entry.label, children: [] },
    });
    if (session.getSnapshot().document.nodes[id]) session.selectNode(id);
    return;
  }

  if (entry.kind === 'primitive') {
    if (!placementAllowed(doc, spot.parentId, entry.tool)) {
      session.setNotice(refusalMessage(doc.kind, entry.tool), 'error');
      return;
    }
    const id = createId();
    session.execute({
      type: 'insert',
      parentId: spot.parentId,
      index: spot.index,
      node: insertDraft(entry.tool, id),
    });
    if (session.getSnapshot().document.nodes[id]) session.selectNode(id);
    return;
  }

  const asset = snap.catalog.find((candidate) => candidate.id === entry.assetId);
  if (!asset) return;
  if (!placementAllowed(doc, spot.parentId, 'instance', asset.kind)) {
    session.setNotice(refusalMessage(doc.kind, 'instance', asset.kind), 'error');
    return;
  }
  const id = createId();
  session.execute({
    type: 'insert',
    parentId: spot.parentId,
    index: spot.index,
    node: { id, type: 'instance', component: asset.id, name: asset.name },
  });
  if (session.getSnapshot().document.nodes[id]) session.selectNode(id);
}

/** @deprecated Use insertLayerEntry. Kept for any external callers. */
export function insertLayerTool(
  session: EditorSession,
  snap: EditorSnapshot,
  item: LayerItem,
  tool: InsertTool,
  placement: 'inside' | 'below',
): void {
  insertLayerEntry(session, snap, item, { kind: 'primitive', tool, label: tool }, placement);
}

export function deleteLayer(session: EditorSession, snap: EditorSnapshot, item: LayerItem): void {
  if (!canDeleteLayer(item, snap)) return;
  const parent = findParent(snap.document, item.id);
  try {
    session.execute({ type: 'remove', nodeId: item.id });
    session.selectNode(parent?.id ?? null);
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Could not remove layer', 'error');
  }
}
