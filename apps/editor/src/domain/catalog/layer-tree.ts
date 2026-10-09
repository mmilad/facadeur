import {
  findDefinition,
  type FlatNode,
  type NodeModel,
  type ProjectCatalogModel,
} from '@facadeur/core';
import type { LayerItem } from '../selection/selection-model';

function layerTypeForNode(node: NodeModel): FlatNode['type'] | 'layer' {
  if (node.config?.definitionRef) return 'instance';
  return 'layer';
}

function layerNameForNode(node: NodeModel, root: boolean): string {
  if (root) return 'root';
  if (node.name?.trim()) return node.name.trim();
  const legacyName = node.data?.name ?? node.dom.data?.name;
  if (typeof legacyName === 'string' && legacyName.trim()) return legacyName.trim();
  return node.dom.tagName;
}

/** Layer tree for the open catalog definition (node uuids + `v2:` render addresses). */
export function catalogLayerTree(
  definitionUuid: string,
  root: NodeModel,
  catalog: ProjectCatalogModel,
): LayerItem {
  const visit = (node: NodeModel, isRoot = false): LayerItem => ({
    id: node.uuid,
    address: `v2:${node.uuid}`,
    documentId: definitionUuid,
    name: layerNameForNode(node, isRoot),
    tagName: tagNameForNode(node, catalog),
    type: layerTypeForNode(node),
    children: (node.dom.children ?? []).map((child) => visit(child)),
    virtual: false,
    fieldEditable: false,
  });
  return visit(root, true);
}

function tagNameForNode(node: NodeModel, catalog: ProjectCatalogModel, seen = new Set<string>()) {
  const definitionRef = node.config?.definitionRef;
  if (!definitionRef || seen.has(definitionRef)) return node.dom.tagName;
  const target = findDefinition(catalog, definitionRef)?.definition;
  if (!target) return node.dom.tagName;
  const nextSeen = new Set(seen).add(definitionRef);
  return tagNameForNode(target.root, catalog, nextSeen);
}
