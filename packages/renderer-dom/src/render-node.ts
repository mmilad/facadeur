import type { NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { definitionToElementBuildConfig } from '@facadeur/core';
import { buildElement } from './build-element';

export function renderDefinitionRoot(
  definition: NodeDefinition,
  _catalog: ProjectCatalog,
  document: Document = window.document,
) {
  const config = definitionToElementBuildConfig(definition);
  return buildElement(config, { document });
}

/** @deprecated Use renderDefinitionRoot + buildElement from preview pipeline. */
export { renderDefinitionRoot as renderV2DefinitionRoot };
