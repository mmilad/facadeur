import type { FieldDefinition, JsonSchema, SchemaCatalog } from '../../schema/document.js';
import { resolveJsonSchema } from './json-schema-value.js';

export function fieldDataSchema(field: FieldDefinition, schemaCatalog?: SchemaCatalog): JsonSchema {
  if (field.schema) return resolveJsonSchema(field.schema, schemaCatalog);
  const type = schemaTypeForField(field.type);
  if (field.type === 'array') {
    const items = field.items;
    const itemSchema = items?.schema
      ? resolveJsonSchema(items.schema, schemaCatalog)
      : items
        ? fieldDataSchema(
            {
              name: `${field.name}[]`,
              type: items.type,
              ...(items.options ? { options: items.options } : {}),
              ...(items.fields ? { items: { type: items.type, fields: items.fields } } : {}),
            },
            schemaCatalog,
          )
        : undefined;
    return { type, ...(itemSchema ? { items: itemSchema } : {}) };
  }
  if (field.type === 'object') {
    const fields = field.items?.fields ?? [];
    return {
      type,
      properties: Object.fromEntries(
        fields.map((child) => [child.name, fieldDataSchema(child, schemaCatalog)]),
      ),
      ...(fields.some((child) => child.required === true || child.default !== undefined)
        ? {
            required: fields
              .filter((child) => child.required === true || child.default !== undefined)
              .map((child) => child.name),
          }
        : {}),
      additionalProperties: false,
    };
  }
  return {
    type,
    ...(field.type === 'enum' && field.options?.length ? { enum: field.options } : {}),
  };
}

function schemaTypeForField(type: FieldDefinition['type']) {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'array') return 'array';
  if (type === 'object') return 'object';
  return 'string';
}
