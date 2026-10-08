import type { CoreSnapshot } from '@facadeur/domain';
import type { InspectorFormChangeTarget } from '../controller/project/node/preview/inspector-view';

/** Sub-controllers use this surface; the concrete class is {@link CoreController}. */
export interface CoreControllerHost {
  getSnapshot(): CoreSnapshot;
  openDefinition(uuid: string): void;
  closeDefinition(): void;
  selectNode(uuid: string): void;
  patchNodeField(field: string, value: unknown): void;
  applyInspectorFormChange(target: InspectorFormChangeTarget): void;
}
