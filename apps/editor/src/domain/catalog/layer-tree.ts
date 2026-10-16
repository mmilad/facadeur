import {
  canAcceptCatalogChildren,
  type CoreController,
  type NodeDefinitionModel,
  type NodeModel,
} from '@facadeur/core';
import type { ProjectCatalog } from '@facadeur/domain';

export interface LayerItem {
  id: string;
  /** Catalog UUID render address. */
  address: string;
  /** Definition that owns the Catalog node. */
  documentId: string;
  name: string;
  tagName?: string;
  type: string;
  canAcceptChildren: boolean;
  children: LayerItem[];
  virtual: boolean;
  ownerNodeId?: string;
  instancePath?: string;
  fieldEditable: boolean;
}

function layerTypeForNode(node: NodeModel) {
  if (node.config?.composition) return node.config.composition.kind;
  if (node.config?.definitionRefBinding) return 'instance';
  if (node.config?.definitionRef) return 'instance';
  return 'layer';
}

function layerNameForNode(node: NodeModel, root: boolean): string {
  if (root) return 'root';
  if (node.name?.trim()) return node.name.trim();
  return node.dom.tagName ?? 'layer';
}

/** Layer tree for the open catalog definition (node UUID render addresses). */
export function catalogLayerTree(
  definition: NodeDefinitionModel,
  catalog: ProjectCatalog,
  core: CoreController,
): LayerItem {
  const visit = (node: NodeModel, isRoot = false): LayerItem => ({
    id: node.uuid,
    address: `node:${node.uuid}`,
    documentId: definition.uuid,
    name: layerNameForNode(node, isRoot),
    ...(node.config?.composition?.kind === 'repeater'
      ? {}
      : { tagName: core.getEffectiveNodeTagName(node.uuid) ?? node.dom.tagName }),
    type: layerTypeForNode(node),
    canAcceptChildren: canAcceptCatalogChildren(node, catalog),
    children: (node.dom.children ?? []).map((child) => visit(child)),
    virtual: false,
    fieldEditable: false,
  });
  return visit(definition.root, true);
}
