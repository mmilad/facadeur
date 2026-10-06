import type { FieldDefinition, FieldValue, JsonSchema } from '@facadeur/core';
import { useMemo } from 'react';
import type {
  ComponentSchemaUse,
  NamedSchema,
  PreviewControl,
} from '../../domain/schema/schema-use.js';
import {
  getAt,
  matchingChoice,
  previewControlsForUse,
  retargetControl,
  setAt,
} from '../../domain/schema/schema-use.js';
import { Checkbox, Combobox, Field, NumberInput, Stack, TextInput } from '../form/index.js';
import type { EditorSession } from '../../domain/session.js';
import { fieldDataSchema } from '@facadeur/core';
import { fieldDisplayLabel } from '../controls/data/field-label.js';
import { SchemaValueForm } from '../controls/data/SchemaValueForm.js';
import { isFieldValue } from '../controls/data/item-array-schema.js';

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}.${name}` : name;
}

function seedControl(control: PreviewControl): unknown {
  if (control.kind === 'object' || control.kind === 'choice') {
    const record: Record<string, unknown> = {};
    const source =
      control.kind === 'choice'
        ? (control.children?.[0]?.children ?? [])
        : (control.children ?? []);
    for (const child of source) {
      const key = child.path.split('.').pop();
      if (key) record[key] = seedControl(child);
    }
    return record;
  }
  if (control.kind === 'array') return [];
  if (control.kind === 'boolean') return false;
  if (control.kind === 'number' || control.kind === 'integer') return null;
  if (control.kind === 'enum') return control.options?.[0]?.value ?? '';
  return '';
}

export function SchemaPreviewForm({
  session,
  use,
  schemas,
  fields,
}: {
  session: EditorSession;
  use: ComponentSchemaUse | null;
  schemas: NamedSchema[];
  fields: FieldDefinition[];
}) {
  const controls = useMemo(() => {
    const assigned = use ? previewControlsForUse(use, schemas) : [];
    const names = new Set(assigned.map((control) => control.path.split('.')[0]).filter(Boolean));
    return [...assigned, ...fields.filter((field) => !names.has(field.name)).map(controlForField)];
  }, [fields, schemas, use]);
  const defaults = use?.defaults;

  function commitDefaults(nextDefaults: unknown) {
    const current = use ?? undefined;
    const next: ComponentSchemaUse = {
      ...(current?.direct ? { direct: current.direct } : {}),
      ...(current?.fields ? { fields: current.fields } : {}),
      defaults: nextDefaults,
    };
    session.execute({ type: 'setSchemaUse', schemaUse: next });
  }

  function writeAt(path: string, value: unknown) {
    commitDefaults(setAt(use?.defaults ?? {}, path, value));
  }

  const libraryControls = controls.filter(
    (control) => !fields.some((field) => field.name === control.path),
  );
  const documentControls = controls.filter((control) =>
    fields.some((field) => field.name === control.path),
  );
  const mergeDocumentFields = canCombineDocumentDefaults(documentControls, fields);

  return (
    <section className="schema-preview" aria-labelledby="schema-defaults-title">
      <h3 id="schema-defaults-title">Defaults</h3>
      {controls.length ? (
        <Stack gap={12}>
          {libraryControls.map((control) => (
            <PreviewControlField
              key={control.path || control.label}
              control={control}
              defaults={defaults}
              onWrite={writeAt}
            />
          ))}
          {mergeDocumentFields ? (
            <SchemaValueForm
              key="document-field-defaults"
              label="Field defaults"
              schema={documentDefaultsSchema(fields)}
              value={documentDefaultsValue(defaults, fields)}
              onChange={(next) => commitDefaults(next)}
            />
          ) : (
            documentControls.map((control) => {
              const field = fields.find((field) => field.name === control.path);
              if (!field) return null;
              const value = getAt(defaults, control.path) ?? field.default;
              return (
                <SchemaValueForm
                  key={control.path}
                  label={fieldDisplayLabel(field.name)}
                  schema={fieldDataSchema(field)}
                  value={isFieldValue(value) ? value : undefined}
                  onChange={(next) => writeAt(control.path, next)}
                />
              );
            })
          )}
        </Stack>
      ) : (
        <p className="meta">Choose a type or name a field to fill in an example.</p>
      )}
    </section>
  );
}

function canCombineDocumentDefaults(
  controls: PreviewControl[],
  fields: FieldDefinition[],
): boolean {
  if (!fields.length || controls.length !== fields.length) return false;
  const names = new Set(fields.map((field) => field.name));
  return controls.every((control) => !control.path.includes('.') && names.has(control.path));
}

function documentDefaultsSchema(fields: FieldDefinition[]): JsonSchema {
  const required = fields.filter((field) => field.required).map((field) => field.name);
  return {
    type: 'object',
    properties: Object.fromEntries(fields.map((field) => [field.name, fieldDataSchema(field)])),
    ...(required.length ? { required } : {}),
  };
}

function documentDefaultsValue(defaults: unknown, fields: FieldDefinition[]): FieldValue {
  const record: Record<string, FieldValue> = {};
  for (const field of fields) {
    const value = getAt(defaults, field.name) ?? field.default;
    if (isFieldValue(value)) record[field.name] = value;
  }
  return record;
}

function controlForField(field: FieldDefinition): PreviewControl {
  const required = field.required === true;
  if (field.type === 'enum') {
    return {
      path: field.name,
      label: field.name,
      required,
      kind: 'enum',
      options: (field.options ?? []).map((value) => ({ value, label: value })),
    };
  }
  if (field.type === 'boolean')
    return { path: field.name, label: field.name, required, kind: 'boolean' };
  if (field.type === 'number')
    return { path: field.name, label: field.name, required, kind: 'number' };
  if (field.type === 'array')
    return {
      path: field.name,
      label: field.name,
      required,
      kind: 'array',
      item: controlForField({ name: '0', type: field.items?.type ?? 'text' }),
    };
  if (field.type === 'object')
    return { path: field.name, label: field.name, required, kind: 'object' };
  return { path: field.name, label: field.name, required, kind: 'string' };
}

function PreviewControlField({
  control,
  defaults,
  onWrite,
}: {
  control: PreviewControl;
  defaults: unknown;
  onWrite: (path: string, value: unknown) => void;
}) {
  const value = getAt(defaults, control.path);

  switch (control.kind) {
    case 'string':
      return (
        <Field label={control.label}>
          <TextInput
            name={`default-${control.path}`}
            value={value === undefined || value === null ? '' : String(value)}
            onCommit={(next) => onWrite(control.path, next)}
          />
        </Field>
      );
    case 'number':
    case 'integer':
      return (
        <Field label={control.label}>
          <NumberInput
            name={`default-${control.path}`}
            value={typeof value === 'number' ? value : null}
            step={control.kind === 'integer' ? 1 : undefined}
            onCommit={(next) => onWrite(control.path, next)}
          />
        </Field>
      );
    case 'boolean':
      return (
        <Checkbox
          name={`default-${control.path}`}
          label={control.label}
          value={Boolean(value)}
          onCommit={(next) => onWrite(control.path, next)}
        />
      );
    case 'enum':
      return (
        <Field label={control.label}>
          <Combobox
            name={`default-${control.path}`}
            value={value === undefined || value === null ? '' : String(value)}
            options={control.options ?? []}
            onCommit={(next) => onWrite(control.path, next)}
          />
        </Field>
      );
    case 'object':
      return (
        <fieldset className="schema-preview-object">
          <legend>{control.label}</legend>
          <Stack gap={10}>
            {(control.children ?? []).map((child) => (
              <PreviewControlField
                key={child.path}
                control={child}
                defaults={defaults}
                onWrite={onWrite}
              />
            ))}
          </Stack>
        </fieldset>
      );
    case 'array': {
      const items = Array.isArray(value) ? value : [];
      const itemControl = control.item;
      if (!itemControl) return null;
      return (
        <Field label={control.label}>
          <Stack gap={8}>
            {items.map((_, index) => (
              <div key={index} className="schema-preview-array-row">
                <PreviewControlField
                  control={retargetControl(itemControl, joinPath(control.path, String(index)))}
                  defaults={defaults}
                  onWrite={onWrite}
                />
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    const next = items.filter((__, itemIndex) => itemIndex !== index);
                    onWrite(control.path, next);
                  }}
                >
                  Remove item
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                onWrite(control.path, [...items, seedControl(itemControl)]);
              }}
            >
              Add item
            </button>
          </Stack>
        </Field>
      );
    }
    case 'choice': {
      const branchKey = matchingChoice(control, value);
      const branchIndex = Number(branchKey);
      const active = control.children?.[branchIndex];
      return (
        <Stack gap={10}>
          <Field label={control.label}>
            <Combobox
              name={`default-choice-${control.path}`}
              value={branchKey}
              options={control.options ?? []}
              onCommit={(next) => {
                const index = Number(next);
                const branch = control.children?.[index];
                onWrite(control.path, branch ? seedControl(branch) : {});
              }}
            />
          </Field>
          {active ? (
            <PreviewControlField control={active} defaults={defaults} onWrite={onWrite} />
          ) : null}
        </Stack>
      );
    }
    default:
      return null;
  }
}
