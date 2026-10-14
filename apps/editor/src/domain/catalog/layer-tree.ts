import type { CoreController, NodeModel } from '@facadeur/core';

export interface LayerItem {
  id: string;
  /** Catalog UUID render address. */
  address: string;
  /** Definition that owns the Catalog node. */
  documentId: string;
  name: string;
  tagName?: string;
  type: string;
  children: LayerItem[];
  virtual: boolean;
  ownerNodeId?: string;
  instancePath?: string;
  fieldEditable: boolean;
}

function layerTypeForNode(node: NodeModel) {
  if (node.config?.definitionRef) return 'instance';
  return 'layer';
}

function layerNameForNode(node: NodeModel, root: boolean): string {
  if (root) return 'root';
  if (node.name?.trim()) return node.name.trim();
  return node.dom.tagName;
}

/** Layer tree for the open catalog definition (node UUID render addresses). */
export function catalogLayerTree(
  definitionUuid: string,
  root: NodeModel,
  core: CoreController,
): LayerItem {
  const visit = (node: NodeModel, isRoot = false): LayerItem => ({
    id: node.uuid,
    address: `node:${node.uuid}`,
    documentId: definitionUuid,
    name: layerNameForNode(node, isRoot),
    tagName: core.getEffectiveNodeTagName(node.uuid) ?? node.dom.tagName,
    type: layerTypeForNode(node),
    children: (node.dom.children ?? []).map((child) => visit(child)),
    virtual: false,
    fieldEditable: false,
  });
  return visit(root, true);
}
