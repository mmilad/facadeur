import type { FieldDefinition } from '@facadeur/core';
import type { FieldConfig } from '../../form/schema/field-config';

export function fieldDefinitionToFieldConfig(
  path: string,
  field: FieldDefinition,
  label: string,
): FieldConfig {
  if (field.schema) {
    return {
      type: 'schemaField',
      name: path,
      label,
      field,
      propBindable: path.startsWith('nodeData.'),
    };
  }
  if (field.type === 'boolean') {
    return { type: 'checkbox', name: path, label };
  }
  if (field.type === 'number') {
    return { type: 'number', name: path, label };
  }
  if (field.type === 'enum' && field.enum?.length) {
    return {
      type: 'select',
      name: path,
      label,
      options: field.enum.map((value) => ({
        value: String(value),
        label: String(value),
      })),
    };
  }
  return { type: 'text', name: path, label };
}
