import { useMemo } from 'react';
import type { ComponentSchemaUse, NamedSchema, PreviewControl } from '../../domain/schema-use.js';
import {
  getAt,
  matchingChoice,
  previewControlsForUse,
  retargetControl,
  setAt,
} from '../../domain/schema-use.js';
import { getComponentSchemaUse, setComponentSchemaUse } from '../../domain/schema-library.js';
import { Checkbox, Combobox, Field, NumberInput, Stack, TextInput } from '../form/index.js';

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}.${name}` : name;
}

function seedControl(control: PreviewControl): unknown {
  if (control.kind === 'object' || control.kind === 'choice') {
    const record: Record<string, unknown> = {};
    const source =
      control.kind === 'choice' ? (control.children?.[0]?.children ?? []) : (control.children ?? []);
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
  documentId,
  use,
  schemas,
}: {
  documentId: string;
  use: ComponentSchemaUse | null;
  schemas: NamedSchema[];
}) {
  const controls = useMemo(
    () => (use ? previewControlsForUse(use, schemas) : []),
    [use, schemas],
  );
  const defaults = use?.defaults;

  function commitDefaults(nextDefaults: unknown) {
    const current = getComponentSchemaUse(documentId) ?? use;
    if (!current?.direct && !current?.fields?.length) return;
    const next: ComponentSchemaUse = current.fields?.length
      ? { fields: current.fields, defaults: nextDefaults }
      : { direct: current.direct!, defaults: nextDefaults };
    setComponentSchemaUse(documentId, next);
  }

  function writeAt(path: string, value: unknown) {
    const current = getComponentSchemaUse(documentId);
    commitDefaults(setAt(current?.defaults ?? {}, path, value));
  }

  return (
    <section className="schema-preview" aria-labelledby="schema-defaults-title">
      <h3 id="schema-defaults-title">Defaults</h3>
      {controls.length ? (
        <Stack gap={12}>
          {controls.map((control) => (
            <PreviewControlField
              key={control.path || control.label}
              control={control}
              defaults={defaults}
              onWrite={writeAt}
            />
          ))}
        </Stack>
      ) : (
        <p className="meta">Choose a type or name a field to fill in an example.</p>
      )}
    </section>
  );
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
