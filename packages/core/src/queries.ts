// Public read/query surface. Implementations remain owned by their catalog and token domains.
export {
  definitionDisplayName,
  definitionSummaries,
  effectiveNodeTagName,
} from './controller/project/catalog/queries';
import {
  tokenByReference as tokenInTreeByReference,
  tokenByUuid as tokenInTreeByUuid,
  tokenReferencePaths as tokenPathsInTree,
} from './controller/style/tokens/global/query';
export { fontFamilyTokens, tokenReferencesByType } from './controller/style/tokens/global/query';
export { activeBreakpoints, configuredBreakpoints } from './tokens/resolve';

import type { GlobalStyleBlock, ProjectCatalog, StyleLayer } from '@facadeur/domain';
import { tokenCustomProperty } from './tokens/names';
import { readTokenTree } from './controller/style/tokens/global/tree';
import { tokenReferenceValue } from './controller/style/tokens/syntax';

/** Compose Catalog style declarations and token choices for Editor read consumers. */
export function projectStyleSuggestions(catalog: ProjectCatalog) {
  const valuesByKey = new Map<string, Set<string>>();
  const tokenOptions = [...readTokenTree(catalog.tokens ?? {}).tokens.values()].map((token) => ({
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
    options: tokenOptions,
  };

  function addResponsiveLayers(layer: Pick<GlobalStyleBlock, 'variants' | 'breakpoints'>) {
    for (const values of Object.values(layer.variants ?? {})) {
      for (const variant of Object.values(values)) addLayer(variant);
    }
    for (const breakpoint of Object.values(layer.breakpoints ?? {})) addLayer(breakpoint);
  }
}

/** Read a token by UUID from Catalog data, preserving the token parser's inferred result type. */
export function tokenByUuid(catalog: ProjectCatalog, uuid: string) {
  return tokenInTreeByUuid(catalog.tokens ?? {}, uuid);
}

/** Resolve a Catalog token reference with the same parser used by Style token operations. */
export function tokenByReference(catalog: ProjectCatalog, value: unknown) {
  return tokenInTreeByReference(catalog.tokens ?? {}, value);
}

/** Return sorted token paths that use a UUID in values or breakpoint overrides. */
export function tokenReferencePaths(catalog: ProjectCatalog, uuid: string) {
  return tokenPathsInTree(catalog.tokens ?? {}, uuid);
}

// Shared Core lookups used across domain boundaries. Keep writes in their owning command modules.
export {
  classListFromNode,
  findDefinition,
  findNodeByUuid,
  resolveJsonSchemaForDefinition,
} from './controller/project/catalog/ops';
export {
  defaultFieldExposure,
  effectiveSchemaForDefinition,
  inheritableSchemaForDefinition,
} from './controller/project/catalog/field-contract';
export { componentPropsForSchema } from './controller/project/catalog/field-ids';
export { canAcceptCatalogChildren, findParentOfNode } from './controller/project/catalog/tree-ops';
export { readTokenTree } from './controller/style/tokens/global/tree';
export { tokenReference } from './controller/style/tokens/syntax';
