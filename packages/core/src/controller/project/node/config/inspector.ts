import type { FieldValue, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import type { FieldDefinition } from '../../../../schema/document';
import { fieldsFromJsonSchema } from '../../../../schema/json-schema-fields';
import { effectiveSchemaForDefinition } from '../../catalog/field-contract';
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
  instanceData?: Readonly<Record<string, FieldValue>>,
): InspectorInputs {
  const effective = effectiveSchemaForDefinition(catalog, definition);
  const schema = effective.schema;
  if (!schema) return { fields: [], values: {} };
  const fields = fieldsFromJsonSchema(schema);
  const merged = instanceData ?? previewFieldsForNode(definition, nodeUuid);
  const values: Record<string, FieldValue> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(effective.previewDefaults, field.name)) {
      values[field.name] = effective.previewDefaults[field.name] as FieldValue;
    } else if (field.default !== undefined) {
      values[field.name] = field.default;
    }
    if (Object.prototype.hasOwnProperty.call(merged, field.name)) {
      values[field.name] = merged[field.name]!;
    }
  }
  return { fields, values };
}
