import type { GlobalStyleRule, Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { createCatalogUuid } from '../../../document/ids';
import { findDefinition, findNodeByUuid } from './ops';

const LEAF_TAGS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);

export function canAcceptCatalogChildren(node: Node): boolean {
  return !LEAF_TAGS.has(node.dom.tagName.toLowerCase());
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
  const cloneResult = cloneCatalogSubtree(catalog, sourceDefinitionUuid, sourceNodeUuid);
  const targetParent = findNodeByUuid(target.definition.root, parentUuid);
  if (!cloneResult || !targetParent || !canAcceptCatalogChildren(targetParent)) return null;

  const next = structuredClone(catalog) as ProjectCatalog;
  const nextTarget = findDefinition(next, targetDefinitionUuid);
  const nextParent = nextTarget && findNodeByUuid(nextTarget.definition.root, parentUuid);
  if (!nextTarget || !nextParent) return null;
  const children = [...(nextParent.dom.children ?? [])];
  children.splice(Math.max(0, Math.min(index, children.length)), 0, cloneResult.node);
  (nextParent.dom as { children?: Node[] }).children = children;
  (next[nextTarget.kind] as Record<string, NodeDefinition>)[targetDefinitionUuid] =
    nextTarget.definition;

  return {
    catalog: appendCatalogStyleRules(next, cloneResult.styleRules),
    nodeUuid: cloneResult.node.uuid,
  };
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

  const idMap = new Map<string, string>();
  const node = cloneCatalogNodeTree(sourceNode, idMap);
  const styleRules = (catalog.globalStyles?.block?.rules ?? []).flatMap((rule, index) => {
    const bindings = Object.entries(rule.bindings ?? {});
    if (!bindings.length || !bindings.every(([, uuid]) => idMap.has(uuid))) return [];
    const originalNodeUuid = bindings[0]![1];
    const clonedNodeUuid = idMap.get(originalNodeUuid)!;
    return [
      {
        ...structuredClone(rule),
        id:
          rule.id === `layer-${originalNodeUuid}`
            ? `layer-${clonedNodeUuid}`
            : `layer-${clonedNodeUuid}-${index}`,
        bindings: Object.fromEntries(
          bindings.map(([className, uuid]) => [className, idMap.get(uuid)!]),
        ),
      },
    ];
  });
  return { node, styleRules };
}

function appendCatalogStyleRules(catalog: ProjectCatalog, styleRules: readonly GlobalStyleRule[]) {
  if (!styleRules.length) return catalog;
  const rules = catalog.globalStyles?.block?.rules ?? [];
  const block = { ...(catalog.globalStyles?.block ?? {}), rules: [...rules, ...styleRules] };
  return { ...catalog, globalStyles: { ...(catalog.globalStyles ?? {}), block } };
}

function cloneCatalogNodeTree(node: Node, idMap: Map<string, string>): Node {
  const uuid = createCatalogUuid();
  idMap.set(node.uuid, uuid);
  return {
    ...node,
    uuid,
    dom: {
      ...node.dom,
      ...(node.dom.children
        ? { children: node.dom.children.map((child) => cloneCatalogNodeTree(child, idMap)) }
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
  const removedNode = findNodeByUuid(located.definition.root, nodeUuid);
  if (!removedNode) return catalog;
  const removedUuids = collectSubtreeUuids(removedNode);

  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]! as NodeDefinition;
  const parentInfo = findParentOfNode(definition.root, nodeUuid);
  if (!parentInfo) return catalog;

  const siblings = [...(parentInfo.parent.dom.children ?? [])];
  siblings.splice(parentInfo.index, 1);
  (parentInfo.parent.dom as { children?: Node[] }).children = siblings;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = definition;
  return pruneRemovedNodeStyles(next, removedUuids);
}

function collectSubtreeUuids(root: Node) {
  const uuids = new Set<string>();
  const visit = (node: Node) => {
    uuids.add(node.uuid);
    for (const child of node.dom.children ?? []) visit(child);
  };
  visit(root);
  return uuids;
}

function pruneRemovedNodeStyles(catalog: ProjectCatalog, removedUuids: ReadonlySet<string>) {
  const currentBlock = catalog.globalStyles?.block;
  if (!currentBlock) return catalog;

  const children = Object.fromEntries(
    Object.entries(currentBlock.children ?? {}).filter(
      ([path]) => !path.split('/').some((uuid) => removedUuids.has(uuid)),
    ),
  );
  const rules = (currentBlock.rules ?? []).filter(
    (rule) => !Object.values(rule.bindings ?? {}).some((uuid) => removedUuids.has(uuid)),
  );
  if (
    Object.keys(children).length === Object.keys(currentBlock.children ?? {}).length &&
    rules.length === (currentBlock.rules ?? []).length
  ) {
    return catalog;
  }

  const block = { ...currentBlock };
  if (Object.keys(children).length) block.children = children;
  else delete block.children;
  if (rules.length) block.rules = rules;
  else delete block.rules;

  const globalStyles = { ...catalog.globalStyles };
  if (Object.keys(block).length) globalStyles.block = block;
  else delete globalStyles.block;
  return { ...catalog, globalStyles };
}
