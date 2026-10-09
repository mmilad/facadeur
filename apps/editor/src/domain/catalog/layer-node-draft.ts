import { createCatalogUuid, type NodeModel } from '@facadeur/core';
import type { LayerInsertEntry } from '../layer-insert-policy';

/** New catalog tree node for a layer insert menu entry. */
export function catalogNodeFromInsertEntry(entry: LayerInsertEntry): NodeModel | null {
  const uuid = createCatalogUuid();
  if (entry.kind === 'primitive') {
    if (entry.tool === 'frame') {
      return { uuid, name: 'layer', dom: { tagName: 'div', children: [] } };
    }
    return null;
  }
  if (entry.kind === 'structural') return null;
  return {
    uuid,
    name: entry.label,
    dom: { tagName: 'div', children: [] },
    config: { definitionRef: entry.assetId },
  };
}
