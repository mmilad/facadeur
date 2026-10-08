import type { FlatDocument, FrameNode, StructuralNode } from './flat-types';

export function findParent(doc: FlatDocument, id: string): FrameNode | StructuralNode | undefined {
  for (const node of Object.values(doc.nodes)) {
    if (
      (node.type === 'frame' || node.type === 'repeater' || node.type === 'switch') &&
      node.children.includes(id)
    )
      return node;
  }
  return undefined;
}

export function collectSubtree(doc: FlatDocument, id: string): string[] {
  const ids: string[] = [];
  const walk = (current: string) => {
    ids.push(current);
    const node = doc.nodes[current];
    if (node && 'children' in node) {
      for (const child of node.children) walk(child);
    }
  };
  walk(id);
  return ids;
}

export function isInsideSubtree(doc: FlatDocument, ancestorId: string, nodeId: string): boolean {
  if (ancestorId === nodeId) return true;
  const ancestor = doc.nodes[ancestorId];
  if (!ancestor || !('children' in ancestor)) return false;
  const stack = [...ancestor.children];
  while (stack.length) {
    const next = stack.pop();
    if (!next) continue;
    if (next === nodeId) return true;
    const node = doc.nodes[next];
    if (node && 'children' in node) stack.push(...node.children);
  }
  return false;
}
