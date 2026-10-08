export {
  reconcileLegacySchemaSnapshot,
  addMissingLegacyFields,
  addMissingReferencedSchemas,
} from './reconcile';
export { schemaUseFromAssignment, isSchemaFieldUse, isComponentSchemaUse } from './assignment';
export { BUILTIN_SCHEMAS, DEFAULT_SCHEMA_ASSIGNMENTS } from './builtin-schemas';
export { validateProjectDesign } from './design-validation';
export type { SchemaLibraryState } from './types';
