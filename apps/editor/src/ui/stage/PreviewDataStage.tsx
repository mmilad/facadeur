import { resolvePreviewData, type FieldDefinition, type FieldValue } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../domain/session.js';
import {
  parsePreviewFieldValue,
  patchPreviewData,
  previewValueSource,
} from '../../domain/preview-data.js';
import { variantLabel } from '../../domain/variant-edit.js';
import { fieldDisplayLabel } from '../controls/data/field-label.js';
import { Field, NumberInput, Select, Stack, TextArea, TextInput, Toggle } from '../form/index.js';

/** Edits the instance preview values independently from the component schema. */
export function PreviewDataStage({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const document = snap.document;
  const values = resolvePreviewData(document, snap.activeVariantName);
  const baseLabel = variantLabel(document, 'default');

  function write(field: FieldDefinition, value: FieldValue | undefined) {
    session.execute({
      type: 'setPreviewData',
      previewData: patchPreviewData(
        document.previewData,
        snap.activeVariantName,
        field.name,
        value,
      ),
    });
  }

  return (
    <section
      className="schema-stage preview-data-stage eu-form"
      aria-label="Preview data"
      data-testid="preview-data-stage"
    >
      <header className="schema-stage-head">
        <div>
          <p className="schema-stage-kicker">Component instances</p>
          <h1>Preview data</h1>
        </div>
        <p className="schema-stage-note">
          {snap.activeVariantName
            ? `Editing ${document.variantLabels?.[snap.activeVariantName] ?? snap.activeVariantName}; values are sparse overrides.`
            : 'Set the values used when this document is rendered in the editor.'}
        </p>
      </header>
      <div className="schema-stage-body">
        <div className="schema-stage-grid">
          <section
            className="schema-card preview-data-slot"
            aria-labelledby="preview-values-title"
            data-testid="preview-data-slot"
          >
            <h2 id="preview-values-title">Preview values</h2>
            {document.fields.length ? (
              <Stack gap={12}>
                {document.fields.map((field) => (
                  <PreviewField
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    source={previewValueSource(document, field, snap.activeVariantName)}
                    variantName={snap.activeVariantName}
                    baseLabel={baseLabel}
                    canClear={hasExplicitPreviewValue(
                      document.previewData,
                      snap.activeVariantName,
                      field.name,
                    )}
                    onChange={(next) => write(field, next)}
                    onInvalid={(message) => session.setNotice(message, 'error')}
                  />
                ))}
              </Stack>
            ) : (
              <p className="inspector-empty">
                Define fields in Schema before entering preview data.
              </p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function PreviewField({
  field,
  value,
  source,
  variantName,
  baseLabel,
  canClear,
  onChange,
  onInvalid,
}: {
  field: FieldDefinition;
  value: FieldValue | undefined;
  source: ReturnType<typeof previewValueSource>;
  variantName: string | null;
  baseLabel: string;
  canClear: boolean;
  onChange: (value: FieldValue | undefined) => void;
  onInvalid: (message: string) => void;
}) {
  const label = fieldDisplayLabel(field.name);
  const hint = `${sourceLabel(source, variantName, baseLabel)}${field.required ? ' · Required' : ''}`;
  const status = (
    <span className="eu-field__hint" aria-label={hint}>
      {hint}
    </span>
  );
  const clear = canClear ? (
    <button type="button" className="text-button" onClick={() => onChange(undefined)}>
      {variantName ? `Reset to ${baseLabel}` : 'Clear preview value'}
    </button>
  ) : null;

  if (field.type === 'boolean') {
    return (
      <Field label={label} required={field.required}>
        {status}
        <div className="eu-form-row">
          <Toggle
            name={`preview-${field.name}`}
            aria-label={label}
            label={value === true ? 'On' : 'Off'}
            value={value === true}
            onCommit={(next) => onChange(next)}
          />
          {clear}
        </div>
        {field.required && value === undefined ? <MissingPreviewHint /> : null}
      </Field>
    );
  }

  if (field.type === 'enum') {
    return (
      <Field label={label} required={field.required}>
        {status}
        <div className="eu-form-row">
          <Select
            name={`preview-${field.name}`}
            aria-label={label}
            value={typeof value === 'string' ? value : ''}
            options={[
              { value: '', label: 'Missing preview value' },
              ...(field.options ?? []).map((option) => ({ value: option, label: option })),
            ]}
            onCommit={(next) => {
              try {
                onChange(parsePreviewFieldValue(field, next));
              } catch (error) {
                onInvalid(error instanceof Error ? error.message : 'Invalid preview value');
              }
            }}
          />
          {clear}
        </div>
        {field.required && value === undefined ? <MissingPreviewHint /> : null}
      </Field>
    );
  }

  if (field.type === 'number') {
    return (
      <Field label={label} required={field.required}>
        {status}
        <div className="eu-form-row">
          <NumberInput
            name={`preview-${field.name}`}
            aria-label={label}
            value={typeof value === 'number' ? value : null}
            onCommit={(next) => onChange(next === null ? undefined : next)}
          />
          {clear}
        </div>
        {field.required && value === undefined ? <MissingPreviewHint /> : null}
      </Field>
    );
  }

  if (field.type === 'array' || field.type === 'object') {
    return (
      <Field label={label} required={field.required}>
        {status}
        <div className="eu-form-row eu-form-row-top">
          <TextArea
            name={`preview-${field.name}`}
            aria-label={label}
            value={value === undefined ? '' : JSON.stringify(value)}
            rows={3}
            onCommit={(next) => {
              try {
                onChange(parsePreviewFieldValue(field, next));
              } catch (error) {
                // Keep malformed JSON local to the draft; never write it to the document.
                onInvalid(error instanceof Error ? error.message : 'Invalid preview value');
              }
            }}
          />
          {clear}
        </div>
        {field.required && value === undefined ? <MissingPreviewHint /> : null}
      </Field>
    );
  }

  return (
    <Field label={label} required={field.required}>
      {status}
      <div className="eu-form-row">
        <TextInput
          name={`preview-${field.name}`}
          aria-label={label}
          value={typeof value === 'string' ? value : ''}
          onCommit={(next) => onChange(parsePreviewFieldValue(field, next))}
        />
        {clear}
      </div>
      {field.required && value === undefined ? <MissingPreviewHint /> : null}
    </Field>
  );
}

function MissingPreviewHint() {
  return <span className="eu-field__hint">Required preview value is missing.</span>;
}

function sourceLabel(
  source: ReturnType<typeof previewValueSource>,
  variantName: string | null,
  baseLabel: string,
): string {
  switch (source) {
    case 'variant':
      return 'Variant override';
    case 'base':
      return variantName ? `Inherited from ${baseLabel}` : 'Base preview value';
    case 'legacy':
      return variantName ? `Inherited from ${baseLabel}` : 'Legacy default';
    default:
      return 'Missing preview value';
  }
}

function hasExplicitPreviewValue(
  previewData: EditorSnapshot['document']['previewData'],
  variantName: string | null,
  fieldName: string,
): boolean {
  if (
    variantName &&
    Object.prototype.hasOwnProperty.call(previewData?.variants?.[variantName] ?? {}, fieldName)
  ) {
    return true;
  }
  if (variantName) return false;
  return Object.prototype.hasOwnProperty.call(previewData?.fields ?? {}, fieldName);
}
