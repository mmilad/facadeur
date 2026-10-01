'use client';

import { useState, useSyncExternalStore } from 'react';
import { SchemaBuilderProvider, type JsonSchema as JoySchema } from 'jsonjoy-builder';
import 'jsonjoy-builder/styles.css';
import TypeEditor from './jsonjoy-type-editor.js';
import type { EditorSnapshot } from '../../domain/session.js';
import {
  createLibrarySchema,
  getSchemaLibrary,
  removeLibrarySchema,
  renameLibrarySchema,
  subscribeSchemaLibrary,
  updateLibrarySchema,
  type JsonSchema,
  type LibrarySchema,
} from '../../domain/schema-library.js';
import { Field, TextInput } from '../form/index.js';

const EDITOR_LABELS = {
  schemaTypeString: 'String',
  schemaTypeNumber: 'Number',
  schemaTypeBoolean: 'Boolean',
  schemaTypeObject: 'Object',
  schemaTypeArray: 'Array',
  schemaTypeAnyOf: 'Any of',
  schemaTypeOneOf: 'One of',
  schemaTypeAllOf: 'All of',
  anyOfAddOption: 'Add option',
  oneOfAddOption: 'Add option',
  allOfAddSchema: 'Add schema',
  stringAllowedValuesEnumLabel: 'Allowed values (enum)',
};

const EMPTY = { schemas: [], assignments: {} };

/**
 * Project schema library. This is a second authoring path beside the document
 * field list: schemas are created here and then chosen on a component.
 */
export function SchemaLibraryStage({ snap }: { snap: EditorSnapshot }) {
  const library = useSyncExternalStore(subscribeSchemaLibrary, getSchemaLibrary, () => EMPTY);
  const assignedId = library.assignments[snap.document.id];
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected =
    library.schemas.find((schema) => schema.id === (pickedId ?? assignedId)) ??
    library.schemas[0];

  return (
    <section
      className="schema-stage schema-library eu-form"
      aria-label="Schemas"
      data-testid="schema-library-stage"
      data-schema-catalog="examples/schemas.json"
    >
      <header className="schema-stage-head">
        <div>
          <p className="schema-stage-kicker">Shared schemas</p>
          <h1>Schemas</h1>
        </div>
        <p className="schema-stage-note">
          One of is a union, such as Media’s image or video. Any of matches at least one option.
          A string schema can list an enum. Add another contract in examples/schemas.json, then
          reload.
        </p>
      </header>
      <div className="schema-library-body">
        <aside className="schema-library-list" aria-label="Schema list">
          <button
            type="button"
            className="text-button"
            name="create-library-schema"
            onClick={() => setPickedId(createLibrarySchema().id)}
          >
            New schema
          </button>
          {library.schemas.length === 0 ? (
            <p className="meta">No schemas yet.</p>
          ) : (
            library.schemas.map((schema) => (
              <button
                key={schema.id}
                type="button"
                className={
                  schema.id === selected?.id
                    ? 'schema-library-item is-active'
                    : 'schema-library-item'
                }
                aria-pressed={schema.id === selected?.id}
                onClick={() => setPickedId(schema.id)}
              >
                {schema.name}
              </button>
            ))
          )}
        </aside>
        {selected ? (
          <SchemaEditorPanel
            key={selected.id}
            schema={selected}
            onChange={(next) => updateLibrarySchema(selected.id, next)}
          />
        ) : (
          <p className="inspector-empty">Create a schema to describe a reusable component contract.</p>
        )}
      </div>
    </section>
  );
}

function SchemaEditorPanel({
  schema,
  onChange,
}: {
  schema: LibrarySchema;
  onChange: (next: JsonSchema) => void;
}) {
  return (
    <div className="schema-library-editor">
      <div className="schema-library-editor-head">
        <Field label="Name">
          <TextInput
            name="library-schema-name"
            value={schema.name}
            onCommit={(name) => renameLibrarySchema(schema.id, name)}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          onClick={() => removeLibrarySchema(schema.id)}
        >
          Delete schema
        </button>
      </div>
      {schema.description ? <p className="schema-stage-note">{schema.description}</p> : null}
      <Field label="Kind">
        <select
          name="schema-kind"
          value={rootKind(schema.schema)}
          onChange={(event) =>
            onChange(withRootKind(schema.schema, event.target.value as RootKind))
          }
        >
          {ROOT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </Field>
      <SchemaBuilderProvider messages={EDITOR_LABELS}>
        <div className="jsonjoy schema-library-joy">
          <TypeEditor
            schema={schema.schema as JoySchema}
            onChange={(next: JoySchema) => {
              if (!next || typeof next !== 'object') return;
              onChange(next as JsonSchema);
            }}
          />
        </div>
      </SchemaBuilderProvider>
      <details className="schema-library-source">
        <summary>JSON Schema</summary>
        <pre data-testid="schema-json">{JSON.stringify(schema.schema, null, 2)}</pre>
      </details>
    </div>
  );
}

const ROOT_KINDS = [
  'object',
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'oneOf',
  'anyOf',
  'allOf',
] as const;

type RootKind = (typeof ROOT_KINDS)[number];

const KIND_LABEL: Record<RootKind, string> = {
  object: 'Object',
  string: 'String',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Boolean',
  array: 'Array',
  oneOf: 'One of',
  anyOf: 'Any of',
  allOf: 'All of',
};

function rootKind(schema: JsonSchema): RootKind {
  if (Array.isArray(schema.oneOf)) return 'oneOf';
  if (Array.isArray(schema.anyOf)) return 'anyOf';
  if (Array.isArray(schema.allOf)) return 'allOf';
  if (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean' ||
    schema.type === 'array' ||
    schema.type === 'object'
  ) {
    return schema.type;
  }
  if (schema.properties) return 'object';
  if (schema.items) return 'array';
  return 'object';
}

function withRootKind(schema: JsonSchema, kind: RootKind): JsonSchema {
  if (rootKind(schema) === kind) return schema;
  const branches = schema.oneOf ?? schema.anyOf ?? schema.allOf;
  if (kind === 'oneOf' || kind === 'anyOf' || kind === 'allOf') {
    if (branches) {
      return { title: schema.title, description: schema.description, [kind]: branches };
    }
    const { oneOf: _one, anyOf: _any, allOf: _all, ...rest } = schema;
    const first = Object.keys(rest).length > 0 ? rest : { type: 'object', properties: {} };
    return { [kind]: [first, { type: 'object', properties: {} }] };
  }
  const first = branches?.[0];
  const base = first ?? schema;
  const { oneOf: _one, anyOf: _any, allOf: _all, ...rest } = base;
  const next: JsonSchema = { ...rest, type: kind };
  if (kind === 'object') next.properties = next.properties ?? {};
  if (kind === 'array') next.items = next.items ?? { type: 'string' };
  if (kind !== 'object') {
    delete next.properties;
    delete next.required;
  }
  if (kind !== 'array') delete next.items;
  return next;
}
