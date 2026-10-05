import type { FieldDefinition, FieldValue, JsonSchema } from '@facadeur/core';
import { CodegenError, quote } from '../names';

export function assertDefault(documentId: string, field: FieldDefinition, value: FieldValue): void {
  assertDefaultValue(documentId, field, value, field.name);
}

function assertDefaultValue(
  documentId: string,
  field: FieldDefinition,
  value: FieldValue,
  name: string,
): void {
  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') throw invalidDefault(documentId, name, field.type);
    return;
  }
  if (field.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw invalidDefault(documentId, name, field.type);
    }
    return;
  }
  if (field.type === 'enum') {
    if (typeof value !== 'string' || !field.options?.includes(value)) {
      throw new CodegenError(
        `Field "${name}" on "${documentId}" defaults to "${String(value)}", which is not one of its options`,
      );
    }
    return;
  }
  if (field.type === 'array') {
    if (!Array.isArray(value)) throw invalidDefault(documentId, name, field.type);
    if (!field.items) return;
    const itemField: FieldDefinition = {
      name: `${name}[]`,
      type: field.items.type,
      ...(field.items.options ? { options: field.items.options } : {}),
      ...(field.items.fields
        ? { items: { type: field.items.type, fields: field.items.fields } }
        : {}),
    };
    for (const item of value) assertDefaultValue(documentId, itemField, item, itemField.name);
    return;
  }
  if (field.type === 'object') {
    if (!isRecordValue(value)) throw invalidDefault(documentId, name, field.type);
    for (const definition of field.items?.fields ?? []) {
      const nested = value[definition.name];
      if (nested !== undefined) {
        assertDefaultValue(documentId, definition, nested, `${name}.${definition.name}`);
      } else if (definition.required && definition.default === undefined) {
        throw new CodegenError(
          `Field "${name}" on "${documentId}" is missing required field "${definition.name}"`,
        );
      }
    }
    return;
  }
  if (typeof value !== 'string') throw invalidDefault(documentId, name, field.type);
}

function invalidDefault(
  documentId: string,
  name: string,
  type: FieldDefinition['type'],
): CodegenError {
  return new CodegenError(`Field "${name}" on "${documentId}" has a default that is not a ${type}`);
}

function isRecordValue(value: FieldValue): value is { [key: string]: FieldValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function fieldTypeName(field: FieldDefinition): string {
  if (field.schema) return schemaTypeName(field.schema);
  if (field.type === 'boolean') return 'boolean';
  if (field.type === 'number') return 'number';
  if (field.type === 'enum') {
    const options = field.options ?? [];
    if (!options.length) return 'string';
    return options.map((option) => quote(option)).join(' | ');
  }
  if (field.type === 'array') {
    const itemType = field.items ? fieldItemTypeName(field.items) : 'unknown';
    return `${itemType.includes(' | ') ? `(${itemType})` : itemType}[]`;
  }
  if (field.type === 'object')
    return field.items ? fieldObjectTypeName(field.items) : 'Record<string, unknown>';
  return 'string';
}

export function schemaTypeName(
  schema: JsonSchema,
  reference: (schema: JsonSchema) => string | undefined = () => undefined,
): string {
  const named = reference(schema);
  if (named) return named;
  const render = (value: JsonSchema): string => schemaTypeName(value, reference);
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum?.length) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  const branches = schema.anyOf ?? schema.oneOf;
  if (branches?.length || schema.allOf?.length) {
    const parts: string[] = [];
    if (schema.properties || schema.items) {
      const { oneOf: _oneOf, anyOf: _anyOf, allOf: _allOf, ...base } = schema;
      parts.push(render(base));
    }
    if (branches?.length) {
      const union = branches.map(render).join(' | ');
      if (!parts.length && !schema.allOf?.length) return union;
      parts.push(`(${union})`);
    }
    for (const branch of schema.allOf ?? []) parts.push(`(${render(branch)})`);
    return parts.join(' & ');
  }
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length > 1) return types.map((type) => render({ ...schema, type })).join(' | ');
  const type = types[0];
  if (type === 'string') return 'string';
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'null') return 'null';
  if (type === 'array') {
    const item = schema.items ? render(schema.items) : 'unknown';
    return `${item.includes(' | ') || item.includes(' & ') ? `(${item})` : item}[]`;
  }
  if (type === 'object' || schema.properties) {
    const properties = Object.entries(schema.properties ?? {}).map(([name, property]) => {
      const optional = schema.required?.includes(name) ? '' : '?';
      return `${quote(name)}${optional}: ${render(property)}`;
    });
    if (!properties.length) return 'Record<string, unknown>';
    if (schema.additionalProperties === true || schema.additionalProperties === undefined) {
      properties.push('[key: string]: unknown');
    } else if (typeof schema.additionalProperties === 'object') {
      const values = [
        render(schema.additionalProperties),
        ...Object.values(schema.properties ?? {}).map(render),
      ];
      if (Object.keys(schema.properties ?? {}).some((name) => !schema.required?.includes(name))) {
        values.push('undefined');
      }
      properties.push(`[key: string]: ${[...new Set(values)].join(' | ')}`);
    }
    return `{ ${properties.join('; ')} }`;
  }
  return 'unknown';
}

function fieldItemTypeName(items: NonNullable<FieldDefinition['items']>): string {
  if (items.type === 'object') return fieldObjectTypeName(items);
  if (items.type === 'enum' && items.options?.length) {
    return items.options.map((option) => quote(option)).join(' | ');
  }
  if (items.type === 'array') return 'unknown[]';
  return primitiveTypeName(items.type);
}

function fieldObjectTypeName(items: NonNullable<FieldDefinition['items']>): string {
  const fields = items.fields ?? [];
  if (!fields.length) return 'Record<string, unknown>';
  return `{ ${fields
    .map(
      (field) =>
        `${quote(field.name)}${field.required === true && field.default === undefined ? '' : '?'}: ${fieldTypeName(field)}`,
    )
    .join('; ')} }`;
}

function primitiveTypeName(type: FieldDefinition['type']): string {
  if (type === 'boolean') return 'boolean';
  if (type === 'number') return 'number';
  if (type === 'enum') return 'string';
  if (type === 'array') return 'unknown[]';
  if (type === 'object') return 'Record<string, unknown>';
  return 'string';
}

/** JS expression literal for field defaults and instance prop values. */
export function jsLiteral(value: FieldValue): string {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}
