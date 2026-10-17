import type { FieldValue, JsonSchemaObject, NodeDefinition } from '@facadeur/domain';
import { findNodeByUuid } from '../../catalog/ops';
import {
  isFieldBindingValue,
  matchesPartialSchemaValue,
} from '../../../validation/json-schema-value';

/** Merge preview defaults, inherited values, then node-level values. */
export function mergePreviewFields(
  definitionPreview: Record<string, FieldValue> | undefined,
  nodeData: Record<string, FieldValue> | undefined,
  parentFields: Record<string, FieldValue>,
  schema?: JsonSchemaObject | null,
) {
  return {
    ...compatiblePreviewFieldValues(definitionPreview, schema),
    ...parentFields,
    ...compatibleNodeFieldValues(nodeData, schema),
  };
}

function compatiblePreviewFieldValues(
  values: Record<string, FieldValue> | undefined,
  schema: JsonSchemaObject | null | undefined,
) {
  if (!values || !schema?.properties) return values ?? {};
  return Object.fromEntries(
    Object.entries(values).filter(([name, value]) => {
      const fieldSchema = (schema.properties as Record<string, unknown>)[name];
      if (!fieldSchema || typeof fieldSchema !== 'object') return false;
      return (
        matchesPartialSchemaValue(
          value,
          fieldSchema as Parameters<typeof matchesPartialSchemaValue>[1],
        ) || isFieldBindingValue(value, fieldSchema)
      );
    }),
  );
}

export function previewFieldsForNode(
  definition: NodeDefinition,
  nodeUuid: string,
  ancestorFields: Record<string, FieldValue> = {},
  schema?: JsonSchemaObject | null,
) {
  const node = findNodeByUuid(definition.root, nodeUuid) ?? definition.root;
  const definitionPreview = definition.config?.previewData?.fields ?? {};
  const resolved = mergePreviewFields(
    { ...(definitionPreview as Record<string, FieldValue>), ...staticFieldValues(definition) },
    node.data as Record<string, FieldValue> | undefined,
    ancestorFields,
    schema,
  );
  Object.assign(resolved, lockedStaticFieldValues(definition));
  return resolved;
}

export function compatibleNodeFieldValues(
  nodeData: Record<string, FieldValue> | undefined,
  schema: JsonSchemaObject | null | undefined,
) {
  if (!nodeData || !schema?.properties) return nodeData ?? {};
  return Object.fromEntries(
    Object.entries(nodeData).filter(([name, value]) => {
      const fieldSchema = (schema.properties as Record<string, unknown> | undefined)?.[name];
      if (!fieldSchema || typeof fieldSchema !== 'object') return true;
      return (
        matchesPartialSchemaValue(
          value,
          fieldSchema as Parameters<typeof matchesPartialSchemaValue>[1],
        ) || isFieldBindingValue(value, fieldSchema)
      );
    }),
  );
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
