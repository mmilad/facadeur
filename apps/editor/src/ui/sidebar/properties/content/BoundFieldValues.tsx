import {
  resolvePreviewData,
  type FieldDefinition,
  type FieldValue,
  type FlatNode,
  type JsonSchema,
} from '@facadeur/core';
import { parsePreviewFieldValue, patchPreviewData } from '../../../../domain/preview-data.js';
import { schemaFieldDefaultsFor } from '../../../../domain/schema/schema-defaults.js';
import { structuralItemChoices } from '../../../../domain/schema/structural-item-choices.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { variantLabel } from '../../../../domain/edits/variant-edit.js';
import { fieldDisplayLabel } from '../../../controls/data/field-label.js';
import { TextControl } from '../../../controls/fields/index.js';
import { Field, Select, Toggle } from '../../../form/index.js';
import { boundFields } from './bound-fields.js';
import { ItemArrayControl } from '../../../controls/data/ItemArrayControl.js';
import { SwitchCaseControl } from '../../../controls/data/SwitchCaseControl.js';
import { JsonSchemaContractFieldEditor } from '../../../schema/JsonSchemaContractFieldEditor.js';

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
  const visibleFields = fields ?? boundFields(snap.document.fields, nodeBindings(node));
  if (visibleFields.length === 0) return null;

  const preview = resolvePreviewData(snap.document, snap.activeVariantName, visibleFields);
  const schemaDefaults = schemaFieldDefaultsFor(snap.document, visibleFields);
  const variantName = snap.activeVariantName;
  const documents = new Map(
    session.documentStores().map((store) => {
      const document = store.getDocument();
      return [document.id, document] as const;
    }),
  );

  function write(field: FieldDefinition, value: FieldValue | undefined) {
    const current = session.getSnapshot();
    session.execute({
      type: 'setPreviewData',
      previewData: patchPreviewData(current.document.previewData, variantName, field.name, value),
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
          itemChoices={
            (field.name === 'items' && field.type === 'array') ||
            (field.name === 'props' && node.type === 'switch')
              ? structuralItemChoices(snap.document, field, documents, {
                  documents,
                  schemaCatalog: snap.design.schemaCatalog,
                })
              : undefined
          }
          onWrite={(value) => write(field, value)}
          onWriteRaw={(raw) => writeRaw(field, raw)}
        />
      ))}
    </div>
  );
}

function nodeBindings(node: Exclude<FlatNode, { type: 'instance' }>) {
  return node.type === 'repeater' || node.type === 'switch' ? undefined : node.bindings;
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
  itemChoices,
}: {
  field: FieldDefinition;
  value: FieldValue | undefined;
  onWrite: (value: FieldValue | undefined) => void;
  onWriteRaw: (raw: string) => void;
  itemChoices?: readonly {
    id: string;
    label: string;
    schema: JsonSchema;
    caseValue?: string;
    payloadSchema?: JsonSchema;
  }[];
}) {
  const label = fieldDisplayLabel(field.name);
  if (itemChoices && field.name === 'props' && field.type === 'object') {
    return (
      <>
        <SwitchCaseControl
          label={label}
          value={value}
          choices={itemChoices}
          onCommit={(next) => onWrite(parsePreviewFieldValue(field, JSON.stringify(next)))}
        />
        <details className="field-schema">
          <summary>Advanced JSON</summary>
          <TextControl
            label={label}
            name={`example-${field.name}`}
            value={value === undefined ? '' : JSON.stringify(value)}
            multiline
            onCommit={onWriteRaw}
          />
        </details>
        <SchemaSummary field={field} />
      </>
    );
  }
  if (itemChoices && field.name === 'items' && field.type === 'array') {
    return (
      <>
        <ItemArrayControl
          label={label}
          value={value}
          choices={itemChoices}
          onCommit={(next) => onWrite(parsePreviewFieldValue(field, JSON.stringify(next)))}
        />
        <details className="field-schema">
          <summary>Advanced JSON</summary>
          <TextControl
            label={label}
            name={`example-${field.name}`}
            value={value === undefined ? '' : JSON.stringify(value)}
            multiline
            onCommit={onWriteRaw}
          />
        </details>
        <SchemaSummary field={field} />
      </>
    );
  }
  if ((field.type === 'array' || field.type === 'object') && (field.schema || field.items)) {
    return (
      <>
        <JsonSchemaContractFieldEditor field={field} value={value} onChange={onWrite} />
        <details className="field-schema">
          <summary>Advanced JSON</summary>
          <TextControl
            label={label}
            name={`example-${field.name}`}
            value={value === undefined ? '' : JSON.stringify(value)}
            multiline
            onCommit={onWriteRaw}
          />
        </details>
      </>
    );
  }
  if (field.type === 'boolean') {
    return (
      <>
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
        <SchemaSummary field={field} />
      </>
    );
  }
  if (field.type === 'enum') {
    return (
      <>
        <Field label={label}>
          <Select
            name={`example-${field.name}`}
            aria-label={label}
            value={typeof value === 'string' ? value : ''}
            options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
            onCommit={(next) => onWriteRaw(next)}
          />
        </Field>
        <SchemaSummary field={field} />
      </>
    );
  }
  const text = value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return (
    <>
      <TextControl
        label={label}
        name={`example-${field.name}`}
        value={text}
        multiline={field.type === 'array' || field.type === 'object' || field.type === 'richText'}
        onCommit={(next) => onWriteRaw(next)}
      />
      <SchemaSummary field={field} />
    </>
  );
}

function SchemaSummary({ field }: { field: FieldDefinition }) {
  const schema =
    field.schema ??
    (field.items?.schema ? { type: 'array', items: field.items.schema } : undefined);
  if (!schema) return null;
  return (
    <details className="field-schema">
      <summary>{fieldDisplayLabel(field.name)} schema</summary>
      <pre>{JSON.stringify(schema, null, 2)}</pre>
    </details>
  );
}
