export {
  reconcileLegacySchemaSnapshot,
  addMissingLegacyFields,
  addMissingReferencedSchemas,
} from './reconcile.js';
export { schemaUseFromAssignment, isSchemaFieldUse, isComponentSchemaUse } from './assignment.js';
export { BUILTIN_SCHEMAS, DEFAULT_SCHEMA_ASSIGNMENTS } from './builtin-schemas.js';
export { validateProjectDesign } from './design-validation.js';
export type { SchemaLibraryState } from './types.js';
