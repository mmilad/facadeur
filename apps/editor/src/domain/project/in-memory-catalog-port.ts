import {
  createCatalogDefinition,
  createCatalogUuid,
  deleteCatalogDefinitionRecord,
  patchCatalogDefinitionRecord,
  validateProjectCatalog,
  type NodeDefinitionModel,
  type ProjectCatalogModel,
} from '@facadeur/core';
import type { EditorCatalogPort } from './catalog-port';

/** In-memory transport for tests and local-only sessions. */
export function createInMemoryCatalogPort(
  getCatalog: () => ProjectCatalogModel,
  setCatalog?: (catalog: ProjectCatalogModel) => void,
): EditorCatalogPort {
  const commit = (catalog: ProjectCatalogModel) => {
    const validated = validateProjectCatalog(catalog) as ProjectCatalogModel;
    setCatalog?.(validated);
    return validated;
  };
  return {
    load: async () => structuredClone(getCatalog()) as ProjectCatalogModel,
    save: async (catalog) => commit(catalog),
    createDefinition: async (kind, definition) => {
      const uuid = definition.uuid ?? createCatalogUuid();
      return commit(
        createCatalogDefinition(getCatalog(), kind, {
          ...definition,
          uuid,
        } as NodeDefinitionModel),
      );
    },
    patchDefinition: async (kind, uuid, patch) =>
      commit(patchCatalogDefinitionRecord(getCatalog(), kind, uuid, patch)),
    deleteDefinition: async (kind, uuid) =>
      commit(deleteCatalogDefinitionRecord(getCatalog(), kind, uuid)),
  };
}
