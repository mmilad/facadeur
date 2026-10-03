import {
  documentClassNames,
  resolveVariantDocument,
  variantPresets,
  type DocumentFile,
  type NestedNode,
} from '@facadeur/core';

/** One deterministic CSS Modules export per element emitted by a component. */
export function localClassNames(document: DocumentFile): Map<string, string> {
  return documentClassNames(document);
}

export function moduleClassExpression(className: string): string {
  return `styles[${JSON.stringify(className)}]`;
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

function collectInstances(node: NestedNode, ids: Set<string>): void {
  if (node.type === 'instance') ids.add(node.id);
  if (node.type !== 'frame') return;
  for (const child of node.children ?? []) collectInstances(child, ids);
}
