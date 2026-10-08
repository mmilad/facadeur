import type { CoreControllerHost } from '../../../../types/host';
import type { ElementBuildConfig } from '@facadeur/domain';
import {
  buildInspectorFormModel,
  inspectorChangeTarget,
  type InspectorFormModel,
} from './inspector-view';
import { resolveDefinitionToElementBuildConfig } from './resolve';
import { previewFieldsForNode } from './merge';

/**
 * Preview pipeline for canvas/DOM:
 * 1. Merge field layers (ancestor → definition preview → instance data).
 * 2. Resolve bindings (`{prop:uuid}`, field-driven attributes/styles/text) to literals.
 * Output is {@link ElementBuildConfig} — {@link @facadeur/renderer-dom} stays dumb.
 */
export class PreviewController {
  constructor(private readonly core: CoreControllerHost) {}

  fieldsForNode(nodeUuid: string) {
    const definition = this.core.getSnapshot().openDefinition;
    if (!definition) return {};
    return previewFieldsForNode(definition, nodeUuid);
  }

  buildOpenDefinition(): ElementBuildConfig | null {
    const snap = this.core.getSnapshot();
    const definition = snap.openDefinition;
    if (!definition) return null;
    return resolveDefinitionToElementBuildConfig(definition, snap.catalog);
  }

  /** Inspector layout, presets, and form values for the selected catalog node. */
  inspectorForm(nodeUuid?: string): InspectorFormModel | null {
    const snap = this.core.getSnapshot();
    const definition = snap.openDefinition;
    if (!definition) return null;
    const target = nodeUuid ?? snap.selectedNodeUuid ?? definition.root.uuid;
    return buildInspectorFormModel(snap.catalog, definition, target);
  }

  applyFormChange(path: string, value: unknown, nodeUuid: string) {
    const target = inspectorChangeTarget(path, value, nodeUuid);
    if (!target) return;
    this.core.applyInspectorFormChange(target);
  }
}
