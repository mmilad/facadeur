import {
  createCatalogDefinition,
  createCatalogUuid,
  deleteCatalogDefinitionRecord,
  type NodeDefinitionModel,
} from '@facadeur/core';
import type { ProjectCatalog } from '@facadeur/domain';
import type { EditorCatalogPort } from './catalog-port';

/** In-memory catalog port for Storybook and the local editor preview. */
export function createInMemoryCatalogPort(getCatalog: () => ProjectCatalog): EditorCatalogPort {
  return {
    save: async (catalog) => catalog,
    createDefinition: async (kind, definition) => {
      const uuid = definition.uuid ?? createCatalogUuid();
      return createCatalogDefinition(getCatalog(), kind, {
        ...definition,
        uuid,
      } as NodeDefinitionModel);
    },
    deleteDefinition: async (kind, uuid) => deleteCatalogDefinitionRecord(getCatalog(), kind, uuid),
  };
}
