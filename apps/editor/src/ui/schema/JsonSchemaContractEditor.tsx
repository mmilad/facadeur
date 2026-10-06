import { matchesSchemaValue, type FieldValue, type JsonSchema } from '@facadeur/core';
import { SchemaBuilderProvider } from 'jsonjoy-builder';
import 'jsonjoy-builder/styles.css';
import { useMemo } from 'react';
import type { FieldConfig, FieldGroupConfig } from '../form/schema/field-config.js';
import { Form, SchemaForm, TextArea } from '../form/index.js';
import { fieldDisplayLabel } from '../controls/data/field-label.js';
import {
  initialDraftForSchema,
  initialValueForSchema,
  isFieldValue,
} from '../controls/data/item-array-schema.js';
import { formFieldsForSchema } from './json-schema-form-config.js';
import './json-schema-contract-editor.css';

const CONTRACT_EDITOR_LABELS = {
  collapse: 'Collapse',
  expand: 'Expand',
  fieldAddNewButton: 'Add item',
};

export function JsonSchemaContractEditor({
  schema,
  value,
  label,
  onChange,
  advancedLabel = 'Advanced JSON',
  showAdvanced = true,
}: {
  schema: JsonSchema;
  value: FieldValue | undefined;
  label: string;
  onChange: (value: FieldValue) => void;
  advancedLabel?: string;
  showAdvanced?: boolean;
}) {
  const fields = useMemo(() => formFieldsForSchema(schema, label), [schema, label]);
  const root = useMemo(() => normalizeRootValue(schema, value), [schema, value]);

  return (
    <SchemaBuilderProvider messages={CONTRACT_EDITOR_LABELS}>
      <div className="jsonjoy eu-json-schema-contract-editor">
        <ContractForm fields={fields} root={root} onChange={onChange} />
        {showAdvanced ? (
          <details className="eu-json-schema-contract-editor__advanced">
            <summary>{advancedLabel}</summary>
            <TextArea
              aria-label={advancedLabel}
              value={JSON.stringify(root, null, 2)}
              rows={6}
              onCommit={(raw) => {
                try {
                  const parsed: unknown = JSON.parse(raw);
                  if (!isFieldValue(parsed) || !matchesSchemaValue(parsed, schema)) return;
                  onChange(parsed);
                } catch {
                  // Keep invalid JSON drafts local to the textarea until they parse and validate.
                }
              }}
            />
          </details>
        ) : null}
      </div>
    </SchemaBuilderProvider>
  );
}

function ContractForm({
  fields,
  root,
  onChange,
}: {
  fields: (FieldConfig | FieldGroupConfig)[];
  root: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  if (Array.isArray(root)) {
    const arrayField = fields.find((entry): entry is FieldConfig => entry.type !== 'section');
    if (arrayField?.type === 'array') {
      return (
        <Form
          value={{ items: root } as Record<string, FieldValue>}
          onChange={(next) => onChange((next as { items: FieldValue }).items)}
        >
          <SchemaForm fields={[{ ...arrayField, name: 'items', collapsibleRows: true }]} />
        </Form>
      );
    }
  }
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    return (
      <Form
        value={root as Record<string, FieldValue>}
        onChange={(next) => onChange(next as FieldValue)}
      >
        <SchemaForm fields={fields} />
      </Form>
    );
  }
  const scalarField = fields[0];
  if (!scalarField || scalarField.type === 'section') return null;
  return (
    <Form
      value={{ value: root } as Record<string, FieldValue>}
      onChange={(next) => onChange((next as { value: FieldValue }).value)}
    >
      <SchemaForm fields={[{ ...scalarField, name: 'value' }]} />
    </Form>
  );
}

function normalizeRootValue(schema: JsonSchema, value: FieldValue | undefined): FieldValue {
  if (value !== undefined) return value;
  const initial = initialValueForSchema(schema);
  if (initial !== undefined) return initial;
  return initialDraftForSchema(schema);
}
