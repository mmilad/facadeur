import type { FieldValue, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import type { FieldDefinition } from '../../../../schema/document';
import { fieldsFromJsonSchema } from '../../../../schema/json-schema-fields';
import { resolveJsonSchemaForDefinition } from '../../catalog/ops';
import { previewFieldsForNode } from '../preview/merge';

export type InspectorInputs = {
  fields: readonly FieldDefinition[];
  values: Record<string, FieldValue>;
};

/** Schema-backed inspector rows for a node: field defs + merged preview/instance values. */
export function inspectorInputsForNode(
  catalog: ProjectCatalog,
  definition: NodeDefinition,
  nodeUuid: string,
): InspectorInputs {
  const schema = resolveJsonSchemaForDefinition(catalog, definition);
  if (!schema) return { fields: [], values: {} };
  const fields = fieldsFromJsonSchema(schema);
  const merged = previewFieldsForNode(definition, nodeUuid);
  const values: Record<string, FieldValue> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(merged, field.name)) {
      values[field.name] = merged[field.name]!;
    } else if (field.default !== undefined) {
      values[field.name] = field.default;
    }
  }
  return { fields, values };
}
