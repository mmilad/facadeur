import type { DocumentFile } from '@facadeur/core';
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
  const root = renderNode(document, document.root, catalog, entry, true, imports, usedProps, () => {
    usesCssProperties = true;
  });
  const props = [...entry.fields.values(), ...entry.variants.values()];
  const contents = printFile({
    id: document.id,
    component: entry.component,
    props,
    variantTypes,
    imports: [...imports.values()].sort((left, right) => left.from.localeCompare(right.from, 'en')),
    usesCssProperties,
    usedProps,
    body: printElement(root, 2),
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
