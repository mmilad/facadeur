import type { LayerItem } from '../../../domain/catalog/layer-tree';
import type { EditorSnapshot } from '../../../domain/session';

export function canEditLayerItem(item: LayerItem, snap: EditorSnapshot) {
  return !item.virtual && item.documentId === snap.openId;
}
