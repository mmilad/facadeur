'use client';

import type { FieldValue, JsonSchemaField } from '@facadeur/core';
import type { NodeDefinition, StaticFieldConfig } from '@facadeur/domain';
import { fieldDisplayLabel } from '../controls/fields/field-label';
import { SchemaValueForm } from '../controls/data/schema/SchemaValueForm';
import { Stack } from '../components/layout';

export function staticFieldConfigsForDefinition(definition: NodeDefinition) {
  return Object.assign(
    {},
    definition.config?.staticFields,
    ...Object.values(definition.config?.instanceFieldConfigs ?? {}),
  );
}

export function CatalogPreviewFields({
  fields,
  previewFields,
  staticFields = {},
  iconOptions = [],
  onWrite,
}: {
  fields: readonly JsonSchemaField[];
  previewFields: Readonly<Record<string, FieldValue>>;
  staticFields?: Readonly<Record<string, StaticFieldConfig>>;
  iconOptions?: readonly { readonly value: string; readonly label: string }[];
  onWrite: (field: JsonSchemaField, value: FieldValue | undefined) => void;
}) {
  if (!fields.length) {
    return (
      <p className="inspector-empty">
        Add properties to the schema before entering preview defaults.
      </p>
    );
  }

  return (
    <Stack gap={12}>
      {fields.map((field) => (
        <PreviewField
          key={field.name}
          field={field}
          value={
            staticFields[field.name]?.isStatic
              ? staticFields[field.name]?.value
              : previewFields[field.name]
          }
          disabled={staticFields[field.name]?.isStatic === true}
          iconOptions={iconOptions}
          onChange={(next) => onWrite(field, next)}
        />
      ))}
    </Stack>
  );
}

function PreviewField({
  field,
  value,
  disabled,
  iconOptions,
  onChange,
}: {
  field: JsonSchemaField;
  value: FieldValue | undefined;
  disabled: boolean;
  iconOptions: readonly { readonly value: string; readonly label: string }[];
  onChange: (value: FieldValue | undefined) => void;
}) {
  const label = fieldDisplayLabel(field.name);
  return (
    <SchemaValueForm
      schema={field.schema}
      value={value}
      label={label}
      id={`preview-field-${field.name}`}
      disabled={disabled}
      referenceOptions={iconOptions}
      onChange={onChange}
    />
  );
}
