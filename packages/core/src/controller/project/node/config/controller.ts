import type { CoreControllerHost } from '../../../../types/host';
import type { PreviewController } from '../preview/controller';
import { inspectorInputsForNode } from './inspector';

export class ConfigController {
  constructor(
    private readonly core: CoreControllerHost,
    private readonly preview: PreviewController,
  ) {}

  previewFields(nodeUuid: string) {
    return this.preview.fieldsForNode(nodeUuid);
  }

  inspectorInputs(nodeUuid?: string) {
    const snap = this.core.getSnapshot();
    const definition = snap.openDefinition;
    if (!definition) return { fields: [], values: {} };
    const target =
      nodeUuid ?? snap.selectedNodeUuid ?? definition.root.uuid;
    return inspectorInputsForNode(snap.catalog, definition, target);
  }
}
