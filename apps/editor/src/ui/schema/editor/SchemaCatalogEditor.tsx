import { Form, type FormFieldConfig } from '@facadeur/form';
import type { JsonSchema } from '@facadeur/core';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { catalogSchemaTitle } from '../../../domain/catalog/schema-display';
import type { SchemaReferenceChoice } from './SchemaEditor';
import { SchemaEditor } from './SchemaEditor';
import { fieldConfig } from './presets';
import styles from './SchemaCatalogEditor.module.css';

export type CatalogSchemaEntry = {
  uuid: string;
  schema: JsonSchema;
};

export type SchemaCatalogEditorProps = {
  headerContent?: ReactNode;
  schemas: readonly CatalogSchemaEntry[];
  selectedId: string;
  query: string;
  references: readonly SchemaReferenceChoice[];
  isSaved?: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (uuid: string) => void;
  onCreate: () => void;
  onSchemaChange: (uuid: string, schema: JsonSchema) => void;
  onDelete: (uuid: string) => void;
  onSave: () => void;
};

const searchFields: readonly FormFieldConfig[] = [
  fieldConfig('query', { placeholder: 'Name or id' }),
];

const displayNameFields: readonly FormFieldConfig[] = [fieldConfig('displayName')];

export function SchemaCatalogEditor({
  headerContent,
  schemas,
  selectedId,
  query,
  references,
  isSaved = false,
  onQueryChange,
  onSelect,
  onCreate,
  onSchemaChange,
  onDelete,
  onSave,
}: SchemaCatalogEditorProps) {
  const entries = useMemo(
    () =>
      schemas
        .map(({ uuid, schema }) => ({ uuid, schema, title: catalogSchemaTitle(schema, uuid) }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [schemas],
  );
  const needle = query.trim().toLowerCase();
  const visibleEntries = needle
    ? entries.filter(
        ({ uuid, title }) =>
          title.toLowerCase().includes(needle) || uuid.toLowerCase().includes(needle),
      )
    : entries;
  const selected = schemas.find(({ uuid }) => uuid === selectedId);

  return (
    <section className={styles.catalog} aria-label="Catalog schemas">
      <header className={styles.header}>{headerContent ?? <h1>Settings · Schemas</h1>}</header>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Schema list">
          <Form
            value={{ query }}
            fields={searchFields}
            onChange={(next) => onQueryChange(String(next.query ?? ''))}
          />
          <button type="button" onClick={onCreate}>
            New schema
          </button>
          <div className={styles.list}>
            {entries.length === 0 ? (
              <p>No schemas yet.</p>
            ) : visibleEntries.length === 0 ? (
              <p>No schemas match.</p>
            ) : (
              visibleEntries.map(({ uuid, title }) => (
                <button
                  key={uuid}
                  type="button"
                  className={uuid === selectedId ? styles.selectedItem : styles.item}
                  aria-pressed={uuid === selectedId}
                  onClick={() => onSelect(uuid)}
                >
                  {title}
                </button>
              ))
            )}
          </div>
        </aside>

        {selected ? (
          <main className={styles.editor}>
            <Form
              value={{ displayName: String(selected.schema.title ?? '') }}
              fields={displayNameFields}
              onChange={(next) =>
                onSchemaChange(selected.uuid, {
                  ...selected.schema,
                  title: String(next.displayName ?? ''),
                })
              }
            />
            <p className={styles.id}>Id: {selected.uuid}</p>
            <SchemaEditor
              schema={selected.schema}
              references={references}
              onChange={(schema) => onSchemaChange(selected.uuid, schema)}
            />
            <div className={styles.footer}>
              <button type="button" onClick={() => onDelete(selected.uuid)}>
                Delete schema
              </button>
            </div>
            <p className={styles.status} role="status">
              {isSaved ? 'Changes saved to the Storybook catalog.' : 'Changes are not saved.'}
            </p>
            <button type="button" onClick={onSave}>
              Save schemas to project
            </button>
          </main>
        ) : (
          <p className={styles.empty}>Create or select a schema to edit it.</p>
        )}
      </div>
    </section>
  );
}
