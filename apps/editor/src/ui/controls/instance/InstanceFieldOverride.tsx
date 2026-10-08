import { type FieldDefinition, type FieldValue } from '@facadeur/core';
import { Field, Select, TextArea, TextInput, Toggle } from '../../form/index';
import { fieldDisplayLabel } from '../data/field-label';
import { parseInstanceFieldValue } from '../data/value';
import { parseFieldValue } from '../../../domain/field-values';
import { JsonSchemaContractFieldEditor } from '../../schema/JsonSchemaContractFieldEditor';

export function InstanceFieldOverride({
  field,
  override,
  boundPath,
  onSetField,
  onInvalid,
  preserveEmptyStrings = false,
}: {
  field: FieldDefinition;
  override: FieldValue | undefined;
  boundPath?: string;
  onSetField: (value: FieldValue | null) => void;
  onInvalid?: (message: string) => void;
  preserveEmptyStrings?: boolean;
}) {
  const label = boundPath
    ? `${fieldDisplayLabel(field.name)} · bound to ${boundPath}`
    : fieldDisplayLabel(field.name);
  if (field.type === 'enum' && field.options?.length) {
    const current = typeof override === 'string' ? override : '';
    return (
      <Field label={label}>
        <Select
          name={`field-${field.name}`}
          aria-label={label}
          value={current}
          options={[
            {
              value: '',
              label: `Default (${field.default === undefined ? 'none' : String(field.default)})`,
            },
            ...field.options.map((option) => ({ value: option, label: option })),
          ]}
          onCommit={(next) => onSetField(next || null)}
        />
      </Field>
    );
  }
  if (field.type === 'boolean') {
    const checked = typeof override === 'boolean' ? override : field.default === true;
    return (
      <Field label={label}>
        <Toggle
          name={`field-${field.name}`}
          aria-label={label}
          label="On"
          value={checked}
          onCommit={(next) => onSetField(next)}
        />
      </Field>
    );
  }
  if ((field.type === 'array' || field.type === 'object') && (field.schema || field.items)) {
    return (
      <>
        <JsonSchemaContractFieldEditor
          field={field}
          value={override ?? field.default}
          onChange={onSetField}
        />
        <button type="button" className="eu-button" onClick={() => onSetField(null)}>
          Use default
        </button>
        <details className="field-schema">
          <summary>Advanced JSON</summary>
          <TextArea
            name={`field-${field.name}`}
            aria-label={label}
            value={override === undefined ? '' : JSON.stringify(override)}
            rows={4}
            onCommit={(raw) => {
              try {
                onSetField(raw.trim() === '' ? null : parseInstanceFieldValue(field, raw));
              } catch (error) {
                onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
              }
            }}
          />
        </details>
      </>
    );
  }
  if (field.type === 'array' || field.type === 'object') {
    const shown =
      override === undefined || override === null ? '' : JSON.stringify(override, null, 2);
    const placeholder =
      boundPath !== undefined
        ? `Bound to ${boundPath}`
        : field.default === undefined
          ? undefined
          : JSON.stringify(field.default, null, 2);
    return (
      <Field label={label}>
        <TextArea
          name={`field-${field.name}`}
          aria-label={label}
          value={shown}
          placeholder={boundPath ? `Preview override · ${boundPath}` : placeholder}
          rows={4}
          onCommit={(raw) => {
            try {
              onSetField(raw.trim() === '' ? null : parseInstanceFieldValue(field, raw));
            } catch (error) {
              onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
            }
          }}
        />
      </Field>
    );
  }
  const shown = override === undefined || override === null ? '' : String(override);
  const placeholder =
    boundPath !== undefined
      ? `Bound to ${boundPath}`
      : field.default === undefined
        ? undefined
        : String(field.default);
  return (
    <Field label={label}>
      <TextInput
        name={`field-${field.name}`}
        aria-label={label}
        value={shown}
        placeholder={boundPath ? `Preview override · ${boundPath}` : placeholder}
        onCommit={(raw) => {
          try {
            onSetField(
              preserveEmptyStrings
                ? (parseFieldValue(field, raw, { empty: 'preserve' }) ?? null)
                : raw === ''
                  ? null
                  : parseInstanceFieldValue(field, raw),
            );
          } catch (error) {
            onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
          }
        }}
      />
    </Field>
  );
}
