import type { CatalogPort, ProjectCatalogModel } from '@facadeur/core';
import type { NodeDefinitionModel } from '@facadeur/core';
import { api } from '../api';

export type CatalogDefinitionKind = 'atoms' | 'components' | 'pages';

/** HTTP catalog transport including definition CRUD. */
export interface EditorCatalogPort extends CatalogPort {
  createDefinition(
    kind: CatalogDefinitionKind,
    definition: Omit<NodeDefinitionModel, 'uuid'> & { uuid?: string },
  ): Promise<ProjectCatalogModel>;
  patchDefinition(
    kind: CatalogDefinitionKind,
    uuid: string,
    patch: Partial<NodeDefinitionModel>,
  ): Promise<ProjectCatalogModel>;
  deleteDefinition(kind: CatalogDefinitionKind, uuid: string): Promise<ProjectCatalogModel>;
}

export function createCatalogPort(projectId: string): EditorCatalogPort {
  return {
    load: () => api.projects.loadCatalog(projectId),
    save: (catalog: ProjectCatalogModel) => api.projects.saveCatalog(projectId, catalog),
    createDefinition: (kind, definition) =>
      api.projects.createCatalogDefinition(projectId, kind, definition),
    patchDefinition: (kind, uuid, patch) =>
      api.projects.patchCatalogDefinition(projectId, kind, uuid, patch),
    deleteDefinition: (kind, uuid) =>
      api.projects.deleteCatalogDefinition(projectId, kind, uuid),
  };
}
