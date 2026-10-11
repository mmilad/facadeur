'use client';

import type { FieldValue, JsonSchemaField } from '@facadeur/core';
import { fieldDisplayLabel } from '../controls/data/field-label';
import { SchemaValueForm } from '../controls/data/schema/SchemaValueForm';
import { Stack } from '../components/layout';

export function CatalogPreviewFields({
  fields,
  previewFields,
  onWrite,
}: {
  fields: readonly JsonSchemaField[];
  previewFields: Readonly<Record<string, FieldValue>>;
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
          value={previewFields[field.name]}
          onChange={(next) => onWrite(field, next)}
        />
      ))}
    </Stack>
  );
}

function PreviewField({
  field,
  value,
  onChange,
}: {
  field: JsonSchemaField;
  value: FieldValue | undefined;
  onChange: (value: FieldValue | undefined) => void;
}) {
  const label = fieldDisplayLabel(field.name);
  return <SchemaValueForm schema={field.schema} value={value} label={label} onChange={onChange} />;
}
