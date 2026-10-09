import type { Node } from '@facadeur/domain';

export function applyStyles(
  node: Node,
  styles: Readonly<Record<string, NonNullable<Node['style']>>>,
): Node {
  const children = node.dom.children?.map((child) => applyStyles(child, styles));
  return {
    ...node,
    ...(styles[node.uuid] ? { style: styles[node.uuid] } : {}),
    dom: { ...node.dom, ...(children ? { children } : {}) },
  };
}
