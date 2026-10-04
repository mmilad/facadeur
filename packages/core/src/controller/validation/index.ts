/**
 * Public validation boundary, re-exported by the Core package entry point.
 * Internal consumers import domain implementations and contracts directly.
 */
export { compileDocumentValidator, validateDocumentFile } from './schema.js';
export {
  assertAttributes,
  assertBindings,
  assertChildFields,
  assertDisplayOn,
  assertEventBindings,
  assertEventDefinition,
  assertExpose,
  assertFieldBindings,
  assertFieldDefinition,
  assertLayout,
  assertRepeat,
  assertValueMatches,
  assertVariantAxis,
  assertVariantPreset,
} from './assertions.js';
export { assertDefinitionKind, validateDefinitions } from './definitions.js';
export { validateLibraries, validateTree } from './tree.js';
export { type ValidateOptions } from './types.js';
export {
  resolveChildFieldDefinition,
  validateCatalog,
  type ValidateCatalogOptions,
} from './catalog.js';
export {
  automaticFieldGroupsFor,
  exposedFields,
  publicFieldsFor,
  resolveComponentContract,
} from './catalog-exposed.js';
export type {
  AutomaticFieldGroup,
  ContractCatalog,
  ContractDocument,
  ContractResolverInput,
  SchemaResolverContext,
} from './types.js';
