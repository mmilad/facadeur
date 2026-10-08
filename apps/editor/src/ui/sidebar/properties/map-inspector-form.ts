import type { InspectorFormField } from '@facadeur/core';
import type { FieldConfig, FieldGroupConfig } from '../../form/schema/field-config';
import { fieldDefinitionToFieldConfig } from './schema-field-config';

export function mapInspectorFormFields(fields: InspectorFormField[]): (FieldConfig | FieldGroupConfig)[] {
  return fields.map(mapInspectorField);
}

function mapInspectorField(field: InspectorFormField): FieldConfig | FieldGroupConfig {
  if (field.type === 'section') {
    return {
      type: 'section',
      title: field.title,
      fields: mapInspectorFormFields(field.fields),
    };
  }
  if (field.type === 'text') {
    return {
      type: 'text',
      name: field.path,
      label: field.label,
      hint: field.hint,
    };
  }
  if (field.type === 'select') {
    return {
      type: 'select',
      name: field.path,
      label: field.label,
      options: field.options.map((value) => ({ value, label: value })),
    };
  }
  if (field.type === 'classList') {
    return {
      type: 'classList',
      name: field.path,
      label: field.label,
      suggestions: [...field.suggestions],
    };
  }
  if (field.type === 'record') {
    return {
      type: 'record',
      name: field.path,
      label: field.label,
      keyLabel: field.keyLabel,
      valueLabel: field.valueLabel,
      propBindValues: field.propBindValues,
    };
  }
  const mapped = fieldDefinitionToFieldConfig(field.path, field.field, field.label);
  if (mapped.type === 'schemaField') {
    return { ...mapped, propBindable: field.propBindable };
  }
  return mapped;
}
