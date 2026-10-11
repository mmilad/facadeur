/** Current ProjectCatalog validation and shared JSON-schema value matching. */
export {
  assertCatalogRefIntegrity,
  emptyProjectCatalog,
  validateProjectCatalog,
} from '../project/catalog/validate';
export { matchingSchemaIndex, matchesSchemaValue } from './json-schema-value';
