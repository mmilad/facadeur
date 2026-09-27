import { resolveVariantDocument, variantPresets, type DocumentFile } from '@facadeur/core';
import { CodegenError } from '../names.js';
import { variantTypeSpecs } from './catalog.js';
import { printElement, printFile } from './print.js';
import { renderNode } from './render.js';
import type { CatalogEntry, ComponentFile, ComponentImport } from './types.js';

export type { ComponentFile, ComponentImport, PropSpec, VariantTypeSpec } from './types.js';
export { assignCatalog } from './catalog.js';

export function renderComponent(
  document: DocumentFile,
  catalog: Map<string, CatalogEntry>,
): ComponentFile {
  const entry = catalog.get(document.id);
  if (!entry) throw new CodegenError(`Missing catalog entry for "${document.id}"`);
  const variantTypes = variantTypeSpecs(document, entry);
  const imports = new Map<string, ComponentImport>();
  const usedProps = new Set<string>();
  let usesCssProperties = false;
  const names = entry.namedVariant
    ? ['default', ...variantPresets(document).filter((variant) => variant.name !== 'default').map((variant) => variant.name)]
    : ['default'];
  const roots = names.map((name) => {
    const effective = resolveVariantDocument(document, name);
    return renderNode(
      effective,
      effective.root,
      catalog,
      entry,
      true,
      imports,
      usedProps,
      () => {
        usesCssProperties = true;
      },
    );
  });
  const body = entry.namedVariant
    ? renderVariantBranches(roots, names, entry.namedVariant.name)
    : printElement(roots[0]!, 2);
  const props = [
    ...(entry.namedVariant ? [entry.namedVariant] : []),
    ...entry.fields.values(),
    ...entry.variants.values(),
    ...entry.events.values(),
  ];
  const contents = printFile({
    id: document.id,
    component: entry.component,
    props,
    variantTypes,
    imports: [...imports.values()].sort((left, right) => left.from.localeCompare(right.from, 'en')),
    usesCssProperties,
    usedProps,
    body,
  });
  return {
    id: document.id,
    component: entry.component,
    path: `components/${entry.component}.tsx`,
    props,
    variantTypes,
    imports: [...imports.values()],
    usesCssProperties,
    contents,
  };
}

function renderVariantBranches(
  roots: readonly ReturnType<typeof renderNode>[],
  names: readonly string[],
  prop: string,
): string {
  let expression = `(${quoteBranch(roots[0]!)})`;
  for (let index = 1; index < roots.length; index += 1) {
    const root = roots[index];
    const name = names[index];
    if (!root || !name) continue;
    expression = `${prop} === '${name}' ? (${quoteBranch(root)}) : ${expression}`;
  }
  return `  ${expression}`;
}

function quoteBranch(root: ReturnType<typeof renderNode>): string {
  return `\n${printElement(root, 2)}\n  `;
}
