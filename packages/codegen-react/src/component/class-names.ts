import {
  resolveVariantDocument,
  variantPresets,
  type DocumentFile,
  type NestedNode,
} from '@facadeur/core';

/** One deterministic CSS Modules export per element emitted by a component. */
export function localClassNames(document: DocumentFile): Map<string, string> {
  const ids = new Set<string>();
  for (const variant of variantDocuments(document)) collect(variant.root, ids);

  const result = new Map<string, string>();
  const used = new Set<string>();
  for (const id of [...ids].sort((left, right) => left.localeCompare(right, 'en'))) {
    const stem = id.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^([^A-Za-z_])/, '_$1') || 'node';
    const base = `f_${stem}_${hash(id)}`;
    let name = base;
    let suffix = 2;
    while (used.has(name)) name = `${base}_${suffix++}`;
    used.add(name);
    result.set(id, name);
  }
  return result;
}

export function instanceNodeIds(document: DocumentFile): Set<string> {
  const ids = new Set<string>();
  for (const variant of variantDocuments(document)) collectInstances(variant.root, ids);
  return ids;
}

function variantDocuments(document: DocumentFile): DocumentFile[] {
  return ['default', ...variantPresets(document).map((variant) => variant.name)].map((name) =>
    resolveVariantDocument(document, name),
  );
}

function collect(node: NestedNode, ids: Set<string>): void {
  ids.add(node.id);
  if (node.type !== 'frame') return;
  for (const child of node.children ?? []) collect(child, ids);
}

function collectInstances(node: NestedNode, ids: Set<string>): void {
  if (node.type === 'instance') ids.add(node.id);
  if (node.type !== 'frame') return;
  for (const child of node.children ?? []) collectInstances(child, ids);
}

function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
}
