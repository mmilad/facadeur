import type { GlobalStyleBlock, ProjectCatalog, StyleLayer } from '@facadeur/domain';
import { readTokenTree, tokenCustomProperty, tokenReferenceValue } from '@facadeur/core';

/** Compose Catalog style data into the suggestion options used by Editor controls. */
export function editorStyleSuggestions(catalog: ProjectCatalog) {
  const valuesByKey = new Map<string, Set<string>>();
  const options = [...readTokenTree(catalog.tokens ?? {}).tokens.values()].map((token) => ({
    value: tokenReferenceValue(token.uuid),
    label: tokenCustomProperty(token.path),
    description: token.path,
    group: 'Design tokens',
  }));
  const addDeclarations = (record: Readonly<Record<string, string>> | undefined) => {
    for (const [key, value] of Object.entries(record ?? {})) {
      if (!value.trim()) continue;
      const values = valuesByKey.get(key) ?? new Set<string>();
      values.add(value);
      valuesByKey.set(key, values);
    }
  };
  const addLayer = (layer: Pick<StyleLayer, 'declarations' | 'states'>) => {
    addDeclarations(layer.declarations);
    for (const declarations of Object.values(layer.states ?? {})) addDeclarations(declarations);
  };
  const block = catalog.globalStyles?.block;
  if (block) {
    addLayer(block);
    addResponsiveLayers(block);
    for (const rule of block.rules ?? []) {
      addLayer(rule);
      addResponsiveLayers(rule);
    }
  }

  return {
    keys: [...valuesByKey.keys()].sort((left, right) => left.localeCompare(right)),
    valuesByKey: Object.fromEntries(
      [...valuesByKey].map(([key, values]) => [
        key,
        [...values].sort((left, right) => left.localeCompare(right)),
      ]),
    ),
    options,
  };

  function addResponsiveLayers(layer: Pick<GlobalStyleBlock, 'variants' | 'breakpoints'>) {
    for (const values of Object.values(layer.variants ?? {})) {
      for (const variant of Object.values(values)) addLayer(variant);
    }
    for (const breakpoint of Object.values(layer.breakpoints ?? {})) addLayer(breakpoint);
  }
}
