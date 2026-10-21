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

import type { ProjectCatalog } from '@facadeur/domain';

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
