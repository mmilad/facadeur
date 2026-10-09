'use client';

import type { FieldDefinition, FieldValue } from '@facadeur/core';
import { Form as SharedForm } from '@facadeur/form';
import { parseFieldValue } from '../../domain/field-values';
import { fieldDisplayLabel } from '../controls/data/field-label';
import { SchemaValueForm } from '../controls/data/SchemaValueForm';
import { Field, Stack, TextInput } from '../form/index';

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
      <SharedForm
        layout="horizontal"
        value={{ [field.name]: value === true }}
        fields={[{ name: field.name, label, type: 'boolean' }]}
        onChange={(next) => onChange(asPrimitiveFieldValue(next[field.name]))}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <SharedForm
        layout="horizontal"
        value={{ [field.name]: typeof value === 'number' ? value : '' }}
        fields={[{ name: field.name, label, type: 'number' }]}
        onChange={(next) => onChange(asPrimitiveFieldValue(next[field.name]))}
      />
    );
  }

  if (field.type === 'enum' && field.options?.length) {
    const options = field.options.map((option) => ({ value: option, label: option }));
    return (
      <SharedForm
        layout="horizontal"
        value={{ [field.name]: typeof value === 'string' ? value : (options[0]?.value ?? '') }}
        fields={[{ name: field.name, label, type: 'select', options }]}
        onChange={(next) => onChange(asPrimitiveFieldValue(next[field.name]))}
      />
    );
  }

  if (
    field.type === 'text' ||
    field.type === 'richText' ||
    field.type === 'image' ||
    field.type === 'link' ||
    field.type === 'token'
  ) {
    const textValue = typeof value === 'string' ? value : '';
    return (
      <SharedForm
        layout="horizontal"
        value={{ [field.name]: textValue }}
        fields={[{ name: field.name, label, type: 'text' }]}
        onChange={(next) => onChange(asPrimitiveFieldValue(next[field.name]))}
      />
    );
  }

  return (
    <Field label={label}>
      <TextInput
        value={value === undefined || value === null ? '' : String(value)}
        onCommit={(next) => {
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

function asPrimitiveFieldValue(value: unknown): FieldValue | undefined {
  if (value === '' || value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
