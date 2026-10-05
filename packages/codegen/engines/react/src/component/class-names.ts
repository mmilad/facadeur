import {
  documentClassNames,
  resolveVariantDocument,
  variantPresets,
  type DocumentFile,
  type NestedNode,
} from '@facadeur/core';

/** One deterministic CSS Modules export per element emitted by a component. */
export function localClassNames(document: DocumentFile): Map<string, string> {
  const names = documentClassNames(document);
  if (document.root.type === 'repeater' || document.root.type === 'switch') {
    names.set(document.root.id, 'root');
  }
  return names;
}

export function moduleClassExpression(className: string): string {
  return `styles[${JSON.stringify(className)}]`;
}

/** Stable public placement hooks, qualified by their owning generated component. */
export function placementClassName(component: string, localClass: string) {
  return `${component}__${localClass}`;
}

export function instancePlacements(document: DocumentFile, component: string) {
  const names = localClassNames(document);
  const placements = new Map<string, { component: string; className: string }>();
  const visit = (node: NestedNode): void => {
    if (node.type === 'instance')
      placements.set(node.id, {
        component: node.component,
        className: placementClassName(component, names.get(node.id)!),
      });
    if (node.type === 'frame' || node.type === 'repeater' || node.type === 'switch') {
      for (const child of node.children ?? []) visit(child);
    }
  };
  for (const variant of variantDocuments(document)) visit(variant.root);
  return placements;
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
  if (node.type !== 'frame' && node.type !== 'repeater' && node.type !== 'switch') return;
  for (const child of node.children ?? []) collectInstances(child, ids);
}
