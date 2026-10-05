import { resolveVariantDocument, variantPresets, type DocumentFile } from '@facadeur/core';
import { CodegenError } from '../names';
import { variantTypeSpecs } from './catalog';
import type { LocalClassNames } from './types';
import { printComponentFile, printComponentIndex, printRootElement, printTypesFile } from './print';
import { renderNode } from './render';
import type { CatalogEntry, ComponentFile, ComponentImport } from './types';

export type { ComponentFile, ComponentImport, PropSpec, VariantTypeSpec } from './types';
export { assignCatalog } from './catalog';

export function renderComponent(
  document: DocumentFile,
  catalog: Map<string, CatalogEntry>,
  options: { classNames: LocalClassNames },
): ComponentFile {
  const entry = catalog.get(document.id);
  if (!entry) throw new CodegenError(`Missing catalog entry for "${document.id}"`);
  const variantTypes = variantTypeSpecs(document, entry);
  const imports = new Map<string, ComponentImport>();
  const usedProps = new Set<string>();
  let usesCssProperties = false;
  let usesStructuralNodes = false;
  const acceptsChildFields = entry.acceptsChildFields === true;
  const names = entry.namedVariant
    ? [
        'default',
        ...variantPresets(document)
          .filter((variant) => variant.name !== 'default')
          .map((variant) => variant.name),
      ]
    : ['default'];
  const roots = names.map((name) => {
    const effective = resolveVariantDocument(document, name);
    const dataScope = new Map([
      ['item', '(context?.item as any)'],
      ['index', 'context?.index'],
      ['parent', '(context?.parent as any)'],
      ['$repeatScope', 'context'],
    ]);
    if (effective.root.type !== 'switch') {
      dataScope.set('$effectiveProps', 'true');
      dataScope.set('props', '__facadeurEffectiveProps');
    }
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
      dataScope,
      acceptsChildFields ? entry.childFieldsProp : undefined,
      options.classNames,
      () => {
        usesStructuralNodes = true;
      },
    );
  });
  const body = entry.namedVariant
    ? renderVariantBranches(roots, names, entry.namedVariant.name)
    : printRootElement(roots[0]!, 2);
  const usesContext = usedProps.has('$context');
  const props = [
    ...(entry.namedVariant ? [entry.namedVariant] : []),
    ...entry.fields.values(),
    ...entry.variants.values(),
    ...entry.events.values(),
  ];
  const printed = {
    id: document.id,
    component: entry.component,
    props,
    variantTypes,
    imports: [...imports.values()].sort((left, right) => left.from.localeCompare(right.from, 'en')),
    usesCssProperties,
    usesFragment: usesStructuralNodes,
    acceptsChildFields,
    childFieldsPropName: entry.childFieldsProp ?? 'childFields',
    usedProps,
    usesContext,
    dataContract: entry.dataContract,
    body,
  };
  return {
    id: document.id,
    component: entry.component,
    directory: `components/${entry.component}`,
    props,
    variantTypes,
    imports: [...imports.values()],
    usesCssProperties,
    acceptsChildFields,
    usesContext,
    componentContents: printComponentFile(printed),
    typesContents: printTypesFile(printed),
    indexContents: printComponentIndex(printed),
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
  return `\n${printRootElement(root, 2)}\n  `;
}
