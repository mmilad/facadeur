import { catalogLayerInsertEntriesForLayer } from '../../../domain/catalog/catalog-layer-insert';
import type { LayerItem } from '../../../domain/selection/selection-model';
import type { EditorSnapshot } from '../../../domain/session';

export function canEditCatalogLayerItem(item: LayerItem, snap: EditorSnapshot): boolean {
  return !item.virtual && item.documentId === snap.openId;
}

export function canDeleteCatalogLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  const rootId = snap.openDefinition?.root.uuid;
  return canEditCatalogLayerItem(item, snap) && item.id !== rootId;
}

export function canInsertInsideCatalogLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  if (!canEditCatalogLayerItem(item, snap)) return false;
  return catalogLayerInsertEntriesForLayer(snap, item, 'inside').length > 0;
}

export function canInsertBelowCatalogLayer(item: LayerItem, snap: EditorSnapshot): boolean {
  if (!canEditCatalogLayerItem(item, snap) || item.id === snap.openDefinition?.root.uuid) {
    return false;
  }
  return catalogLayerInsertEntriesForLayer(snap, item, 'below').length > 0;
}
