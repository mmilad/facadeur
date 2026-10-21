import type { FieldValue, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { fieldsFromJsonSchema, type JsonSchemaField } from '../../../../schema/json-schema-fields';
import { effectiveSchemaForDefinition } from '../../../../queries';
import { previewFieldsForNode } from '../preview/merge';
import { resolveCatalogSchemaReferences } from '../preview/reference-resolver';

export type InspectorInputs = {
  fields: readonly JsonSchemaField[];
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
  const schema = effective.schema
    ? (resolveCatalogSchemaReferences(effective.schema, catalog) as typeof effective.schema)
    : null;
  if (!schema) return { fields: [], values: {} };
  const fields = fieldsFromJsonSchema(schema);
  const merged = instanceData ?? previewFieldsForNode(definition, nodeUuid, {}, schema);
  const values: Record<string, FieldValue> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(effective.previewDefaults, field.name)) {
      values[field.name] = effective.previewDefaults[field.name] as FieldValue;
    } else if (field.default !== undefined) {
      values[field.name] = field.default;
    } else {
      values[field.name] = emptyFieldValue(field.type);
    }
    if (Object.prototype.hasOwnProperty.call(merged, field.name)) {
      values[field.name] = merged[field.name]!;
    }
  }
  return { fields, values };
}

function emptyFieldValue(type: JsonSchemaField['type']): FieldValue {
  switch (type) {
    case 'boolean':
      return false;
    case 'number':
    case 'text':
    case 'richText':
    case 'image':
    case 'link':
    case 'enum':
    case 'token':
      return '';
    case 'array':
      return [];
    case 'object':
      return {};
  }
}
