import type { CatalogMapKey, ProjectCatalog } from '@facadeur/domain';
import type { NodeDefinition } from '@facadeur/domain';

/** Catalog definition operations implemented by the host's transport adapter. */
export interface CatalogDefinitionPort {
  createDefinition(
    kind: CatalogMapKey,
    definition: Omit<NodeDefinition, 'uuid'> & { uuid?: string },
  ): Promise<ProjectCatalog>;
  deleteDefinition(kind: CatalogMapKey, uuid: string): Promise<ProjectCatalog>;
}
