import type { CoreControllerHost } from '../../../../types/host';
import type { RenderBuildConfig } from '@facadeur/domain';
import {
  buildInspectorFormModel,
  inspectorChangeTarget,
  type InspectorFormModel,
} from './inspector-view';
import { resolveDefinitionToElementBuildConfig } from './resolve';
import { previewFieldsForNode } from './merge';
import { findDefinition, findNodeByUuid } from '../../catalog/ops';
import { effectiveSchemaForDefinition } from '../../catalog/field-contract';

/**
 * Preview pipeline for canvas/DOM:
 * 1. Merge field layers (ancestor → definition preview → instance data).
 * 2. Resolve bindings (`{prop:uuid}`, field-driven attributes/styles/text) to literals.
 * Output is a render tree for the Editor's React canvas.
 */
export class PreviewController {
  constructor(private readonly core: CoreControllerHost) {}

  fieldsForNode(nodeUuid: string) {
    const snap = this.core.getSnapshot();
    const definition = snap.openDefinition;
    if (!definition) return {};
    return previewFieldsForNode(
      definition,
      nodeUuid,
      {},
      effectiveSchemaForDefinition(snap.catalog, definition).schema,
    );
  }

  buildOpenDefinition(): RenderBuildConfig | null {
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
    const snap = this.core.getSnapshot();
    const definition = snap.openDefinition;
    const node = definition ? findNodeByUuid(definition.root, nodeUuid) : null;
    const referencedUuid =
      nodeUuid !== definition?.root.uuid ? node?.config?.definitionRef : undefined;
    const previewDefinitionUuid =
      (referencedUuid && findDefinition(snap.catalog, referencedUuid)?.definition.uuid) ??
      definition?.uuid ??
      nodeUuid;
    const target = inspectorChangeTarget(path, value, nodeUuid, previewDefinitionUuid);
    if (!target) return;
    this.core.applyInspectorFormChange(target);
  }
}
