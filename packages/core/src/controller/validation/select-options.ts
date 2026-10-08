import { DocumentError } from '../../document/errors';
import type { FieldDefinition } from '../../schema/document';
import { isPlainObject } from '../../utils';

/** Native select options have a stable shape shared by preview and generated types. */
export function assertSelectOptionsField(field: FieldDefinition) {
  const rawItems = isPlainObject(field.schema) ? field.schema.items : undefined;
  const schema = field.items?.schema ?? rawItems;
  const properties =
    isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : undefined;
  const textProperty = (name: string) =>
    field.items?.fields?.some((property) => property.name === name && property.type === 'text') ||
    (properties && isPlainObject(properties[name]) && properties[name].type === 'string');
  if (field.type !== 'array' || !textProperty('value') || !textProperty('label')) {
    throw new DocumentError(
      'schema',
      'Options bindings require an array of objects with text value and label fields',
    );
  }
}
