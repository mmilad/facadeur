import { catalogLayerInsertEntriesForLayer } from '../../../domain/catalog/catalog-layer-insert';
import type { LayerItem } from '../../../domain/catalog/layer-tree';
import type { EditorSnapshot } from '../../../domain/session';
import { canEditLayerItem as canEdit } from './layer-edit-policy';

export function canDeleteCatalogLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  const rootId = snap.openDefinition?.root.uuid;
  return canEdit(item, snap) && item.id !== rootId;
}

export function canInsertInsideCatalogLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  if (!canEdit(item, snap)) return false;
  return catalogLayerInsertEntriesForLayer(snap, item, 'inside').length > 0;
}

export function canInsertBelowCatalogLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  if (!canEdit(item, snap) || item.id === snap.openDefinition?.root.uuid) {
    return false;
  }
  return catalogLayerInsertEntriesForLayer(snap, item, 'below').length > 0;
}
