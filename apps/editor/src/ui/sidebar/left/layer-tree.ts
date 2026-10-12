import type { SidebarLayer } from '../../../domain/sidebar/types';

export function findLayerByAddress(root: SidebarLayer | null, address: string): SidebarLayer | null {
  if (!root) return null;
  if (root.address === address) return root;
  for (const child of root.children) {
    const match = findLayerByAddress(child, address);
    if (match) return match;
  }
  return null;
}
