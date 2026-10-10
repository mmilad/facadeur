import type { CatalogDefinitionPort, CatalogPort, ProjectCatalogModel } from '@facadeur/core';
import type { CatalogMapKey } from '@facadeur/domain';
import { api } from '../api';

export type CatalogDefinitionKind = CatalogMapKey;

/** HTTP catalog transport including definition CRUD. */
export type EditorCatalogPort = CatalogPort & CatalogDefinitionPort;

export function createCatalogPort(projectId: string): EditorCatalogPort {
  return {
    load: () => api.projects.loadCatalog(projectId),
    save: (catalog: ProjectCatalogModel) => api.projects.saveCatalog(projectId, catalog),
    createDefinition: (kind, definition) =>
      api.projects.createCatalogDefinition(projectId, kind, definition),
    deleteDefinition: (kind, uuid) => api.projects.deleteCatalogDefinition(projectId, kind, uuid),
  };
}
