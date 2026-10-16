import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { isVoidHtmlTag } from '../../../document/html-tags';
import { createCatalogUuid } from '../../../document/ids';
import { findDefinition, findNodeByUuid } from './ops';

export function defaultChildrenSlotCount(definition: NodeDefinition) {
  let count = 0;
  const visit = (node: Node) => {
    if (node.config?.composition?.kind === 'slot') count += 1;
    for (const child of node.dom.children ?? []) visit(child);
  };
  visit(definition.root);
  return count;
}

export function canAcceptCatalogChildren(node: Node, catalog?: ProjectCatalog): boolean {
  const composition = node.config?.composition?.kind;
  if (composition === 'slot') return false;
  if (node.config?.definitionRef) {
    const target = catalog && findDefinition(catalog, node.config.definitionRef)?.definition;
    return Boolean(target && target.kind === 'component' && defaultChildrenSlotCount(target) === 1);
  }
  if (node.config?.definitionRefBinding) {
    const targets = Object.values(catalog?.components ?? {});
    return targets.length > 0 && targets.every((target) => defaultChildrenSlotCount(target) === 1);
  }
  if (composition === 'repeater' || composition === 'switch') {
    return !isVoidHtmlTag(node.dom.tagName);
  }
  return !isVoidHtmlTag(node.dom.tagName);
}

export function findParentOfNode(root: Node, uuid: string): { parent: Node; index: number } | null {
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
  if (!parent || !canAcceptCatalogChildren(parent, catalog)) return catalog;

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

export function duplicateCatalogNode(
  catalog: ProjectCatalog,
  sourceDefinitionUuid: string,
  sourceNodeUuid: string,
  targetDefinitionUuid: string,
  parentUuid: string,
  index: number,
): { catalog: ProjectCatalog; nodeUuid: string } | null {
  const target = findDefinition(catalog, targetDefinitionUuid);
  if (!target) return null;
  const clonedNode = cloneCatalogSubtree(catalog, sourceDefinitionUuid, sourceNodeUuid);
  const targetParent = findNodeByUuid(target.definition.root, parentUuid);
  if (!clonedNode || !targetParent || !canAcceptCatalogChildren(targetParent, catalog)) return null;

  const next = structuredClone(catalog) as ProjectCatalog;
  const nextTarget = findDefinition(next, targetDefinitionUuid);
  const nextParent = nextTarget && findNodeByUuid(nextTarget.definition.root, parentUuid);
  if (!nextTarget || !nextParent) return null;
  const children = [...(nextParent.dom.children ?? [])];
  children.splice(Math.max(0, Math.min(index, children.length)), 0, clonedNode);
  (nextParent.dom as { children?: Node[] }).children = children;
  (next[nextTarget.kind] as Record<string, NodeDefinition>)[targetDefinitionUuid] =
    nextTarget.definition;

  return { catalog: next, nodeUuid: clonedNode.uuid };
}

/** Clone a node subtree with fresh IDs and remap styles bound entirely within the subtree. */
function cloneCatalogSubtree(
  catalog: ProjectCatalog,
  sourceDefinitionUuid: string,
  sourceNodeUuid: string,
) {
  const source = findDefinition(catalog, sourceDefinitionUuid);
  const sourceNode = source && findNodeByUuid(source.definition.root, sourceNodeUuid);
  if (!sourceNode) return null;

  return cloneCatalogNodeTree(sourceNode);
}

function cloneCatalogNodeTree(node: Node): Node {
  const uuid = createCatalogUuid();
  return {
    ...node,
    uuid,
    dom: {
      ...node.dom,
      ...(node.dom.children
        ? { children: node.dom.children.map((child) => cloneCatalogNodeTree(child)) }
        : {}),
    },
  };
}

export function isInsideCatalogSubtree(
  root: Node,
  ancestorUuid: string,
  nodeUuid: string,
): boolean {
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
  if (!newParent || !canAcceptCatalogChildren(newParent, catalog)) return catalog;

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
  if (!findNodeByUuid(located.definition.root, nodeUuid)) return catalog;

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
