import {
  resolveVariantDocument,
  variantPresets,
  type DocumentFile,
  type NestedNode,
} from '@facadeur/core';
import { instanceTargetSelector } from './instance-target';

/** Resolve an owner-relative rendered path through local frames and instance roots. */
export function resolveNestedStyleTarget(
  document: DocumentFile,
  targetPath: string,
  catalog: readonly DocumentFile[],
): Extract<NestedNode, { type: 'instance' }> | undefined {
  const documents = new Map(catalog.map((entry) => [entry.id, entry]));
  const segments = targetPath.split('/');
  return resolvePath(document.root, 0, false);

  function resolvePath(
    current: NestedNode,
    index: number,
    crossedInstance: boolean,
  ): Extract<NestedNode, { type: 'instance' }> | undefined {
    if (index === segments.length) {
      return crossedInstance && current.type === 'instance' ? current : undefined;
    }
    const segment = segments[index];
    if (current.type === 'frame') {
      for (const child of current.children ?? []) {
        if (child.id !== segment) continue;
        const target = resolvePath(child, index + 1, crossedInstance);
        if (target) return target;
      }
      return undefined;
    }
    if (current.type !== 'instance') return undefined;
    const owner = documents.get(current.component);
    if (!owner) return undefined;
    const selected = current.variants?.variant;
    const variants = selected
      ? [selected]
      : ['default', ...variantPresets(owner).map((variant) => variant.name)];
    for (const name of variants) {
      const root = resolveVariantDocument(owner, name).root;
      if (root.type !== 'frame') continue;
      for (const child of root.children ?? []) {
        if (child.id !== segment) continue;
        const target = resolvePath(child, index + 1, true);
        if (target) return target;
      }
    }
    return undefined;
  }
}

/** Build an exact rendered-child chain so same-id nodes in other instances cannot match. */
export function nestedStyleTargetSelector(
  document: DocumentFile,
  targetPath: string,
  node: Extract<NestedNode, { type: 'instance' }>,
  address: 'instance' | 'canvas',
  rootRendered = false,
): string {
  const canvasPath = rootRendered ? `${document.root.id}/${targetPath}` : targetPath;
  return instanceTargetSelector(document.id, targetPath, node.component, address, canvasPath);
}
