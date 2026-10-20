'use client';

import type { FieldValue } from '@facadeur/core';
import type { JsonSchemaObject } from '@facadeur/domain';
import type { AppService } from '../../app-service';
import { catalogSchemaTitle } from '../../domain/catalog/schema-display';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';
import { Stack } from '../components/layout';
import { Field } from '../components/feedback';
import { Select } from '../controls/form-binding/index';
import { SchemaEditor, type SchemaReferenceChoice } from '../schema/editor/SchemaEditor';
import { SchemaRecursionWarnings } from '../schema/editor/SchemaRecursionWarnings';
import { componentReferenceTarget, iconReferenceTarget } from '../schema/editor/schema';
import { CatalogPreviewFields, staticFieldConfigsForDefinition } from './CatalogPreviewFields';

const INLINE_SCHEMA_VALUE = '__inline__';

function emptyObjectSchema(title: string): JsonSchemaObject {
  return {
    type: 'object',
    title,
    properties: {},
    additionalProperties: false,
  };
}

function schemaPropertyRows(
  schema: JsonSchemaObject | null,
  origins?: ReadonlyMap<
    string,
    { kind: string; instanceName?: string; definitionName?: string; fieldName?: string }
  >,
): { name: string; title: string; type: string; source: string }[] {
  if (
    !schema ||
    schema.type !== 'object' ||
    !schema.properties ||
    typeof schema.properties !== 'object'
  ) {
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
    const origin = origins?.get(name);
    return {
      name,
      title,
      type,
      source:
        origin?.kind === 'inherited'
          ? `From ${origin.instanceName} (${origin.definitionName})`
          : 'Local',
    };
  });
}

export function CatalogSchemaStage({
  app,
  onEvent,
}: {
  app: AppService;
  onEvent: (event: EditorEvent) => void;
}) {
  const coreSnap = app.getCoreSnapshot();
  const definition = coreSnap.openDefinition;
  const resolved = app.resolveSchemaForOpenDefinition();
  const effective = app.effectiveSchemaForOpenDefinition();
  const { fields } = app.getInspectorInputs();
  const previewFields = (effective?.previewDefaults ??
    definition?.config?.previewData?.fields ??
    {}) as Record<string, FieldValue>;
  const title = definition ? (app.getDefinitionDisplayName(definition.uuid) ?? 'Schema') : 'Schema';

  const schemaEntries = app
    .getSchemas()
    .map(({ uuid, schema }) => [uuid, schema] as const)
    .sort(([idA, a], [idB, b]) =>
      catalogSchemaTitle(a, idA).localeCompare(catalogSchemaTitle(b, idB)),
    );
  const schemaReferences: SchemaReferenceChoice[] = schemaEntries.map(([uuid, schema]) => ({
    ref: `urn:facadeur:schema:${uuid}`,
    label: catalogSchemaTitle(schema, uuid),
    group: 'Catalog schemas',
  }));

  const schemaRef = definition?.schema.kind === 'ref' ? definition.schema.uuid : null;
  const selectValue = schemaRef ?? INLINE_SCHEMA_VALUE;
  const selectedShared = schemaRef ? app.getSchema(schemaRef) : undefined;
  const propertyRows = schemaPropertyRows(effective?.schema ?? resolved, effective?.origins);

  if (!definition) {
    return (
      <section className="schema-stage eu-form" aria-label="Schema">
        <p className="inspector-empty">Open a catalog asset to view its schema.</p>
      </section>
    );
  }

  function bindSchema(next: string) {
    const schema =
      next === INLINE_SCHEMA_VALUE
        ? {
            kind: 'inline' as const,
            schema:
              resolved ??
              emptyObjectSchema(app.getDefinitionDisplayName(definition!.uuid) ?? definition!.name),
          }
        : { kind: 'ref' as const, uuid: next };
    onEvent({
      type: EditorEventType.DefinitionSchemaSet,
      data: { definitionId: definition!.uuid, schema },
    });
  }

  function saveInlineSchema(next: JsonSchemaObject) {
    if (!definition || definition.schema.kind !== 'inline') return;
    onEvent({
      type: EditorEventType.DefinitionSchemaSet,
      data: {
        definitionId: definition.uuid,
        schema: { kind: 'inline', schema: next },
      },
    });
  }

  function writePreview(
    field: (typeof fields)[number],
    value: Parameters<typeof app.patchPreviewField>[1],
  ) {
    onEvent({
      type: EditorEventType.PreviewFieldSet,
      data: { field: field.name, value },
    });
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
          Choose a shared project schema or edit an inline contract, then set preview defaults used
          on the stage and in the Editor inspector.
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
                              {row.name} · {row.type} · {row.source}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="inspector-empty">This schema has no properties yet.</p>
                    )}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        onEvent({
                          type: EditorEventType.SurfaceNavigate,
                          data: { surfaceId: 'schemas' },
                        })
                      }
                    >
                      Edit in Settings → Schemas
                    </button>
                    <details>
                      <summary>JSON Schema (read-only)</summary>
                      <pre>{resolved ? JSON.stringify(resolved, null, 2) : '{}'}</pre>
                    </details>
                  </Stack>
                ) : definition.schema.kind === 'inline' ? (
                  <Stack gap={10}>
                    <SchemaRecursionWarnings
                      schemas={[
                        ...schemaEntries.map(([uuid, schema]) => ({ uuid, schema })),
                        {
                          uuid: `inline:${definition.uuid}`,
                          schema: definition.schema.schema,
                        },
                      ]}
                      selectedId={`inline:${definition.uuid}`}
                    />
                    <SchemaEditor
                      heading="Inline contract"
                      schema={definition.schema.schema}
                      references={schemaReferences}
                      referenceTargets={[iconReferenceTarget, componentReferenceTarget]}
                      onChange={(next) => void saveInlineSchema(next as JsonSchemaObject)}
                    />
                    {propertyRows.some((row) => row.source !== 'Local') ? (
                      <div>
                        <h3>Inherited fields</h3>
                        <ul className="schema-field-list">
                          {propertyRows
                            .filter((row) => row.source !== 'Local')
                            .map((row) => (
                              <li key={row.name}>
                                <span>{row.title}</span>
                                <span className="meta">
                                  {row.name} · {row.type} · {row.source}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : null}
                  </Stack>
                ) : null}
              </div>
              <section
                className="preview-data-slot"
                aria-labelledby="catalog-preview-defaults-title"
              >
                <h2 id="catalog-preview-defaults-title">Preview defaults</h2>
                <p className="meta">
                  Sample values for {title} in the editor and stage. Node-level overrides stay on
                  the Editor surface.
                </p>
                <CatalogPreviewFields
                  fields={fields}
                  previewFields={previewFields}
                  staticFields={staticFieldConfigsForDefinition(definition)}
                  iconOptions={(app.getCatalog().icons ?? []).map((icon) => ({
                    value: icon.id,
                    label: icon.name,
                  }))}
                  onWrite={(field, value) => void writePreview(field, value)}
                />
              </section>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
