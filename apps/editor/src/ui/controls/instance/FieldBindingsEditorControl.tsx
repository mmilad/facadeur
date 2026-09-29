import type { FieldDefinition } from '@facadeur/core';
import { Field, Section, Select, Stack } from '../../form/index.js';
import '../../form/form.css';
import { dataPathOptions, type DataPathOption } from '../data/DataDirectivesEditorControl.js';
import { fieldDisplayLabel } from '../data/field-label.js';

export function FieldBindingsEditorControl({
  fields,
  dataFields,
  bindings,
  onChange,
}: {
  fields: FieldDefinition[];
  dataFields: FieldDefinition[];
  bindings: Record<string, string> | undefined;
  onChange: (bindings: Record<string, string> | null) => void;
}) {
  const paths = dataPathOptions(dataFields);
  return (
    <Section title="Data bindings" collapsible defaultOpen>
      {!fields.length ? (
        <p className="meta">This component exposes no fields to bind.</p>
      ) : !paths.length ? (
        <p className="meta">Define data fields before binding this instance.</p>
      ) : (
        <Stack gap={8}>
          <p className="meta">Map component inputs to fields in the current data scope.</p>
          {fields.map((field) => (
            <FieldBindingRow
              key={field.name}
              field={field}
              paths={paths}
              value={bindings?.[field.name]}
              onChange={(path) => {
                const next = { ...(bindings ?? {}) };
                if (path) next[field.name] = path;
                else delete next[field.name];
                onChange(Object.keys(next).length ? next : null);
              }}
            />
          ))}
        </Stack>
      )}
    </Section>
  );
}

function FieldBindingRow({
  field,
  paths,
  value,
  onChange,
}: {
  field: FieldDefinition;
  paths: DataPathOption[];
  value?: string;
  onChange: (path: string) => void;
}) {
  const options =
    value && !paths.some((option) => option.value === value)
      ? [{ value, label: `Missing: ${value}` }, ...paths]
      : paths;
  return (
    <Field label={fieldDisplayLabel(field.name)}>
      <Select
        name={`field-binding-${field.name}`}
        value={value ?? ''}
        options={[{ value: '', label: 'Use value / default' }, ...options]}
        onCommit={onChange}
      />
    </Field>
  );
}
