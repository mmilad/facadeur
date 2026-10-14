/** Current ProjectCatalog validation and shared JSON-schema value matching. */
export {
  assertCatalogRefIntegrity,
  emptyProjectCatalog,
  validateProjectCatalog,
} from '../project/catalog/validate';
export { matchesSchemaValue } from './json-schema-value';
