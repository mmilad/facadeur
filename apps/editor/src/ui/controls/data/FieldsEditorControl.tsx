import type { FieldDefinition, FieldType } from '@facadeur/core';
import { useState } from 'react';
import {
  creatableFieldTypes,
  type FieldItems,
  fieldDefinitionFromDraft,
  replaceFieldDefault,
  replaceFieldItems,
  replaceFieldOptions,
  retargetField,
} from '../../../domain/definitions.js';
import { Field, Inline, Section, Select, Stack, TextInput, Toggle } from '../../form/index.js';
import '../../form/form.css';
import { fieldDisplayLabel } from './field-label.js';
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
  fieldKey = field.name,
  onDefineField,
  onRemoveField,
  onInvalid,
}: {
  field: FieldDefinition;
  fieldKey?: string;
  onDefineField: (field: FieldDefinition) => void;
  onRemoveField: (name: string) => void;
  onInvalid?: (message: string) => void;
}) {
  const types = fieldTypeOptions(field);
  return (
    <Section title={fieldDisplayLabel(field.name)} collapsible defaultOpen={false}>
      <Stack gap={8}>
        <Field label="Type">
          <Select
            name={`field-type-${fieldKey}`}
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
              name={`field-options-${fieldKey}`}
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
        <Field label="Required">
          <Toggle
            name={`field-required-${fieldKey}`}
            label="Required"
            value={field.required === true}
            onCommit={(required) =>
              onDefineField({
                ...field,
                ...(required ? { required: true } : { required: undefined }),
              })
            }
          />
        </Field>
        {field.type === 'array' || field.type === 'object' ? (
          <CompositeFieldEditor
            field={field}
            fieldKey={fieldKey}
            onDefineField={onDefineField}
            onInvalid={onInvalid}
          />
        ) : null}
        <FieldDefaultEditor
          field={field}
          fieldKey={fieldKey}
          onDefineField={onDefineField}
          onInvalid={onInvalid}
        />
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

function CompositeFieldEditor({
  field,
  fieldKey,
  onDefineField,
  onInvalid,
}: {
  field: FieldDefinition;
  fieldKey: string;
  onDefineField: (field: FieldDefinition) => void;
  onInvalid?: (message: string) => void;
}) {
  const items = field.items ?? defaultItemsFor(field.type);
  const objectItems: FieldItems =
    items.type === 'object' ? items : { type: 'object', fields: [] };

  if (field.type === 'array') {
    return (
      <Section title="Items" collapsible defaultOpen>
        <Stack gap={8}>
          <Field label="Item type">
            <Select
              name={`field-item-type-${fieldKey}`}
              value={items.type}
              options={creatableFieldTypes.map((type) => ({ value: type, label: type }))}
              onCommit={(next) => {
                const type = next as FieldType;
                onDefineField(
                  replaceFieldItems(field, {
                    type,
                    ...(type === 'object' ? { fields: objectItems.fields ?? [] } : {}),
                  }),
                );
              }}
            />
          </Field>
          {items.type === 'object' ? (
            <NestedFieldsEditor
              fields={items.fields ?? []}
              scopeKey={`${fieldKey}-item`}
              onChange={(fields) =>
                onDefineField(replaceFieldItems(field, { type: 'object', fields }))
              }
              onInvalid={onInvalid}
            />
          ) : null}
        </Stack>
      </Section>
    );
  }

  return (
    <Section title="Properties" collapsible defaultOpen>
      <NestedFieldsEditor
        fields={objectItems.fields ?? []}
        scopeKey={`${fieldKey}-object`}
        onChange={(fields) =>
          onDefineField(replaceFieldItems(field, { type: 'object', fields }))
        }
        onInvalid={onInvalid}
      />
    </Section>
  );
}

function NestedFieldsEditor({
  fields,
  scopeKey,
  onChange,
  onInvalid,
}: {
  fields: FieldDefinition[];
  scopeKey: string;
  onChange: (fields: FieldDefinition[]) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Stack gap={8}>
      {fields.length === 0 ? <p className="meta">No nested fields yet.</p> : null}
      {fields.map((nestedField) => (
        <FieldDefinitionCard
          key={nestedField.name}
          field={nestedField}
          fieldKey={`${scopeKey}-${nestedField.name}`}
          onDefineField={(next) =>
            onChange(fields.map((item) => (item.name === nestedField.name ? next : item)))
          }
          onRemoveField={(name) => onChange(fields.filter((item) => item.name !== name))}
          onInvalid={onInvalid}
        />
      ))}
      <AddFieldForm
        fieldKey={`new-${scopeKey}`}
        title="Add nested field"
        onDefineField={(next) => onChange([...fields, next])}
        onInvalid={onInvalid}
      />
    </Stack>
  );
}

function defaultItemsFor(type: FieldType): FieldItems {
  return type === 'array' ? { type: 'text' } : { type: 'object', fields: [] };
}

function FieldDefaultEditor({
  field,
  fieldKey = field.name,
  onDefineField,
  onInvalid,
}: {
  field: FieldDefinition;
  fieldKey?: string;
  onDefineField: (field: FieldDefinition) => void;
  onInvalid?: (message: string) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <Field label="Default">
        <Inline gap={8}>
          <Toggle
            name={`default-${fieldKey}`}
            label="On"
            value={field.default === true}
            onCommit={(checked) => onDefineField({ ...field, default: checked })}
          />
          {field.default !== undefined ? (
            <button
              type="button"
              className="text-button"
              name={`clear-default-${fieldKey}`}
              onClick={() => {
                const next = { ...field };
                delete next.default;
                onDefineField(next);
              }}
            >
              Clear default
            </button>
          ) : null}
        </Inline>
      </Field>
    );
  }
  if (field.type === 'enum') {
    return (
      <Field label="Default">
        <Select
          name={`default-${fieldKey}`}
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
        name={`default-${fieldKey}`}
        value={
          field.default === undefined
            ? ''
            : field.type === 'array' || field.type === 'object'
              ? JSON.stringify(field.default)
              : String(field.default)
        }
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
  fieldKey = 'new-field',
  title = 'Add field',
  onDefineField,
  onInvalid,
}: {
  fieldKey?: string;
  title?: string;
  onDefineField: (field: FieldDefinition) => void;
  onInvalid?: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [rawDefault, setRawDefault] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [booleanDefault, setBooleanDefault] = useState(false);
  const [required, setRequired] = useState(false);
  const [open, setOpen] = useState(false);

  function resetDraft() {
    setName('');
    setRawDefault('');
    setOptionsText('');
    setBooleanDefault(false);
    setRequired(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-button"
        name={fieldKey === 'new-field' ? 'open-add-field' : `open-${fieldKey}`}
        onClick={() => setOpen(true)}
      >
        {title}
      </button>
    );
  }

  return (
    <Section
      title={title}
      action={
        <button type="button" className="text-button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      }
    >
      <Stack gap={8}>
        <Field label="Name">
          <TextInput
            name={`${fieldKey}-name`}
            value={name}
            placeholder="label"
            onChange={setName}
          />
        </Field>
        <Field label="Type">
          <Select
            name={`${fieldKey}-type`}
            value={type}
            options={creatableFieldTypes.map((item) => ({ value: item, label: item }))}
            onCommit={(next) => setType(next as FieldType)}
          />
        </Field>
        {type === 'enum' ? (
          <Field label="Options">
            <TextInput
              name={`${fieldKey}-options`}
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
            <TextInput
              name={`${fieldKey}-default`}
              value={rawDefault}
              placeholder={type === 'array' || type === 'object' ? 'JSON (optional)' : undefined}
              onChange={setRawDefault}
            />
          </Field>
        )}
        <Field label="Required">
          <Toggle
            name={`${fieldKey}-required`}
            label="Required"
            value={required}
            onCommit={setRequired}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          name={`add-${fieldKey}`}
          onClick={() => {
            try {
              onDefineField(
                fieldDefinitionFromDraft({
                  name,
                  type,
                  rawDefault,
                  optionsText,
                  booleanDefault,
                  required,
                }),
              );
              resetDraft();
              setOpen(false);
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
