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
export { matchingSchemaIndex } from './json-schema-value.js';
export { eventDataMappings, eventDataSchema } from './schema-use.js';
export {
  resolveChildFieldDefinition,
  validateCatalog,
  type ValidateCatalogOptions,
} from './catalog.js';
export {
  automaticFieldGroupsFor,
  componentDataSchema,
  exposedFields,
  matchesSchemaValue,
  publicFieldsFor,
  resolveComponentContract,
  selectStructuralChild,
  structuralCaseValue,
  structuralChildSchemas,
  structuralNodeFields,
  structuralNodeSchema,
  structuralScopeFields,
} from './catalog-exposed.js';
export {
  type StructuralChildSchema,
  type StructuralInstance,
  type StructuralSelection,
  type StructuralNodeInput,
} from './structural-nodes.js';
export type {
  AutomaticFieldGroup,
  ContractCatalog,
  ContractDocument,
  ContractResolverInput,
  SchemaResolverContext,
} from './types.js';
