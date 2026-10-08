import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { findDefinition, findNodeByUuid } from './ops';

const LEAF_TAGS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);

export function canAcceptCatalogChildren(node: Node): boolean {
  return !LEAF_TAGS.has(node.dom.tagName.toLowerCase());
}

export function findParentOfNode(
  root: Node,
  uuid: string,
): { parent: Node; index: number } | null {
  for (let index = 0; index < (root.dom.children ?? []).length; index += 1) {
    const child = root.dom.children![index]!;
    if (child.uuid === uuid) return { parent: root, index };
    const nested = findParentOfNode(child, uuid);
    if (nested) return nested;
  }
  return null;
}

export function insertCatalogNode(
  catalog: ProjectCatalog,
  definitionUuid: string,
  parentUuid: string,
  index: number,
  node: Node,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  const parent = findNodeByUuid(located.definition.root, parentUuid);
  if (!parent || !canAcceptCatalogChildren(parent)) return catalog;

  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]! as NodeDefinition;
  const targetParent = findNodeByUuid(definition.root, parentUuid);
  if (!targetParent) return catalog;

  const children = [...(targetParent.dom.children ?? [])];
  const clamped = Math.max(0, Math.min(index, children.length));
  children.splice(clamped, 0, node);
  (targetParent.dom as { children?: Node[] }).children = children;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = definition;
  return next;
}

export function isInsideCatalogSubtree(root: Node, ancestorUuid: string, nodeUuid: string): boolean {
  if (ancestorUuid === nodeUuid) return true;
  const ancestor = findNodeByUuid(root, ancestorUuid);
  if (!ancestor) return false;
  const stack = [...(ancestor.dom.children ?? [])];
  while (stack.length) {
    const next = stack.pop();
    if (!next) continue;
    if (next.uuid === nodeUuid) return true;
    stack.push(...(next.dom.children ?? []));
  }
  return false;
}

function detachCatalogNode(root: Node, nodeUuid: string): Node | null {
  if (root.uuid === nodeUuid) return null;
  const parentInfo = findParentOfNode(root, nodeUuid);
  if (!parentInfo) return null;
  const node = parentInfo.parent.dom.children![parentInfo.index]!;
  const siblings = [...(parentInfo.parent.dom.children ?? [])];
  siblings.splice(parentInfo.index, 1);
  (parentInfo.parent.dom as { children?: Node[] }).children = siblings;
  return node;
}

export function moveCatalogNode(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  newParentUuid: string,
  index: number,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  if (located.definition.root.uuid === nodeUuid) return catalog;
  if (isInsideCatalogSubtree(located.definition.root, nodeUuid, newParentUuid)) return catalog;

  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]! as NodeDefinition;
  const node = detachCatalogNode(definition.root, nodeUuid);
  if (!node) return catalog;

  const newParent = findNodeByUuid(definition.root, newParentUuid);
  if (!newParent || !canAcceptCatalogChildren(newParent)) return catalog;

  const children = [...(newParent.dom.children ?? [])];
  const clamped = Math.max(0, Math.min(index, children.length));
  children.splice(clamped, 0, node);
  (newParent.dom as { children?: Node[] }).children = children;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = definition;
  return next;
}

export function removeCatalogNode(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  if (located.definition.root.uuid === nodeUuid) return catalog;

  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]! as NodeDefinition;
  const parentInfo = findParentOfNode(definition.root, nodeUuid);
  if (!parentInfo) return catalog;

  const siblings = [...(parentInfo.parent.dom.children ?? [])];
  siblings.splice(parentInfo.index, 1);
  (parentInfo.parent.dom as { children?: Node[] }).children = siblings;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = definition;
  return next;
}
