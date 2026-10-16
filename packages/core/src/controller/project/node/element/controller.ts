import type { RenderBuildConfig } from '@facadeur/domain';
import type { PreviewController } from '../preview/controller';

export class ElementController {
  constructor(private readonly preview: PreviewController) {}

  buildOpenDefinition(): RenderBuildConfig | null {
    return this.preview.buildOpenDefinition();
  }
}
