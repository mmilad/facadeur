import {
  resolvePreviewData,
  type FieldDefinition,
  type FieldValue,
  type FlatNode,
} from '@facadeur/core';
import { parsePreviewFieldValue, patchPreviewData } from '../../../../domain/preview-data.js';
import { schemaFieldDefaultsFor } from '../../../../domain/schema/schema-defaults.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { variantLabel } from '../../../../domain/edits/variant-edit.js';
import { fieldDisplayLabel } from '../../../controls/data/field-label.js';
import { TextControl } from '../../../controls/fields/index.js';
import { Field, Select, Toggle } from '../../../form/index.js';
import { boundFields } from './bound-fields.js';

export function BoundFieldValues({
  session,
  snap,
  node,
  fields,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Exclude<FlatNode, { type: 'instance' }>;
  fields?: readonly FieldDefinition[];
}) {
  const visibleFields = fields ?? boundFields(snap.document.fields, node.bindings);
  if (visibleFields.length === 0) return null;

  const preview = resolvePreviewData(snap.document, snap.activeVariantName, visibleFields);
  const schemaDefaults = schemaFieldDefaultsFor(snap.document, visibleFields);
  const variantName = snap.activeVariantName;

  function write(field: FieldDefinition, value: FieldValue | undefined) {
    session.execute({
      type: 'setPreviewData',
      previewData: patchPreviewData(snap.document.previewData, variantName, field.name, value),
    });
  }

  function writeRaw(field: FieldDefinition, raw: string) {
    try {
      write(field, parsePreviewFieldValue(field, raw));
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid example value', 'error');
    }
  }

  return (
    <div className="stack bound-fields">
      <h3>Example</h3>
      {variantName ? (
        <p className="meta">Values for {variantLabel(snap.document, variantName)}.</p>
      ) : null}
      {visibleFields.map((field) => (
        <BoundFieldControl
          key={field.name}
          field={field}
          value={shownValue(preview, schemaDefaults, field.name)}
          onWrite={(value) => write(field, value)}
          onWriteRaw={(raw) => writeRaw(field, raw)}
        />
      ))}
    </div>
  );
}

function shownValue(
  preview: Record<string, FieldValue>,
  schemaDefaults: Record<string, FieldValue>,
  name: string,
): FieldValue | undefined {
  if (Object.prototype.hasOwnProperty.call(preview, name)) return preview[name];
  return schemaDefaults[name];
}

function BoundFieldControl({
  field,
  value,
  onWrite,
  onWriteRaw,
}: {
  field: FieldDefinition;
  value: FieldValue | undefined;
  onWrite: (value: FieldValue | undefined) => void;
  onWriteRaw: (raw: string) => void;
}) {
  const label = fieldDisplayLabel(field.name);
  if (field.type === 'boolean') {
    return (
      <label className="field">
        <span>{label}</span>
        <Toggle
          name={`example-${field.name}`}
          aria-label={label}
          label={value === true ? 'On' : 'Off'}
          value={value === true}
          onCommit={onWrite}
        />
      </label>
    );
  }
  if (field.type === 'enum') {
    return (
      <Field label={label}>
        <Select
          name={`example-${field.name}`}
          aria-label={label}
          value={typeof value === 'string' ? value : ''}
          options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
          onCommit={(next) => onWriteRaw(next)}
        />
      </Field>
    );
  }
  const text = value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return (
    <TextControl
      label={label}
      name={`example-${field.name}`}
      value={text}
      multiline={field.type === 'array' || field.type === 'object' || field.type === 'richText'}
      onCommit={(next) => onWriteRaw(next)}
    />
  );
}
