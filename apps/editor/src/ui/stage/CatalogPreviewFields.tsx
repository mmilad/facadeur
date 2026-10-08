'use client';

import type { FieldDefinition, FieldValue } from '@facadeur/core';
import { parseFieldValue } from '../../domain/field-values';
import { fieldDisplayLabel } from '../controls/data/field-label';
import { SchemaValueForm } from '../controls/data/SchemaValueForm';
import { Field, NumberInput, Stack, TextInput, Toggle } from '../form/index';

export function CatalogPreviewFields({
  fields,
  previewFields,
  onWrite,
  onInvalid,
}: {
  fields: readonly FieldDefinition[];
  previewFields: Readonly<Record<string, FieldValue>>;
  onWrite: (field: FieldDefinition, value: FieldValue | undefined) => void;
  onInvalid: (message: string) => void;
}) {
  if (!fields.length) {
    return (
      <p className="inspector-empty">Add properties to the schema before entering preview defaults.</p>
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
          onInvalid={onInvalid}
        />
      ))}
    </Stack>
  );
}

function PreviewField({
  field,
  value,
  onChange,
  onInvalid,
}: {
  field: FieldDefinition;
  value: FieldValue | undefined;
  onChange: (value: FieldValue | undefined) => void;
  onInvalid: (message: string) => void;
}) {
  const label = fieldDisplayLabel(field.name);
  const schema = field.schema;

  if (schema) {
    return (
      <SchemaValueForm
        schema={schema}
        value={value}
        label={label}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <Field label={label}>
        <Toggle
          name={`preview-${field.name}`}
          label={value === true ? 'On' : 'Off'}
          value={value === true}
          onCommit={(next) => onChange(next)}
        />
      </Field>
    );
  }

  if (field.type === 'number') {
    return (
      <Field label={label}>
        <NumberInput
          value={typeof value === 'number' ? value : null}
          onChange={(next) => {
            try {
              onChange(next ?? undefined);
            } catch (failure) {
              onInvalid(failure instanceof Error ? failure.message : 'Invalid number');
            }
          }}
        />
      </Field>
    );
  }

  return (
    <Field label={label}>
      <TextInput
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(next) => {
          try {
            onChange(parseFieldValue(field, next, { trimStrings: true }));
          } catch (failure) {
            onInvalid(failure instanceof Error ? failure.message : 'Invalid value');
          }
        }}
      />
    </Field>
  );
}
