import { createCatalogUuid, type NodeModel } from '@facadeur/core';
import type { LayerInsertEntry } from '../layer-insert-policy';

/** New catalog tree node for a layer insert menu entry. */
export function catalogNodeFromInsertEntry(entry: LayerInsertEntry): NodeModel | null {
  const uuid = createCatalogUuid();
  if (entry.kind === 'primitive') {
    if (entry.tool === 'frame') {
      return { uuid, dom: { tagName: 'div', children: [] } };
    }
    if (entry.tool === 'text') {
      return {
        uuid,
        dom: { tagName: 'span', properties: { textContent: 'Text' } },
      };
    }
    if (entry.tool === 'image') {
      return {
        uuid,
        dom: {
          tagName: 'img',
          attributes: {
            src: 'https://placehold.co/400x300',
            alt: 'Image',
          },
        },
      };
    }
    return null;
  }
  if (entry.kind === 'structural') return null;
  return {
    uuid,
    dom: { tagName: 'div', children: [] },
    config: { definitionRef: entry.assetId },
  };
}
