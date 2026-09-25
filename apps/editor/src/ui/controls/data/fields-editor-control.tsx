import type { FieldDefinition, FieldType } from '@facadeur/core';
import { useState } from 'react';
import {
  creatableFieldTypes,
  fieldDefinitionFromDraft,
  replaceFieldDefault,
  replaceFieldOptions,
  retargetField,
} from '../../../definitions.js';
import { Field, Section, Select, Stack, TextInput, Toggle } from '../../form/index.js';
import '../../form/form.css';
import { fieldTypeOptions } from './value.js';

export function FieldsEditorControl({
  fields,
  onDefineField,
  onRemoveField,
  onInvalid,
}: {
  fields: FieldDefinition[];
  onDefineField: (field: FieldDefinition) => void;
  onRemoveField: (name: string) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Stack gap={12}>
      {fields.length === 0 ? (
        <p className="meta">No fields yet. Instances will override the values you define here.</p>
      ) : null}
      {fields.map((field) => (
        <FieldDefinitionCard
          key={field.name}
          field={field}
          onDefineField={onDefineField}
          onRemoveField={onRemoveField}
          onInvalid={onInvalid}
        />
      ))}
      <AddFieldForm onDefineField={onDefineField} onInvalid={onInvalid} />
    </Stack>
  );
}

function FieldDefinitionCard({
  field,
  onDefineField,
  onRemoveField,
  onInvalid,
}: {
  field: FieldDefinition;
  onDefineField: (field: FieldDefinition) => void;
  onRemoveField: (name: string) => void;
  onInvalid?: (message: string) => void;
}) {
  const types = fieldTypeOptions(field);
  return (
    <Section title={field.name}>
      <Stack gap={8}>
        <Field label="Type">
          <Select
            name={`field-type-${field.name}`}
            value={field.type}
            options={types.map((type) => ({ value: type, label: type }))}
            onCommit={(next) => {
              try {
                onDefineField(retargetField(field, next as FieldType));
              } catch (error) {
                onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
              }
            }}
          />
        </Field>
        {field.type === 'enum' ? (
          <Field label="Options">
            <TextInput
              name={`field-options-${field.name}`}
              value={(field.options ?? []).join(', ')}
              onCommit={(text) => {
                try {
                  onDefineField(replaceFieldOptions(field, text));
                } catch (error) {
                  onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
                }
              }}
            />
          </Field>
        ) : null}
        <FieldDefaultEditor field={field} onDefineField={onDefineField} onInvalid={onInvalid} />
        <button
          type="button"
          className="text-button"
          name={`remove-field-${field.name}`}
          onClick={() => onRemoveField(field.name)}
        >
          Remove field
        </button>
      </Stack>
    </Section>
  );
}

function FieldDefaultEditor({
  field,
  onDefineField,
  onInvalid,
}: {
  field: FieldDefinition;
  onDefineField: (field: FieldDefinition) => void;
  onInvalid?: (message: string) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <Field label="Default">
        <Toggle
          name={`default-${field.name}`}
          label="On"
          value={field.default === true}
          onCommit={(checked) => onDefineField({ ...field, default: checked })}
        />
      </Field>
    );
  }
  if (field.type === 'enum') {
    return (
      <Field label="Default">
        <Select
          name={`default-${field.name}`}
          value={typeof field.default === 'string' ? field.default : ''}
          options={[
            { value: '', label: 'None' },
            ...(field.options ?? []).map((option) => ({ value: option, label: option })),
          ]}
          onCommit={(next) => {
            const patch = { ...field, ...(field.options ? { options: [...field.options] } : {}) };
            if (next) patch.default = next;
            else delete patch.default;
            onDefineField(patch);
          }}
        />
      </Field>
    );
  }
  return (
    <Field label="Default">
      <TextInput
        name={`default-${field.name}`}
        value={field.default === undefined ? '' : String(field.default)}
        onCommit={(raw) => {
          try {
            onDefineField(replaceFieldDefault(field, raw));
          } catch (error) {
            onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
          }
        }}
      />
    </Field>
  );
}

function AddFieldForm({
  onDefineField,
  onInvalid,
}: {
  onDefineField: (field: FieldDefinition) => void;
  onInvalid?: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [rawDefault, setRawDefault] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [booleanDefault, setBooleanDefault] = useState(false);

  function resetDraft() {
    setName('');
    setRawDefault('');
    setOptionsText('');
    setBooleanDefault(false);
  }

  return (
    <Section title="Add field">
      <Stack gap={8}>
        <Field label="Name">
          <TextInput name="new-field-name" value={name} placeholder="label" onChange={setName} />
        </Field>
        <Field label="Type">
          <Select
            name="new-field-type"
            value={type}
            options={creatableFieldTypes.map((item) => ({ value: item, label: item }))}
            onCommit={(next) => setType(next as FieldType)}
          />
        </Field>
        {type === 'enum' ? (
          <Field label="Options">
            <TextInput
              name="new-field-options"
              value={optionsText}
              placeholder="sm, md, lg"
              onChange={setOptionsText}
            />
          </Field>
        ) : null}
        {type === 'boolean' ? (
          <Field label="Default">
            <Toggle
              name="new-field-default"
              label="On"
              value={booleanDefault}
              onCommit={setBooleanDefault}
            />
          </Field>
        ) : (
          <Field label="Default">
            <TextInput name="new-field-default" value={rawDefault} onChange={setRawDefault} />
          </Field>
        )}
        <button
          type="button"
          className="text-button"
          name="add-field"
          onClick={() => {
            try {
              onDefineField(
                fieldDefinitionFromDraft({
                  name,
                  type,
                  rawDefault,
                  optionsText,
                  booleanDefault,
                }),
              );
              resetDraft();
            } catch (error) {
              onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
            }
          }}
        >
          Add field
        </button>
      </Stack>
    </Section>
  );
}
