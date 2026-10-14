import type { FieldValue, NodeDefinition } from '@facadeur/domain';
import { findNodeByUuid } from '../../catalog/ops';

/** Merge preview defaults, inherited values, then node-level values. */
export function mergePreviewFields(
  definitionPreview: Record<string, FieldValue> | undefined,
  nodeData: Record<string, FieldValue> | undefined,
  parentFields: Record<string, FieldValue>,
) {
  return { ...definitionPreview, ...parentFields, ...nodeData };
}

export function previewFieldsForNode(
  definition: NodeDefinition,
  nodeUuid: string,
  ancestorFields: Record<string, FieldValue> = {},
) {
  const node = findNodeByUuid(definition.root, nodeUuid) ?? definition.root;
  const definitionPreview = definition.config?.previewData?.fields ?? {};
  const resolved = mergePreviewFields(
    { ...(definitionPreview as Record<string, FieldValue>), ...staticFieldValues(definition) },
    node.data as Record<string, FieldValue> | undefined,
    ancestorFields,
  );
  Object.assign(resolved, lockedStaticFieldValues(definition));
  return resolved;
}

export function staticFieldValues(definition: NodeDefinition): Record<string, FieldValue> {
  return Object.fromEntries(
    Object.entries(definition.config?.staticFields ?? {}).flatMap(([name, field]) =>
      field.isStatic && field.value !== undefined ? [[name, field.value]] : [],
    ),
  );
}

export function lockedStaticFieldValues(definition: NodeDefinition): Record<string, FieldValue> {
  return Object.fromEntries(
    Object.entries(definition.config?.staticFields ?? {}).flatMap(([name, field]) =>
      field.isStatic && field.expose !== true && field.value !== undefined
        ? [[name, field.value]]
        : [],
    ),
  );
}
