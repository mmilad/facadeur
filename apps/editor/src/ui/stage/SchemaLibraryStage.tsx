'use client';

import { useEffect, useState } from 'react';
import { createId, validateCatalog } from '@facadeur/core';
import { SchemaBuilderProvider, type JsonSchema as JoySchema } from 'jsonjoy-builder';
import 'jsonjoy-builder/styles.css';
import TypeEditor from './jsonjoy-type-editor.js';
import type { EditorSnapshot } from '../../domain/session.js';
import type {
  JsonSchema,
  LibrarySchema,
  SchemaValidationIssue,
} from '../../domain/schema/schema-library.js';
import type { EditorSession } from '../../domain/session.js';
import { schemaRefUri } from '../../domain/schema/schema-library.js';
import { Field, InlineError, TextInput } from '../form/index.js';
import styles from './SchemaLibraryStage.module.css';

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

/** Shared named schemas are part of the design document contract. */
export function SchemaLibraryStage({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const library = snap.design.schemaCatalog ?? { schemas: [] };
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = library.schemas.find((schema) => schema.id === pickedId) ?? library.schemas[0];

  function validate(schemas: LibrarySchema[]): SchemaValidationIssue[] {
    try {
      validateCatalog(session.boardDocuments(), { schemaCatalog: { schemas } });
      return [];
    } catch (error) {
      return [
        {
          schemaId: selected?.id ?? '',
          message: error instanceof Error ? error.message : 'Invalid schema catalog',
        },
      ];
    }
  }

  function commit(schemas: LibrarySchema[]): SchemaValidationIssue[] {
    const issues = validate(schemas);
    if (issues.length > 0) return issues;
    session.executeDesign({
      type: 'setSchemaCatalog',
      schemaCatalog: { schemas },
    });
    return [];
  }

  function createSchema() {
    const schema = {
      id: createId(),
      name: uniqueName(library.schemas, 'Schema'),
      schema: { type: 'object', properties: {} },
    };
    const issues = commit([...library.schemas, schema]);
    if (issues.length === 0) setPickedId(schema.id);
  }

  return (
    <section
      className="schema-stage eu-form"
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
          Create reusable JSON Schema contracts here, then assign a schema or named fields to a
          component. Defaults use the resolved public fields, including fields forwarded from
          embedded components.
        </p>
      </header>
      <div className={styles.body}>
        <aside className={styles.list} aria-label="Schema list">
          <button
            type="button"
            className="text-button"
            name="create-library-schema"
            onClick={createSchema}
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
                  schema.id === selected?.id ? `${styles.item} ${styles.itemActive}` : styles.item
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
            validate={validate}
            onChange={(next) =>
              commit(
                library.schemas.map((entry) =>
                  entry.id === selected.id ? { ...entry, schema: next } : entry,
                ),
              )
            }
            onRename={(name) =>
              commit(
                library.schemas.map((entry) =>
                  entry.id === selected.id ? { ...entry, name: name.trim() || entry.name } : entry,
                ),
              )
            }
            onDelete={() => {
              const next = library.schemas.filter((entry) => entry.id !== selected.id);
              const issues = commit(next);
              if (issues.length === 0) {
                setPickedId(next[0]?.id ?? null);
              }
              return issues;
            }}
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
  validate,
  onChange,
  onRename,
  onDelete,
}: {
  schema: LibrarySchema;
  schemas: LibrarySchema[];
  validate: (schemas: LibrarySchema[]) => SchemaValidationIssue[];
  onChange: (next: JsonSchema) => SchemaValidationIssue[];
  onRename: (name: string) => SchemaValidationIssue[];
  onDelete: () => SchemaValidationIssue[];
}) {
  const [validationIssues, setValidationIssues] = useState(() => validate(schemas));
  const composition = schemaComposition(schema.schema, schemas);
  const editorSchema = withoutManagedComposition(schema.schema, schemas);

  useEffect(() => setValidationIssues(validate(schemas)), [schemas]);

  function commit(next: JsonSchema) {
    setValidationIssues(
      onChange(next) ??
        validate(
          schemas.map((entry) => (entry.id === schema.id ? { ...entry, schema: next } : entry)),
        ),
    );
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
    <div>
      <div className={styles.editorHead}>
        <Field label="Name">
          <TextInput
            name="library-schema-name"
            value={schema.name}
            onCommit={(name) => setValidationIssues(onRename(name))}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setValidationIssues(onDelete());
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
          className={styles.kindSelect}
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
        <div className={`jsonjoy ${styles.joy}`}>
          <TypeEditor
            schema={editorSchema as JoySchema}
            onChange={(next: JoySchema) => {
              if (!next || typeof next !== 'object') return;
              commit(preserveManagedComposition(next as JsonSchema, schema.schema, schemas));
            }}
          />
        </div>
      </SchemaBuilderProvider>
      <details className={styles.source}>
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
      <div className={styles.compositionList}>
        {selectedIds.map((id, index) => {
          const options = available.filter(
            (entry) => entry.id === id || !selectedIds.includes(entry.id),
          );
          const selectedName = schemas.find((entry) => entry.id === id)?.name ?? id;
          return (
            <div className={styles.compositionRow} key={`${kind}:${index}`}>
              <select
                name={`schema-${kind}-${index}`}
                className={`eu-control ${styles.compositionSelect}`}
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
                className={styles.compositionRemove}
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
          <div className={styles.compositionRow}>
            <select
              name={`schema-${kind}-new`}
              className={`eu-control ${styles.compositionSelect}`}
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
              className={styles.compositionCancel}
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.compositionAdd}
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

function uniqueName(schemas: LibrarySchema[], base: string): string {
  const names = new Set(schemas.map((schema) => schema.name));
  if (!names.has(base)) return base;
  let index = 2;
  while (names.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
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
