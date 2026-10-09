import type { Node } from '@facadeur/domain';
import { stableTokenReference } from './catalog/tokens';

export function applyStyles(
  node: Node,
  styles: Readonly<Record<string, NonNullable<Node['style']>>>,
): Node {
  const children = node.dom.children?.map((child) => applyStyles(child, styles));
  return {
    ...node,
    ...(styles[node.uuid] ? { style: encodeStableTokenReferences(styles[node.uuid]) } : {}),
    dom: { ...node.dom, ...(children ? { children } : {}) },
  };
}

function encodeStableTokenReferences<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(
      /\{([^{}]+)\}/g,
      (reference, path: string) => stableTokenReference(path) ?? reference,
    ) as T;
  }
  if (Array.isArray(value)) return value.map(encodeStableTokenReferences) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, encodeStableTokenReferences(entry)]),
  ) as T;
}
