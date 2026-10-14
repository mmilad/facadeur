import type { ProjectCatalog } from '@facadeur/domain';
import type { NodeDefinition } from '@facadeur/domain';
import type { Uuid } from '@facadeur/domain';

export interface CoreSnapshot {
  readonly catalog: ProjectCatalog;
  readonly openDefinitionId: Uuid | null;
  readonly openDefinition: NodeDefinition | null;
  readonly selectedNodeUuid: Uuid | null;
}

/** Persistence port used by Core to save the validated catalog. */
export interface CatalogPort {
  save(catalog: ProjectCatalog): Promise<ProjectCatalog>;
}
