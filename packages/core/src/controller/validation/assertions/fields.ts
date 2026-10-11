import { DocumentError } from '../../../document/errors';
import { isPlainObject as isRecord } from '../../../utils';
import { fieldTypes, type FieldDefinition, type FieldValue } from '../../../schema/document';
import { matchesLegacyStructuralValue, matchesSchemaValue } from '../json-schema-value';

export function assertFieldDefinition(field: FieldDefinition): void {
  if (!fieldTypes.includes(field.type)) {
    throw new DocumentError('schema', `Unknown field type "${field.type}"`);
  }
  if (field.type === 'enum') {
    if (!field.options?.length) {
      throw new DocumentError('schema', `Enum field "${field.name}" needs options`);
    }
    if (new Set(field.options).size !== field.options.length) {
      throw new DocumentError('schema', `Enum field "${field.name}" has duplicate options`);
    }
  } else if (field.options) {
    throw new DocumentError('schema', `Only enum fields can have options ("${field.name}")`);
  }
  if (field.items && field.type !== 'array' && field.type !== 'object') {
    throw new DocumentError(
      'schema',
      `Only array and object fields can define items ("${field.name}")`,
    );
  }
  if (field.items?.options) {
    if (field.items.type !== 'enum') {
      throw new DocumentError('schema', `Only enum item fields can have options ("${field.name}")`);
    }
    if (new Set(field.items.options).size !== field.items.options.length) {
      throw new DocumentError('schema', `Enum item field "${field.name}" has duplicate options`);
    }
  } else if (field.items?.type === 'enum') {
    throw new DocumentError('schema', `Enum item field "${field.name}" needs options`);
  }
  if ((field.type === 'array' || field.type === 'object') && field.items) {
    if (
      field.type === 'array' &&
      field.items.type === 'object' &&
      !field.items.fields?.length &&
      !field.items.schema
    ) {
      throw new DocumentError('schema', `Object array field "${field.name}" needs item fields`);
    }
    const nestedNames = new Set<string>();
    for (const item of field.items.fields ?? []) {
      if (nestedNames.has(item.name)) {
        throw new DocumentError(
          'schema',
          `Duplicate nested field "${item.name}" in "${field.name}"`,
        );
      }
      nestedNames.add(item.name);
      assertFieldDefinition(item);
    }
  }
  if (field.default !== undefined) {
    assertValueMatches(field, field.default);
  }
}

export function assertValueMatches(field: FieldDefinition, value: FieldValue): void {
  const label = `Field "${field.name}"`;
  if (field.schema) {
    if (
      !matchesSchemaValue(value, field.schema) &&
      !matchesLegacyStructuralValue(value, field.schema)
    ) {
      throw new DocumentError('schema', `${label} does not match its JSON Schema contract`);
    }
    return;
  }
  switch (field.type) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new DocumentError('schema', `${label} expects a boolean`);
      }
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new DocumentError('schema', `${label} expects a finite number`);
      }
      return;
    case 'enum':
      if (typeof value !== 'string' || !field.options?.includes(value)) {
        throw new DocumentError('schema', `${label} must be one of ${field.options?.join(', ')}`);
      }
      return;
    case 'array': {
      if (!Array.isArray(value)) throw new DocumentError('schema', `${label} expects an array`);
      if (!field.items) return;
      const itemField: FieldDefinition = {
        name: `${field.name}[]`,
        type: field.items.type,
        ...(field.items.schema ? { schema: field.items.schema } : {}),
        ...(field.items.options ? { options: field.items.options } : {}),
        ...(field.items.fields
          ? { items: { type: field.items.type, fields: field.items.fields } }
          : {}),
      };
      for (const item of value) assertValueMatches(itemField, item);
      return;
    }
    case 'object':
      if (!isRecord(value)) throw new DocumentError('schema', `${label} expects an object`);
      for (const definition of field.items?.fields ?? []) {
        const nested = value[definition.name];
        if (nested !== undefined) assertValueMatches(definition, nested);
        else if (definition.required && definition.default === undefined) {
          throw new DocumentError('schema', `${label} is missing "${definition.name}"`);
        }
      }
      return;
    default:
      if (typeof value !== 'string') {
        throw new DocumentError('schema', `${label} expects a string`);
      }
  }
}
