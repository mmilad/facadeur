import {
  resolveVariantDocument,
  variantPresets,
  type DocumentFile,
  type NestedNode,
} from '@facadeur/core';

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
  if (address === 'canvas') {
    const path = rootRendered ? `${document.root.id}/${targetPath}` : targetPath;
    const terminal = targetPath.split('/').at(-1) ?? '';
    return `[data-id="${cssString(path)}"][data-node="${cssString(terminal)}"][data-component="${cssString(node.component)}"][data-component="${cssString(node.component)}"]`;
  }
  const chain = targetPath
    .split('/')
    .map((id, index, parts) => {
      const base = `[data-node="${cssString(id)}"]`;
      return index === parts.length - 1
        ? `${base}[data-component="${cssString(node.component)}"][data-component="${cssString(node.component)}"]`
        : base;
    })
    .join(' > ');
  const scope = `[data-component="${cssString(document.id)}"] > `;
  return `${scope}${chain}`;
}

function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
