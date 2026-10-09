'use client';

import { createCatalogUuid } from '@facadeur/core';
import type { JsonSchemaObject } from '@facadeur/domain';
import { useEffect, useMemo, useState } from 'react';
import type { AppService } from '../../../app-service';
import type { EditorSession } from '../../../domain/session';
import { Field, SearchInput, TextInput } from '../../form/index';
import { JsonSchemaTypeEditor } from '../../schema/JsonSchemaTypeEditor';
import styles from '../../stage/SchemaLibraryStage.module.css';
import { catalogSchemaTitle } from '../../../domain/catalog/schema-display';
import { SettingsSections } from '../SettingsSections';
import type { EditorSurface } from '../../design/design-domain';

export function CatalogSchemasPanel({
  app,
  session,
  surface,
  onSelectSurface,
}: {
  app: AppService;
  session: EditorSession;
  surface: EditorSurface;
  onSelectSurface: (surface: EditorSurface) => void;
}) {
  const catalog = app.getCoreSnapshot().catalog;
  const entries = useMemo(
    () =>
      Object.entries(catalog.schemas ?? {}).sort(([idA, a], [idB, b]) =>
        catalogSchemaTitle(a, idA).localeCompare(catalogSchemaTitle(b, idB)),
      ),
    [catalog.schemas],
  );
  const [selectedId, setSelectedId] = useState(entries[0]?.[0] ?? '');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!selectedId && entries[0]?.[0]) setSelectedId(entries[0][0]);
    if (selectedId && !catalog.schemas?.[selectedId] && entries[0]?.[0]) {
      setSelectedId(entries[0][0]);
    }
  }, [entries, selectedId, catalog.schemas]);

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

  const selected = selectedId ? catalog.schemas?.[selectedId] : undefined;

  function addSchema() {
    const id = createCatalogUuid();
    const schema: JsonSchemaObject = {
      type: 'object',
      title: 'New schema',
      properties: {},
      additionalProperties: false,
    };
    app.upsertSchema(id, schema);
    setSelectedId(id);
    setQuery('');
  }

  function commitSchema(next: JsonSchemaObject) {
    if (!selectedId) return;
    app.upsertSchema(selectedId, next);
  }

  function renameTitle(name: string) {
    if (!selectedId || !selected) return;
    const trimmed = name.trim();
    commitSchema({
      ...selected,
      title: trimmed || selected.title,
    });
  }

  async function persistSchemas() {
    try {
      await app.saveSchemas();
      session.setNotice('Schemas saved', 'info');
    } catch (failure) {
      session.setNotice(
        failure instanceof Error ? failure.message : 'Could not save schemas',
        'error',
      );
    }
  }

  async function removeSelected() {
    if (!selectedId) return;
    try {
      app.removeSchema(selectedId);
      await app.saveSchemas();
      const next = Object.keys(app.getCoreSnapshot().catalog.schemas ?? {})[0];
      setSelectedId(next ?? '');
    } catch (failure) {
      session.setNotice(
        failure instanceof Error ? failure.message : 'Could not remove schema',
        'error',
      );
    }
  }

  return (
    <section className="design-domain-stage eu-form" aria-label="Catalog schemas">
      <header className="design-domain-head">
        <div className="design-domain-head-main">
          <h1 className="design-domain-breadcrumb">Settings · Schemas</h1>
          <SettingsSections surface={surface} onSelect={onSelectSurface} />
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
              <button type="button" onClick={() => void persistSchemas()}>
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
