import type { FieldValue, Node, NodeDefinition } from '@facadeur/domain';
import { findNodeByUuid } from '../../catalog/ops';

/** Merge ordered field layers; later layers override earlier ones. */
export function mergePreviewFields(
  definitionPreview: Record<string, FieldValue> | undefined,
  nodeData: Record<string, FieldValue> | undefined,
  parentFields: Record<string, FieldValue>,
) {
  return { ...parentFields, ...definitionPreview, ...nodeData };
}

export function previewFieldsForNode(
  definition: NodeDefinition,
  nodeUuid: string,
  ancestorFields: Record<string, FieldValue> = {},
) {
  const node = findNodeByUuid(definition.root, nodeUuid) ?? definition.root;
  const definitionPreview = definition.config?.previewData?.fields ?? {};
  return mergePreviewFields(
    definitionPreview as Record<string, FieldValue>,
    node.data as Record<string, FieldValue> | undefined,
    ancestorFields,
  );
}
