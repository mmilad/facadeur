import type { ElementBuildConfig } from '@facadeur/domain';
import type { PreviewController } from '../preview/controller';

export class ElementController {
  constructor(private readonly preview: PreviewController) {}

  buildOpenDefinition(): ElementBuildConfig | null {
    return this.preview.buildOpenDefinition();
  }
}
