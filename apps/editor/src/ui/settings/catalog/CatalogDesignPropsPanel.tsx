'use client';

import { createCatalogUuid } from '@facadeur/core';
import type { DesignPropDefinition } from '@facadeur/domain';
import { useState } from 'react';
import type { AppService } from '../../../app-service';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';
import { Stack } from '../../components/layout';
import { Field } from '../../components/feedback';
import { SearchInput, TextInput } from '../../controls/form-binding/index';
import { SettingsSections } from '../SettingsSections';
import type { EditorSurface } from '../../design/design-domain';

export function CatalogDesignPropsPanel({
  app,
  surface,
  onEvent,
}: {
  app: AppService;
  surface: EditorSurface;
  onEvent: (event: EditorEvent) => void;
}) {
  const entries = app.getDesignProps().sort((left, right) => left.name.localeCompare(right.name));
  const [selectedId, setSelectedId] = useState(entries[0]?.uuid ?? '');
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? entries.filter(
        (prop) =>
          prop.name.toLowerCase().includes(needle) || prop.uuid.toLowerCase().includes(needle),
      )
    : entries;

  const selected = entries.find((prop) => prop.uuid === selectedId);

  function addProp() {
    const uuid = createCatalogUuid();
    onEvent({
      type: EditorEventType.DesignPropUpsert,
      data: { prop: { uuid, name: 'New prop', value: '' } },
    });
    setSelectedId(uuid);
    setQuery('');
  }

  function commitProp(patch: Partial<DesignPropDefinition>) {
    if (!selected) return;
    onEvent({
      type: EditorEventType.DesignPropUpsert,
      data: {
        prop: {
          uuid: selected.uuid,
          name: patch.name ?? selected.name,
          value: patch.value ?? selected.value,
        },
      },
    });
  }

  function removeSelected() {
    if (!selected) return;
    onEvent({ type: EditorEventType.DesignPropRemove, data: { uuid: selected.uuid } });
    const next = app.getDesignProps()[0];
    setSelectedId(next?.uuid ?? '');
  }

  return (
    <section className="design-domain-stage eu-form" aria-label="Design props">
      <header className="design-domain-head">
        <div className="design-domain-head-main">
          <h1 className="design-domain-breadcrumb">Settings · Props</h1>
          <SettingsSections surface={surface} onEvent={onEvent} />
        </div>
        <p className="meta">
          Semantic values bound in the inspector as <code>{'{prop:uuid}'}</code>. Save catalog to
          persist.
        </p>
      </header>
      <div className="design-domain-body">
        <Stack gap={12}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search props" />
          <div className="design-domain-actions">
            <button type="button" onClick={addProp}>
              Add prop
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => onEvent({ type: EditorEventType.DesignPropsSave, data: {} })}
            >
              Save catalog
            </button>
          </div>
          <ul>
            {visible.map((prop) => (
              <li key={prop.uuid}>
                <button
                  type="button"
                  className={prop.uuid === selectedId ? 'is-active' : undefined}
                  onClick={() => setSelectedId(prop.uuid)}
                >
                  {prop.name}
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <Stack gap={10}>
              <Field label="Name">
                <TextInput
                  value={selected.name}
                  onCommit={(next) => commitProp({ name: next.trim() || selected.name })}
                />
              </Field>
              <Field
                label="Value"
                hint="Token reference ({token:uuid}) or literal used when resolving bindings."
              >
                <TextInput
                  value={selected.value}
                  onCommit={(next) => commitProp({ value: next })}
                />
              </Field>
              <p className="meta">
                Binding ref: <code>{`{prop:${selected.uuid}}`}</code>
              </p>
              <button type="button" className="text-button" onClick={removeSelected}>
                Remove prop
              </button>
            </Stack>
          ) : (
            <p className="inspector-empty">
              Add a design prop to use property bindings in the inspector.
            </p>
          )}
        </Stack>
      </div>
    </section>
  );
}
