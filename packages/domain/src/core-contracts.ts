import type { ProjectCatalog } from './catalog';
import type { NodeDefinition } from './node';
import type { Uuid } from './uuid';

export interface CoreSnapshot {
  readonly catalog: ProjectCatalog;
  readonly openDefinitionId: Uuid | null;
  readonly openDefinition: NodeDefinition | null;
  readonly selectedNodeUuid: Uuid | null;
}

/** Implemented by the editor API layer — not part of core algorithms. */
export interface CatalogPort {
  load(): Promise<ProjectCatalog>;
  save(catalog: ProjectCatalog): Promise<ProjectCatalog>;
}
