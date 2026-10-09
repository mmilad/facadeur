import {
  fieldsFromJsonSchema,
  type FieldDefinition,
  type InspectorFormField,
} from '@facadeur/core';
import type { FormFieldConfig } from '@facadeur/form';

export function mapInspectorFormFields(fields: InspectorFormField[]): FormFieldConfig[] {
  return fields.flatMap(mapInspectorField);
}

function mapInspectorField(field: InspectorFormField): FormFieldConfig[] {
  if (field.type === 'section') {
    return [{ type: 'layout', fields: mapInspectorFormFields(field.fields) }];
  }
  if (field.type === 'text') {
    return [{ type: 'text', name: field.path, label: field.label, bindable: false }];
  }
  if (field.type === 'select') {
    return [
      {
        type: 'select',
        name: field.path,
        label: field.label,
        options: field.options.map((value) => ({ value, label: value })),
      },
    ];
  }
  if (field.type === 'classList') {
    return [
      { type: 'classList', name: field.path, label: field.label, suggestions: field.suggestions },
    ];
  }
  if (field.type === 'record') {
    return [
      {
        type: 'record',
        name: field.path,
        label: field.label,
        keyLabel: field.keyLabel,
        valueLabel: field.valueLabel,
        bindable: field.propBindValues,
      },
    ];
  }
  return [mapFieldDefinition(field.path, field.field, field.label, field.propBindable === true)];
}

function mapFieldDefinition(
  path: string,
  field: FieldDefinition,
  label: string,
  bindable: boolean,
): FormFieldConfig {
  if (field.type === 'boolean') return { type: 'boolean', name: path, label };
  if (field.type === 'number') return { type: 'number', name: path, label };
  if (field.type === 'enum' && field.options?.length) {
    return {
      type: 'select',
      name: path,
      label,
      options: field.options.map((value) => ({ value, label: value })),
    };
  }
  if (field.type === 'object') {
    const children =
      field.items?.fields ?? (field.schema ? fieldsFromJsonSchema(field.schema) : []);
    return {
      type: 'object',
      name: path,
      label,
      fields: children.map((child) =>
        mapFieldDefinition(child.name, child, child.schema?.title?.trim() || child.name, bindable),
      ),
    };
  }
  if (field.type === 'array') {
    const item = field.items;
    const itemFieldsDefinition =
      item?.fields ??
      (item?.type === 'object' && item.schema ? fieldsFromJsonSchema(item.schema) : []);
    if (itemFieldsDefinition.length) {
      const itemFields = itemFieldsDefinition.map((child) =>
        mapFieldDefinition(child.name, child, child.schema?.title?.trim() || child.name, bindable),
      );
      return {
        type: 'repeater',
        name: path,
        label,
        itemLabel: field.name,
        itemFields,
        createItem: Object.fromEntries(
          itemFields.map((child, index) => [
            child.type === 'layout' ? String(index) : child.name,
            defaultValue(child),
          ]),
        ),
      };
    }
    return {
      type: 'chips',
      name: path,
      label,
      suggestions: item?.options,
    };
  }
  return { type: 'text', name: path, label, bindable };
}

function defaultValue(field: FormFieldConfig): unknown {
  switch (field.type) {
    case 'boolean':
      return false;
    case 'number':
      return '';
    case 'object':
      return {};
    case 'repeater':
    case 'chips':
    case 'classList':
      return [];
    case 'layout':
      return {};
    default:
      return '';
  }
}
