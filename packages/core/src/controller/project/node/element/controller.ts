import type { ElementBuildConfig, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import type { PreviewController } from '../preview/controller';
import { definitionToElementBuildConfig } from '../preview/build-config';

export class ElementController {
  constructor(private readonly preview: PreviewController) {}

  buildOpenDefinition(): ElementBuildConfig | null {
    return this.preview.buildOpenDefinition();
  }

  buildDefinition(definition: NodeDefinition, catalog: ProjectCatalog): ElementBuildConfig {
    return definitionToElementBuildConfig(definition, catalog);
  }
}
