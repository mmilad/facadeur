import type { CoreControllerHost } from '../../../types/host';
import { ConfigController } from './config/controller';
import { ElementController } from './element/controller';
import { PreviewController } from './preview/controller';
import { SchemaController } from './schema/controller';

/** Orchestrates preview, config, element, and schema for the open definition tree. */
export class NodeController {
  readonly preview: PreviewController;
  readonly element: ElementController;
  readonly config: ConfigController;
  readonly schema: SchemaController;

  constructor(private readonly core: CoreControllerHost) {
    this.preview = new PreviewController(core);
    this.element = new ElementController(this.preview);
    this.config = new ConfigController(core, this.preview);
    this.schema = new SchemaController(core);
  }

  get openDefinitionId() {
    return this.core.getSnapshot().openDefinitionId;
  }

  selectedNodeUuid() {
    return this.core.getSnapshot().selectedNodeUuid;
  }

  openDefinition(uuid: string) {
    this.core.openDefinition(uuid);
  }

  patchField(field: string, value: unknown) {
    this.core.patchNodeField(field, value);
  }

  selectNode(uuid: string) {
    this.core.selectNode(uuid);
  }
}
