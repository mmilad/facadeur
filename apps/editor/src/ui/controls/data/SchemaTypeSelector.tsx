import { useEffect, useMemo, useState } from 'react';
import type { SchemaFieldUse, SchemaTypeSelection } from '../../../domain/schema/schema-use';
import { parseTypeRef, typeRefValue } from '../../../domain/schema/schema-use';
import type { LibrarySchema } from '../../../domain/schema/schema-library';
import { Combobox, Field, SegmentedControl, Stack, TextInput } from '../../form/index';
import { schemaTypeOptions } from './schema-type-options';

type SchemaUseMode = 'direct' | 'fields';

function modeForUse(use: SchemaTypeSelection | null): SchemaUseMode {
  return use?.fields?.length ? 'fields' : 'direct';
}

function emptyFieldRow(): SchemaFieldUse {
  return { name: '', type: { kind: 'type', type: 'string' } };
}

/** Shared contract mode, schema picker, and named-field editor. */
export function SchemaTypeSelector({
  name,
  value,
  schemas,
  onChange,
  onOpenSchemas,
  helperText,
}: {
  name: string;
  value: SchemaTypeSelection | null;
  schemas: LibrarySchema[];
  onChange: (value: SchemaTypeSelection | null) => void;
  onOpenSchemas?: () => void;
  helperText?: string;
}) {
  const modeName = name === 'schema-use' ? 'schema-use-mode' : `${name}-mode`;
  const typeName = name === 'schema-use' ? 'schema-type' : `${name}-type`;
  const fieldPrefix = name === 'schema-use' ? 'schema-field' : `${name}-field`;
  const typeOptions = useMemo(() => schemaTypeOptions(schemas), [schemas]);
  // Some owning editors adapt a canonical contract into a fresh selection object
  // on every render. Synchronize only when its actual value changes so local
  // blank rows and picker state survive those renders.
  const valueKey = JSON.stringify(value);
  const [mode, setMode] = useState<SchemaUseMode>(() => modeForUse(value));
  const [fieldRows, setFieldRows] = useState<SchemaFieldUse[]>(() =>
    value?.fields?.length ? value.fields : [emptyFieldRow()],
  );

  useEffect(() => {
    setMode(modeForUse(value));
    setFieldRows(value?.fields?.length ? value.fields : [emptyFieldRow()]);
  }, [valueKey]);

  function saveMode(nextMode: SchemaUseMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === 'direct') {
      onChange({
        direct: value?.direct ??
          value?.fields?.find((field) => field.name.trim())?.type ?? {
            kind: 'type',
            type: 'string',
          },
      });
      return;
    }
    const seed = value?.fields?.length
      ? value.fields
      : value?.direct
        ? [{ name: 'value', type: value.direct }]
        : [emptyFieldRow()];
    setFieldRows(seed);
    const fields = seed.filter((row) => row.name.trim());
    onChange(fields.length ? { fields } : null);
  }

  function commitFieldRows(rows: SchemaFieldUse[]) {
    setFieldRows(rows);
    const fields = rows
      .filter((row) => row.name.trim())
      .map((row) => ({ ...row, name: row.name.trim() }));
    onChange(fields.length ? { fields } : null);
  }

  function updateFieldRow(index: number, patch: Partial<SchemaFieldUse>) {
    const next = fieldRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    setFieldRows(next);
    if (next[index]?.name.trim()) commitFieldRows(next);
  }

  function addFieldRow() {
    setFieldRows((rows) => [...rows, emptyFieldRow()]);
  }

  function removeFieldRow(index: number) {
    const next = fieldRows.filter((_, rowIndex) => rowIndex !== index);
    const rows = next.length ? next : [emptyFieldRow()];
    setFieldRows(rows);
    if (fieldRows[index]?.name.trim()) commitFieldRows(rows);
  }

  return (
    <div className="schema-use-editor">
      <Field label="Contract">
        <SegmentedControl
          name={modeName}
          value={mode}
          options={[
            { value: 'direct', label: 'Use one type' },
            { value: 'fields', label: 'Declare fields' },
          ]}
          onCommit={(next) => saveMode(next as SchemaUseMode)}
        />
      </Field>

      {mode === 'direct' ? (
        <Field label="Type">
          <Combobox
            name={typeName}
            value={value?.direct ? typeRefValue(value.direct) : ''}
            options={typeOptions}
            placeholder="Type or schema"
            onCommit={(raw) => {
              const direct = parseTypeRef(raw);
              if (direct) onChange({ direct });
            }}
          />
        </Field>
      ) : (
        <Stack gap={8}>
          {fieldRows.map((row, index) => (
            <div key={index} className="schema-use-field-row">
              <Field label="Name">
                <TextInput
                  name={`${fieldPrefix}-name-${index}`}
                  value={row.name}
                  placeholder="Field name"
                  onCommit={(fieldName) => updateFieldRow(index, { name: fieldName })}
                />
              </Field>
              <Field label="Type">
                <Combobox
                  name={`${fieldPrefix}-type-${index}`}
                  value={typeRefValue(row.type)}
                  options={typeOptions}
                  placeholder="Type or schema"
                  onCommit={(raw) => {
                    const type = parseTypeRef(raw);
                    if (type) updateFieldRow(index, { type });
                  }}
                />
              </Field>
              <button type="button" className="text-button" onClick={() => removeFieldRow(index)}>
                Remove field
              </button>
            </div>
          ))}
          <button type="button" className="text-button" onClick={addFieldRow}>
            Add field
          </button>
        </Stack>
      )}

      {onOpenSchemas ? (
        <button type="button" className="text-button" onClick={onOpenSchemas}>
          Edit schemas
        </button>
      ) : null}
      {helperText ? <p className="meta">{helperText}</p> : null}
    </div>
  );
}
