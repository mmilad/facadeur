import type { NestedSelection } from './types.js';

/**
 * Nested appearance belongs to the owner document and is keyed by the local
 * instance path that reaches the selected instance root.
 */
export function nestedInstanceStyleTarget(
  selection: NestedSelection,
  ownerRootId: string,
): string | null {
  if (selection.node.type !== 'instance') return null;
  const renderedPath = selection.renderId.split('/').filter(Boolean);
  const relativePath = renderedPath[0] === ownerRootId ? renderedPath.slice(1) : renderedPath;
  if (relativePath.at(-1) !== selection.node.id) return null;
  return relativePath.join('/') || null;
}
