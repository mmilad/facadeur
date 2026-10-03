'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
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
  schemaRefUri,
  validateLibrarySchemas,
  type JsonSchema,
  type LibrarySchema,
  type SchemaValidationIssue,
} from '../../domain/schema/schema-library.js';
import { Field, InlineError, TextInput } from '../form/index.js';

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
    library.schemas.find((schema) => schema.id === (pickedId ?? assignedId)) ?? library.schemas[0];

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
          One of is a union, such as Media’s image or video. Any of matches at least one option. A
          string schema can list an enum. Add another contract in examples/schemas.json, then
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
            schemas={library.schemas}
            onChange={(next) => updateLibrarySchema(selected.id, next)}
          />
        ) : (
          <p className="inspector-empty">
            Create a schema to describe a reusable component contract.
          </p>
        )}
      </div>
    </section>
  );
}

function SchemaEditorPanel({
  schema,
  schemas,
  onChange,
}: {
  schema: LibrarySchema;
  schemas: LibrarySchema[];
  onChange: (next: JsonSchema) => SchemaValidationIssue[];
}) {
  const [validationIssues, setValidationIssues] = useState<SchemaValidationIssue[]>(() =>
    validateLibrarySchemas(schemas),
  );
  const composition = schemaComposition(schema.schema, schemas);
  const editorSchema = withoutManagedComposition(schema.schema, schemas);

  useEffect(() => {
    setValidationIssues(validateLibrarySchemas(schemas));
  }, [schemas]);

  function commit(next: JsonSchema) {
    setValidationIssues(onChange(next));
  }

  function setComposition(kind: 'allOf' | 'oneOf', schemaIds: string[]) {
    const next = { ...schema.schema };
    const branches = next[kind] ?? [];
    const managedUris = new Set(schemas.map((entry) => schemaRefUri(entry.id)));
    const otherBranches = branches.filter(
      (branch) => typeof branch.$ref !== 'string' || !managedUris.has(branch.$ref),
    );
    const refs = schemaIds.map(($id) => ({ $ref: schemaRefUri($id) }));
    const merged = [...otherBranches, ...refs];
    if (merged.length) next[kind] = merged;
    else delete next[kind];
    commit(next);
  }

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
          onClick={() => {
            const issues = removeLibrarySchema(schema.id);
            if (issues.length > 0) setValidationIssues(issues);
          }}
        >
          Delete schema
        </button>
      </div>
      {schema.description ? <p className="schema-stage-note">{schema.description}</p> : null}
      <section className="schema-library-composition" aria-label="Schema composition">
        <CompositionEditor
          kind="allOf"
          label="Extend by"
          hint="Combine every selected schema with this one."
          schemaId={schema.id}
          schemas={schemas}
          selectedIds={composition.allOf}
          onChange={(ids) => setComposition('allOf', ids)}
        />
        <CompositionEditor
          kind="oneOf"
          label="Extend by one of"
          hint="Choose one or more alternative schemas."
          schemaId={schema.id}
          schemas={schemas}
          selectedIds={composition.oneOf}
          onChange={(ids) => setComposition('oneOf', ids)}
        />
        {validationIssues.map((issue, index) => (
          <InlineError key={`${issue.schemaId}-${index}`}>
            {validationMessage(issue, schema.id, schemas)}
          </InlineError>
        ))}
      </section>
      <Field label="Kind">
        <select
          name="schema-kind"
          value={rootKind(editorSchema)}
          onChange={(event) =>
            commit(
              preserveManagedComposition(
                withRootKind(editorSchema, event.target.value as RootKind),
                schema.schema,
                schemas,
              ),
            )
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
            schema={editorSchema as JoySchema}
            onChange={(next: JoySchema) => {
              if (!next || typeof next !== 'object') return;
              commit(preserveManagedComposition(next as JsonSchema, schema.schema, schemas));
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

function CompositionEditor({
  kind,
  label,
  hint,
  schemaId,
  schemas,
  selectedIds,
  onChange,
}: {
  kind: 'allOf' | 'oneOf';
  label: string;
  hint: string;
  schemaId: string;
  schemas: LibrarySchema[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const available = schemas.filter((entry) => entry.id !== schemaId);
  const addable = available.filter((entry) => !selectedIds.includes(entry.id));

  return (
    <Field label={label} hint={hint}>
      <div className="schema-library-composition-list">
        {selectedIds.map((id, index) => {
          const options = available.filter(
            (entry) => entry.id === id || !selectedIds.includes(entry.id),
          );
          const selectedName = schemas.find((entry) => entry.id === id)?.name ?? id;
          return (
            <div className="schema-library-composition-row" key={`${kind}:${index}`}>
              <select
                name={`schema-${kind}-${index}`}
                className="eu-control schema-library-composition-select"
                aria-label={`${label} schema ${index + 1}`}
                value={id}
                onChange={(event) =>
                  onChange(
                    selectedIds.map((selected, selectedIndex) =>
                      selectedIndex === index ? event.target.value : selected,
                    ),
                  )
                }
              >
                {options.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="schema-library-composition-remove"
                aria-label={`Remove ${selectedName} from ${label}`}
                onClick={() =>
                  onChange(selectedIds.filter((_, selectedIndex) => selectedIndex !== index))
                }
              >
                ×
              </button>
            </div>
          );
        })}
        {adding ? (
          <div className="schema-library-composition-row">
            <select
              name={`schema-${kind}-new`}
              className="eu-control schema-library-composition-select"
              aria-label={`Choose schema to ${label}`}
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                onChange([...selectedIds, event.target.value]);
                setAdding(false);
              }}
            >
              <option value="">Choose a schema</option>
              {addable.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="schema-library-composition-cancel"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="schema-library-composition-add"
            name={`add-schema-${kind}`}
            disabled={addable.length === 0}
            onClick={() => setAdding(true)}
          >
            + Add schema
          </button>
        )}
      </div>
    </Field>
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
    if (branches) return { title: schema.title, description: schema.description, [kind]: branches };
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

function schemaComposition(schema: JsonSchema, schemas: LibrarySchema[]) {
  const idsByUri = new Map(schemas.map((entry) => [schemaRefUri(entry.id), entry.id]));
  const referencedIds = (kind: 'allOf' | 'oneOf') =>
    (schema[kind] ?? []).flatMap((branch) => {
      if (!branch.$ref) return [];
      const id = idsByUri.get(branch.$ref);
      return id ? [id] : [];
    });
  return { allOf: referencedIds('allOf'), oneOf: referencedIds('oneOf') };
}

function schemaName(schemas: LibrarySchema[], id: string): string {
  return schemas.find((entry) => entry.id === id)?.name ?? id;
}

function validationMessage(
  issue: SchemaValidationIssue,
  selectedSchemaId: string,
  schemas: LibrarySchema[],
): string {
  return issue.schemaId === selectedSchemaId
    ? issue.message
    : `${schemaName(schemas, issue.schemaId)}: ${issue.message}`;
}

function withoutManagedComposition(schema: JsonSchema, schemas: LibrarySchema[]): JsonSchema {
  const managedUris = new Set(schemas.map((entry) => schemaRefUri(entry.id)));
  const body = { ...schema };
  for (const kind of ['allOf', 'oneOf'] as const) {
    const branches = body[kind]?.filter(
      (branch) => typeof branch.$ref !== 'string' || !managedUris.has(branch.$ref),
    );
    if (branches?.length) body[kind] = branches;
    else delete body[kind];
  }
  return body;
}

function preserveManagedComposition(
  body: JsonSchema,
  original: JsonSchema,
  schemas: LibrarySchema[],
): JsonSchema {
  const next = { ...body };
  const managedUris = new Set(schemas.map((entry) => schemaRefUri(entry.id)));
  for (const kind of ['allOf', 'oneOf'] as const) {
    const managed = original[kind]?.filter(
      (branch) => typeof branch.$ref === 'string' && managedUris.has(branch.$ref),
    );
    const authored = next[kind] ?? [];
    const branches = [...authored, ...(managed ?? [])];
    if (branches.length) next[kind] = branches;
    else delete next[kind];
  }
  return next;
}
