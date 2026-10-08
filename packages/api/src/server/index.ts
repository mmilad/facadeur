export { apiController } from './controller';
export { DomainError } from '../errors';
// File adapter is also available for trusted server-side imports and persistence integration.
export {
  readProjectFiles,
  saveProjectFile,
  initializeProjectFiles,
  legacyProjectStorage,
} from './project/files';
export {
  readProjectCatalog,
  writeProjectCatalog,
  createCatalogDefinition,
  patchCatalogDefinition,
  deleteCatalogDefinition,
  ensureProjectCatalogFile,
  CATALOG_SOURCE,
  type CatalogDefinitionKind,
} from './project/catalog';
export {
  seedProjectCatalog,
  imageAtomDefinition,
  IMAGE_SCHEMA_UUID,
  IMAGE_ATOM_UUID,
  IMAGE_ROOT_UUID,
} from './project/catalog-seed';
