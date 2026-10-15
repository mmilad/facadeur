'use client';

import { createCatalogUuid } from '@facadeur/core';
import type { JsonSchemaObject } from '@facadeur/domain';
import { useEffect, useState } from 'react';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';
import type { EditorSurface } from '../../design/design-domain';
import { SettingsSections } from '../SettingsSections';
import type { CatalogSchemaEntry } from '../../schema/editor/SchemaCatalogEditor';
import { SchemaCatalogEditor } from '../../schema/editor/SchemaCatalogEditor';
import type { SchemaReferenceChoice } from '../../schema/editor/SchemaEditor';

export function CatalogSchemasPanel({
  schemas,
  surface,
  onEvent,
}: {
  schemas: readonly { uuid: string; schema: JsonSchemaObject }[];
  surface: EditorSurface;
  onEvent: (event: EditorEvent) => void;
}) {
  const [selectedId, setSelectedId] = useState(schemas[0]?.uuid ?? '');
  const [query, setQuery] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!selectedId && schemas[0]?.uuid) setSelectedId(schemas[0].uuid);
    if (selectedId && !schemas.some(({ uuid }) => uuid === selectedId)) {
      setSelectedId(schemas[0]?.uuid ?? '');
    }
  }, [schemas, selectedId]);

  const entries: CatalogSchemaEntry[] = schemas.map(({ uuid, schema }) => ({ uuid, schema }));
  const references: SchemaReferenceChoice[] = schemas.map(({ uuid, schema }) => ({
    ref: `urn:facadeur:schema:${uuid}`,
    label: String(schema.title ?? uuid),
    group: 'Catalog schemas',
  }));

  return (
    <SchemaCatalogEditor
      headerContent={
        <div className="design-domain-head-main">
          <h1 className="design-domain-breadcrumb">Settings · Schemas</h1>
          <SettingsSections surface={surface} onEvent={onEvent} />
        </div>
      }
      schemas={entries}
      selectedId={selectedId}
      query={query}
      references={references}
      isSaved={isSaved}
      onQueryChange={setQuery}
      onSelect={setSelectedId}
      onCreate={() => {
        const uuid = createCatalogUuid();
        const schema: JsonSchemaObject = {
          type: 'object',
          title: 'New schema',
          properties: {},
          additionalProperties: false,
        };
        onEvent({ type: EditorEventType.SchemaUpsert, data: { uuid, schema } });
        setSelectedId(uuid);
        setQuery('');
        setIsSaved(false);
      }}
      onSchemaChange={(uuid, schema) => {
        onEvent({
          type: EditorEventType.SchemaUpsert,
          data: { uuid, schema: schema as JsonSchemaObject },
        });
        setIsSaved(false);
      }}
      onDelete={(uuid) => {
        onEvent({ type: EditorEventType.SchemaRemove, data: { uuid } });
        setSelectedId(schemas.find((entry) => entry.uuid !== uuid)?.uuid ?? '');
        setIsSaved(true);
      }}
      onSave={() => {
        onEvent({ type: EditorEventType.SchemasSave, data: {} });
        setIsSaved(true);
      }}
    />
  );
}
