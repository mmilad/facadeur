import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  getComponentSchemaUse,
  getSchemaLibrary,
  setComponentSchemaUse,
  subscribeSchemaLibrary,
} from '../../domain/schema/schema-library.js';
import type { ComponentSchemaUse, SchemaFieldUse } from '../../domain/schema/schema-use.js';
import { parseTypeRef, typeRefValue } from '../../domain/schema/schema-use.js';
import { Combobox, Field, SegmentedControl, Stack, TextInput } from '../form/index.js';
import { SchemaPreviewForm } from './SchemaPreviewForm.js';
import { schemaTypeOptions } from './schema-type-options.js';

const emptyLibrary = { schemas: [], assignments: {} };

type SchemaUseMode = 'direct' | 'fields';

function modeForUse(use: ComponentSchemaUse | null): SchemaUseMode {
  if (use?.fields?.length) return 'fields';
  return 'direct';
}

function emptyFieldRow(): SchemaFieldUse {
  return { name: '', type: { kind: 'type', type: 'string' } };
}

export function SchemaUseControl({
  documentId,
  onOpenSchemas,
}: {
  documentId: string;
  onOpenSchemas: () => void;
}) {
  const library = useSyncExternalStore(
    subscribeSchemaLibrary,
    getSchemaLibrary,
    () => emptyLibrary,
  );
  const use = getComponentSchemaUse(documentId);
  const typeOptions = useMemo(() => schemaTypeOptions(library.schemas), [library.schemas]);
  const namedSchemas = useMemo(
    () =>
      library.schemas.map((schema) => ({
        id: schema.id,
        name: schema.name,
        schema: schema.schema,
      })),
    [library.schemas],
  );

  const [mode, setMode] = useState<SchemaUseMode>(() => modeForUse(use));
  const [fieldRows, setFieldRows] = useState<SchemaFieldUse[]>(() =>
    use?.fields?.length ? use.fields : [emptyFieldRow()],
  );

  useEffect(() => {
    const next = getComponentSchemaUse(documentId);
    setMode(modeForUse(next));
    setFieldRows(next?.fields?.length ? next.fields : [emptyFieldRow()]);
  }, [documentId]);

  function saveDirect(refValue: string) {
    const ref = parseTypeRef(refValue);
    if (!ref) return;
    setComponentSchemaUse(documentId, { direct: ref, defaults: use?.defaults });
  }

  function saveMode(nextMode: SchemaUseMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === 'direct') {
      setComponentSchemaUse(documentId, {
        direct: use?.direct ??
          use?.fields?.find((field) => field.name.trim())?.type ?? {
            kind: 'type',
            type: 'string',
          },
        defaults: use?.defaults,
      });
      return;
    }
    const seed = use?.fields?.length
      ? use.fields
      : use?.direct
        ? [{ name: 'value', type: use.direct }]
        : [emptyFieldRow()];
    setFieldRows(seed);
    const named = seed.filter((row) => row.name.trim());
    if (named.length) {
      setComponentSchemaUse(documentId, { fields: named, defaults: use?.defaults });
    }
  }

  function commitFieldRows(rows: SchemaFieldUse[]) {
    setFieldRows(rows);
    const fields = rows
      .filter((row) => row.name.trim())
      .map((row) => ({ ...row, name: row.name.trim() }));
    if (!fields.length) {
      if (use?.fields?.length)
        setComponentSchemaUse(
          documentId,
          use.defaults === undefined ? null : { defaults: use.defaults },
        );
      return;
    }
    setComponentSchemaUse(documentId, {
      fields,
      defaults: use?.defaults,
    });
  }

  function updateFieldRow(index: number, patch: Partial<SchemaFieldUse>) {
    const next = fieldRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );
    commitFieldRows(next);
  }

  function addFieldRow() {
    commitFieldRows([...fieldRows, emptyFieldRow()]);
  }

  function removeFieldRow(index: number) {
    const next = fieldRows.filter((_, rowIndex) => rowIndex !== index);
    commitFieldRows(next.length ? next : [emptyFieldRow()]);
  }

  const previewUse: ComponentSchemaUse | null = use ?? null;
  const directValue = use?.direct ? typeRefValue(use.direct) : '';

  return (
    <div className="schema-use">
      <div className="schema-use-editor">
        <Field label="Contract">
          <SegmentedControl
            name="schema-use-mode"
            value={mode}
            options={[
              { value: 'direct', label: 'Use one type' },
              { value: 'fields', label: 'Declare fields' },
            ]}
            onCommit={(value) => saveMode(value as SchemaUseMode)}
          />
        </Field>

        {mode === 'direct' ? (
          <Field label="Type">
            <Combobox
              name="schema-type"
              value={directValue}
              options={typeOptions}
              placeholder="Type or schema"
              onCommit={saveDirect}
            />
          </Field>
        ) : (
          <Stack gap={8}>
            {fieldRows.map((row, index) => (
              <div key={index} className="schema-use-field-row">
                <Field label="Name">
                  <TextInput
                    name={`schema-field-name-${index}`}
                    value={row.name}
                    placeholder="Field name"
                    onCommit={(name) => updateFieldRow(index, { name })}
                  />
                </Field>
                <Field label="Type">
                  <Combobox
                    name={`schema-field-type-${index}`}
                    value={typeRefValue(row.type)}
                    options={typeOptions}
                    placeholder="Type or schema"
                    onCommit={(value) => {
                      const type = parseTypeRef(value);
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

        <button type="button" className="text-button" onClick={onOpenSchemas}>
          Edit schemas
        </button>
        <p className="meta">
          Pick a type or named fields for defaults. Props below are still this document’s fields.
        </p>
      </div>

      <SchemaPreviewForm documentId={documentId} use={previewUse} schemas={namedSchemas} />
    </div>
  );
}
