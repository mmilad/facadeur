import {
  fieldsFromJsonSchema,
  type FieldDefinition,
  type InspectorFormField,
} from '@facadeur/core';
import type {
  AutocompleteOption,
  FormFieldConfig,
  RecordFieldSuggestions,
  TransformableFieldOption,
} from '@facadeur/form';

export function mapInspectorFormFields(
  fields: InspectorFormField[],
  styleSuggestions: RecordFieldSuggestions,
  componentDataOptions: readonly AutocompleteOption[] = [],
  fieldOptions: (
    path: string,
    label: string,
    color?: boolean,
  ) => readonly TransformableFieldOption[],
): FormFieldConfig[] {
  return fields.flatMap((field) =>
    mapInspectorField(field, styleSuggestions, componentDataOptions, fieldOptions),
  );
}

function mapInspectorField(
  field: InspectorFormField,
  styleSuggestions: RecordFieldSuggestions,
  componentDataOptions: readonly AutocompleteOption[],
  fieldOptions: (
    path: string,
    label: string,
    color?: boolean,
  ) => readonly TransformableFieldOption[],
): FormFieldConfig[] {
  if (field.type === 'section') {
    return [
      {
        type: 'layout',
        fields: mapInspectorFormFields(
          field.fields,
          styleSuggestions,
          componentDataOptions,
          fieldOptions,
        ),
      },
    ];
  }
  if (field.type === 'text') {
    return field.bindable
      ? [
          {
            type: 'transformable',
            name: field.path,
            label: field.label,
            fieldOptions: fieldOptions(
              field.path,
              field.label,
              /color|colour|background/i.test(`${field.path} ${field.label}`),
            ),
          },
        ]
      : [{ type: 'text', name: field.path, label: field.label }];
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
      { type: 'chips', name: field.path, label: field.label, suggestions: field.suggestions },
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
        ...(field.propBindValues
          ? {
              valueField: {
                type: 'transformable' as const,
                fieldOptions: fieldOptions(field.path, field.label, field.path === 'node.style'),
              },
            }
          : {}),
        ...(field.path === 'node.style'
          ? {
              suggestions: {
                ...styleSuggestions,
                options: [...(styleSuggestions.options ?? []), ...componentDataOptions],
              },
            }
          : field.path === 'node.attributes' && componentDataOptions.length
            ? { suggestions: { options: componentDataOptions } }
            : {}),
      },
    ];
  }
  return [
    mapFieldDefinition(
      field.path,
      field.field,
      field.label,
      field.propBindable === true,
      fieldOptions,
    ),
  ];
}

function mapFieldDefinition(
  path: string,
  field: FieldDefinition,
  label: string,
  bindable: boolean,
  fieldOptions: (
    path: string,
    label: string,
    color?: boolean,
  ) => readonly TransformableFieldOption[],
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
        mapFieldDefinition(
          child.name,
          child,
          child.schema?.title?.trim() || child.name,
          bindable,
          fieldOptions,
        ),
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
        mapFieldDefinition(
          child.name,
          child,
          child.schema?.title?.trim() || child.name,
          bindable,
          fieldOptions,
        ),
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
  return bindable
    ? {
        type: 'transformable',
        name: path,
        label,
        fieldOptions: fieldOptions(
          path,
          label,
          /color|colour|background/i.test(`${path} ${label}`),
        ),
      }
    : { type: 'text', name: path, label };
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
      return [];
    case 'layout':
      return {};
    default:
      return '';
  }
}
