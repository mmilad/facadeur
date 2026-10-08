'use client';

import type { JsonSchemaObject } from '@facadeur/domain';
import { useMemo } from 'react';
import type { AppService } from '../../app-service';
import { catalogDefinitionDisplayName } from '../../domain/catalog/display-name';
import { catalogSchemaTitle } from '../../domain/catalog/schema-display';
import type { EditorSession } from '../../domain/session';
import { Field, Select, Stack } from '../form/index';
import { JsonSchemaTypeEditor } from '../schema/JsonSchemaTypeEditor';
import { CatalogPreviewFields } from './CatalogPreviewFields';

const INLINE_SCHEMA_VALUE = '__inline__';

function emptyObjectSchema(title: string): JsonSchemaObject {
  return {
    type: 'object',
    title,
    properties: {},
    additionalProperties: false,
  };
}

function schemaPropertyRows(schema: JsonSchemaObject | null): { name: string; title: string; type: string }[] {
  if (!schema || schema.type !== 'object' || !schema.properties || typeof schema.properties !== 'object') {
    return [];
  }
  return Object.entries(schema.properties).map(([name, spec]) => {
    const row = spec && typeof spec === 'object' ? (spec as Record<string, unknown>) : {};
    const title = typeof row.title === 'string' && row.title.trim() ? row.title.trim() : name;
    const type =
      typeof row.type === 'string'
        ? row.type
        : Array.isArray(row.type)
          ? row.type.join(' | ')
          : 'unknown';
    return { name, title, type };
  });
}

export function CatalogSchemaStage({
  app,
  session,
  onOpenSchemas,
}: {
  app: AppService;
  session: EditorSession;
  onOpenSchemas: () => void;
}) {
  const coreSnap = app.getCoreSnapshot();
  const definition = coreSnap.openDefinition;
  const resolved = app.core.node.schema.resolveForOpenDefinition();
  const { fields } = app.core.node.config.inspectorInputs();
  const previewFields = definition?.config?.previewData?.fields ?? {};
  const title = definition
    ? catalogDefinitionDisplayName(coreSnap.catalog, definition)
    : 'Schema';

  const schemaEntries = useMemo(
    () =>
      Object.entries(coreSnap.catalog.schemas ?? {}).sort(([idA, a], [idB, b]) =>
        catalogSchemaTitle(a, idA).localeCompare(catalogSchemaTitle(b, idB)),
      ),
    [coreSnap.catalog.schemas],
  );

  const schemaRef =
    definition?.schema.kind === 'ref' ? definition.schema.uuid : null;
  const selectValue = schemaRef ?? INLINE_SCHEMA_VALUE;
  const selectedShared = schemaRef ? coreSnap.catalog.schemas?.[schemaRef] : undefined;
  const propertyRows = schemaPropertyRows(resolved);

  if (!definition) {
    return (
      <section className="schema-stage eu-form" aria-label="Schema">
        <p className="inspector-empty">Open a catalog asset to view its schema.</p>
      </section>
    );
  }

  async function bindSchema(next: string) {
    try {
      if (next === INLINE_SCHEMA_VALUE) {
        const seed =
          resolved ??
          emptyObjectSchema(catalogDefinitionDisplayName(coreSnap.catalog, definition!));
        await app.patchDefinition(definition!.uuid, {
          schema: { kind: 'inline', schema: seed },
        });
        session.setNotice('Using inline schema on this definition', 'info');
        return;
      }
      await app.patchDefinition(definition!.uuid, {
        schema: { kind: 'ref', uuid: next },
      });
      session.setNotice('Schema link updated', 'info');
    } catch (failure) {
      session.setNotice(failure instanceof Error ? failure.message : 'Could not update schema', 'error');
    }
  }

  async function saveInlineSchema(next: JsonSchemaObject) {
    if (definition.schema.kind !== 'inline') return;
    try {
      await app.patchDefinition(definition.uuid, {
        schema: { kind: 'inline', schema: next },
      });
      session.setNotice('Schema updated', 'info');
    } catch (failure) {
      session.setNotice(failure instanceof Error ? failure.message : 'Could not save schema', 'error');
    }
  }

  async function writePreview(field: (typeof fields)[number], value: Parameters<typeof app.patchPreviewField>[1]) {
    try {
      await app.patchPreviewField(field.name, value);
    } catch (failure) {
      session.setNotice(failure instanceof Error ? failure.message : 'Could not save preview value', 'error');
    }
  }

  const schemaOptions = [
    ...schemaEntries.map(([id, schema]) => ({
      value: id,
      label: catalogSchemaTitle(schema, id),
    })),
    { value: INLINE_SCHEMA_VALUE, label: 'Custom (inline on this definition)' },
  ];

  return (
    <section className="schema-stage eu-form" aria-label="Schema" data-testid="schema-stage">
      <header className="schema-stage-head">
        <div>
          <p className="schema-stage-kicker">Catalog definition</p>
          <h1>Schema</h1>
        </div>
        <p className="schema-stage-note">
          Choose a shared project schema or edit an inline contract, then set preview defaults used on
          the stage and in the Editor inspector.
        </p>
      </header>
      <div className="schema-stage-body">
        <div className="schema-stage-grid">
          <section className="schema-card schema-definition-card">
            <h2>{title}</h2>
            <div className="schema-use">
              <div className="schema-use-editor stack">
                <Field
                  label="Schema"
                  hint={
                    schemaRef
                      ? `Linked to shared schema ${schemaRef}.`
                      : 'Schema is stored only on this definition.'
                  }
                >
                  <Select
                    name="catalog-schema-ref"
                    value={selectValue}
                    options={schemaOptions}
                    placeholder="Select a schema"
                    onCommit={(next) => void bindSchema(next)}
                  />
                </Field>
                {schemaRef ? (
                  <Stack gap={10}>
                    <div>
                      <h3>Contract</h3>
                      <p className="meta">
                        <strong>{catalogSchemaTitle(selectedShared, schemaRef)}</strong>
                        {Array.isArray(resolved?.required) && resolved.required.length > 0
                          ? ` · required: ${resolved.required.join(', ')}`
                          : null}
                      </p>
                    </div>
                    {propertyRows.length ? (
                      <ul className="schema-field-list">
                        {propertyRows.map((row) => (
                          <li key={row.name}>
                            <span>{row.title}</span>
                            <span className="meta">
                              {row.name} · {row.type}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="inspector-empty">This schema has no properties yet.</p>
                    )}
                    <button type="button" className="text-button" onClick={onOpenSchemas}>
                      Edit in Settings → Schemas
                    </button>
                    <details>
                      <summary>JSON Schema (read-only)</summary>
                      <pre>{resolved ? JSON.stringify(resolved, null, 2) : '{}'}</pre>
                    </details>
                  </Stack>
                ) : definition.schema.kind === 'inline' ? (
                  <Stack gap={10}>
                    <h3>Inline contract</h3>
                    <JsonSchemaTypeEditor
                      schema={definition.schema.schema}
                      onChange={(next) => void saveInlineSchema(next as JsonSchemaObject)}
                    />
                  </Stack>
                ) : null}
              </div>
              <section className="preview-data-slot" aria-labelledby="catalog-preview-defaults-title">
                <h2 id="catalog-preview-defaults-title">Preview defaults</h2>
                <p className="meta">
                  Sample values for {title} in the editor and stage. Node-level overrides stay on the
                  Editor surface.
                </p>
                <CatalogPreviewFields
                  fields={fields}
                  previewFields={previewFields}
                  onWrite={(field, value) => void writePreview(field, value)}
                  onInvalid={(message) => session.setNotice(message, 'error')}
                />
              </section>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
