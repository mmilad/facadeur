'use client';

import { createCatalogUuid } from '@facadeur/core';
import type { JsonSchemaObject } from '@facadeur/domain';
import { useEffect, useMemo, useState } from 'react';
import type { AppService } from '../../../app-service';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';
import { Field } from '../../components/feedback';
import { SearchInput, TextInput } from '../../controls/form-binding/index';
import { JsonSchemaTypeEditor } from '../../schema/JsonSchemaTypeEditor';
import styles from '../../schema/schema-editor.module.css';
import { catalogSchemaTitle } from '../../../domain/catalog/schema-display';
import { SettingsSections } from '../SettingsSections';
import type { EditorSurface } from '../../design/design-domain';

export function CatalogSchemasPanel({
  app,
  surface,
  onEvent,
}: {
  app: AppService;
  surface: EditorSurface;
  onEvent: (event: EditorEvent) => void;
}) {
  const schemas = app.getSchemas();
  const entries = useMemo(
    () =>
      schemas
        .map(({ uuid, schema }) => [uuid, schema] as const)
        .sort(([idA, a], [idB, b]) =>
          catalogSchemaTitle(a, idA).localeCompare(catalogSchemaTitle(b, idB)),
        ),
    [schemas],
  );
  const [selectedId, setSelectedId] = useState(entries[0]?.[0] ?? '');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!selectedId && entries[0]?.[0]) setSelectedId(entries[0][0]);
    if (selectedId && !schemas.some(({ uuid }) => uuid === selectedId) && entries[0]?.[0]) {
      setSelectedId(entries[0][0]);
    }
  }, [entries, selectedId, schemas]);

  const needle = query.trim().toLowerCase();
  const visibleEntries = useMemo(
    () =>
      needle
        ? entries.filter(
            ([id, schema]) =>
              catalogSchemaTitle(schema, id).toLowerCase().includes(needle) ||
              id.toLowerCase().includes(needle),
          )
        : entries,
    [entries, needle],
  );

  const selected = schemas.find(({ uuid }) => uuid === selectedId)?.schema;

  function addSchema() {
    const id = createCatalogUuid();
    const schema: JsonSchemaObject = {
      type: 'object',
      title: 'New schema',
      properties: {},
      additionalProperties: false,
    };
    onEvent({ type: EditorEventType.SchemaUpsert, data: { uuid: id, schema } });
    setSelectedId(id);
    setQuery('');
  }

  function commitSchema(next: JsonSchemaObject) {
    if (!selectedId) return;
    onEvent({
      type: EditorEventType.SchemaUpsert,
      data: { uuid: selectedId, schema: next },
    });
  }

  function renameTitle(name: string) {
    if (!selectedId || !selected) return;
    const trimmed = name.trim();
    commitSchema({
      ...selected,
      title: trimmed || selected.title,
    });
  }

  function removeSelected() {
    if (!selectedId) return;
    onEvent({ type: EditorEventType.SchemaRemove, data: { uuid: selectedId } });
    setSelectedId(app.getSchemas()[0]?.uuid ?? '');
  }

  return (
    <section className="design-domain-stage eu-form" aria-label="Catalog schemas">
      <header className="design-domain-head">
        <div className="design-domain-head-main">
          <h1 className="design-domain-breadcrumb">Settings · Schemas</h1>
          <SettingsSections surface={surface} onEvent={onEvent} />
        </div>
      </header>
      <div className="design-domain-body">
        <div className={styles.catalogLayout}>
          <aside className={styles.sidebar} aria-label="Schema list">
            <SearchInput
              name="schema-search"
              placeholder="Search schemas"
              value={query}
              onChange={setQuery}
            />
            <button type="button" className="text-button" onClick={addSchema}>
              New schema
            </button>
            <div className={styles.listScroll}>
              {entries.length === 0 ? (
                <p className="meta">No shared schemas in the project catalog.</p>
              ) : visibleEntries.length === 0 ? (
                <p className="meta">No schemas match.</p>
              ) : (
                visibleEntries.map(([id, schema]) => (
                  <button
                    key={id}
                    type="button"
                    className={
                      id === selectedId ? `${styles.item} ${styles.itemActive}` : styles.item
                    }
                    aria-pressed={id === selectedId}
                    onClick={() => setSelectedId(id)}
                  >
                    {catalogSchemaTitle(schema, id)}
                  </button>
                ))
              )}
            </div>
          </aside>
          {selectedId && selected ? (
            <div className={styles.editorColumn} data-testid="catalog-schema-editor">
              <div className={styles.editorHead}>
                <Field label="Display name">
                  <TextInput
                    name="catalog-schema-title"
                    value={catalogSchemaTitle(selected, selectedId)}
                    onCommit={renameTitle}
                  />
                </Field>
              </div>
              <p className="schema-stage-note meta">Id: {selectedId}</p>
              <JsonSchemaTypeEditor
                schema={selected}
                onChange={(next) => commitSchema(next as JsonSchemaObject)}
              />
              <div className={styles.editorFooter}>
                <button type="button" className="text-button" onClick={() => void removeSelected()}>
                  Delete schema
                </button>
              </div>
              <details className={styles.source}>
                <summary>JSON Schema</summary>
                <pre data-testid="schema-json">{JSON.stringify(selected, null, 2)}</pre>
              </details>
              <p className="meta">
                Changes apply to the catalog immediately. Save the project to persist.
              </p>
              <button
                type="button"
                onClick={() => onEvent({ type: EditorEventType.SchemasSave, data: {} })}
              >
                Save schemas to project
              </button>
            </div>
          ) : (
            <p className="inspector-empty">
              Create a schema to describe a reusable component contract.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
