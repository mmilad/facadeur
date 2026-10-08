import type { ElementBuildConfig, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { resolveDefinitionToElementBuildConfig } from './resolve';

/** @deprecated Use {@link resolveDefinitionToElementBuildConfig} with catalog context. */
export function definitionToElementBuildConfig(
  definition: NodeDefinition,
  catalog: ProjectCatalog = { atoms: {}, components: {}, pages: {} },
): ElementBuildConfig {
  return resolveDefinitionToElementBuildConfig(definition, catalog);
}
