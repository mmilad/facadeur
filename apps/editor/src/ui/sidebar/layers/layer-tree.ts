import type { LayerItem } from '../../../domain/selection/selection-model.js';

export function findLayerByAddress(
  root: LayerItem | null,
  address: string,
): LayerItem | null {
  if (!root) return null;
  if (root.address === address) return root;
  for (const child of root.children) {
    const match = findLayerByAddress(child, address);
    if (match) return match;
  }
  return null;
}
