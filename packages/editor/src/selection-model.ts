import { findParent, type FlatDocument, type FlatNode } from '@facadeur/core';

export interface LayerItem {
  id: string;
  name: string;
  type: FlatNode['type'];
  children: LayerItem[];
}

/**
 * Map a rendered `data-id` to the node that belongs to this document.
 * A path that continues inside an instance stops at that instance.
 */
export function nodeIdForHit(
  doc: FlatDocument,
  renderedId: string,
  paintRoot: boolean,
): string | null {
  const parts = renderedId.split('/').filter((part) => part.length > 0);
  const first = parts[0];
  if (!first) return null;
  const root = doc.nodes[doc.rootId];
  if (!root) return null;
  if (root.type !== 'frame' || paintRoot) {
    if (first !== root.id) return null;
    return descend(doc, root.id, parts, 0);
  }
  if (!root.children.includes(first)) return null;
  return descend(doc, first, parts, 0);
}

/** Rendered `data-id` for a node in this document, or null when it is the unpainted canvas. */
export function renderIdForNode(
  doc: FlatDocument,
  nodeId: string,
  paintRoot: boolean,
): string | null {
  const root = doc.nodes[doc.rootId];
  if (!root) return null;
  if (nodeId === doc.rootId) {
    if (root.type !== 'frame' || paintRoot) return root.id;
    return null;
  }
  const chain: string[] = [];
  let current: string | null = nodeId;
  const guard = new Set<string>();
  while (current && current !== doc.rootId) {
    if (guard.has(current)) return null;
    guard.add(current);
    chain.push(current);
    const parent = findParent(doc, current);
    if (!parent) return null;
    current = parent.id;
  }
  if (current !== doc.rootId) return null;
  chain.reverse();
  if (root.type !== 'frame' || paintRoot) chain.unshift(doc.rootId);
  return chain.join('/');
}

export function layerTree(doc: FlatDocument): LayerItem | null {
  const root = doc.nodes[doc.rootId];
  if (!root) return null;
  return layerItem(doc, root);
}

function descend(doc: FlatDocument, id: string, parts: string[], index: number): string | null {
  if (parts[index] !== id) return null;
  const node = doc.nodes[id];
  if (!node) return null;
  const next = parts[index + 1];
  if (!next || node.type !== 'frame' || !node.children.includes(next)) return id;
  return descend(doc, next, parts, index + 1) ?? id;
}

function layerItem(doc: FlatDocument, node: FlatNode): LayerItem {
  const children = node.type === 'frame' ? node.children : [];
  return {
    id: node.id,
    name: layerName(node),
    type: node.type,
    children: children.flatMap((id) => {
      const child = doc.nodes[id];
      return child ? [layerItem(doc, child)] : [];
    }),
  };
}

function layerName(node: FlatNode): string {
  if (node.name) return node.name;
  if (node.type === 'instance') return node.component;
  if (node.type === 'text' && node.text) {
    const trimmed = node.text.trim();
    if (trimmed) return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
  }
  return node.id;
}
