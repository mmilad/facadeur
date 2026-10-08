import type { FlatNode, NodeModel } from '@facadeur/core';
import type { LayerItem } from '../selection/selection-model';

function layerTypeForNode(node: NodeModel): FlatNode['type'] {
  if (node.config?.definitionRef) return 'instance';
  const tag = node.dom.tagName.toLowerCase();
  if (tag === 'img') return 'image';
  if (tag === 'text' || tag === 'span' || tag === 'p' || tag === 'label') return 'text';
  return 'frame';
}

function layerNameForNode(node: NodeModel): string {
  const named = node.data?.name ?? node.dom.data?.name;
  if (typeof named === 'string' && named.trim()) return named.trim();
  const tag = node.dom.tagName.toLowerCase();
  if (tag === 'img') return 'Image';
  if (tag === 'div') return 'Root';
  return node.dom.tagName;
}

/** Layer tree for the open catalog definition (node uuids + `v2:` render addresses). */
export function catalogLayerTree(definitionUuid: string, root: NodeModel): LayerItem {
  const visit = (node: NodeModel): LayerItem => ({
    id: node.uuid,
    address: `v2:${node.uuid}`,
    documentId: definitionUuid,
    name: layerNameForNode(node),
    type: layerTypeForNode(node),
    children: (node.dom.children ?? []).map(visit),
    virtual: false,
    fieldEditable: false,
  });
  return visit(root);
}
