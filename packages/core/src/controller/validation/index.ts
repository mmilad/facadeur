/**
 * Public validation boundary, re-exported by the Core package entry point.
 * Internal consumers import domain implementations and contracts directly.
 */
export { compileDocumentValidator, validateDocumentFile } from './schema';
export {
  assertCatalogRefIntegrity,
  emptyProjectCatalog,
  validateProjectCatalog,
} from '../project/catalog/validate';
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
} from './assertions';
export { assertDefinitionKind, validateDefinitions } from './definitions';
export { validateLibraries, validateTree } from './tree';
export { type ValidateOptions } from './types';
export { matchingSchemaIndex } from './json-schema-value';
export { eventDataMappings, eventDataSchema } from './schema-use';
export {
  resolveChildFieldDefinition,
  validateCatalog,
  type ValidateCatalogOptions,
} from './catalog';
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
} from './catalog-exposed';
export {
  type StructuralChildSchema,
  type StructuralInstance,
  type StructuralSelection,
  type StructuralNodeInput,
} from './structural-nodes';
export type {
  AutomaticFieldGroup,
  ContractCatalog,
  ContractDocument,
  ContractResolverInput,
  SchemaResolverContext,
} from './types';

export { fieldDataSchema } from './field-data-schema';
