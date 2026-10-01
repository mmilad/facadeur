/**
 * Compatibility facade for the core validation API.
 *
 * Implementation lives under `validation/` by responsibility; this module
 * remains the stable internal import used by commands and external consumers.
 */
export { compileDocumentValidator, validateDocumentFile } from './validation/schema.js';
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
} from './validation/assertions.js';
export { assertDefinitionKind, validateDefinitions } from './validation/definitions.js';
export { validateLibraries, validateTree, type ValidateOptions } from './validation/tree.js';
export { resolveChildFieldDefinition, validateCatalog } from './validation/catalog.js';
