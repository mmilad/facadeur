'use client';

import { createCatalogUuid } from '@facadeur/core';
import type { DesignPropDefinition } from '@facadeur/domain';
import { useMemo, useState } from 'react';
import type { AppService } from '../../../app-service';
import type { EditorSession } from '../../../domain/session';
import { Field, SearchInput, Stack, TextInput } from '../../form/index';
import { SettingsSections } from '../SettingsSections';
import type { EditorSurface } from '../../design/design-domain';

export function CatalogDesignPropsPanel({
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
      Object.values(catalog.props ?? {}).sort((left, right) => left.name.localeCompare(right.name)),
    [catalog.props],
  );
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
    try {
      app.upsertDesignProp({ uuid, name: 'New prop', value: '' });
      setSelectedId(uuid);
      setQuery('');
    } catch (failure) {
      session.setNotice(failure instanceof Error ? failure.message : 'Could not add prop', 'error');
    }
  }

  function commitProp(patch: Partial<DesignPropDefinition>) {
    if (!selected) return;
    try {
      app.upsertDesignProp({
        uuid: selected.uuid,
        name: patch.name ?? selected.name,
        value: patch.value ?? selected.value,
      });
    } catch (failure) {
      session.setNotice(
        failure instanceof Error ? failure.message : 'Could not save prop',
        'error',
      );
    }
  }

  async function persist() {
    try {
      await app.persistCatalog();
      session.setNotice('Props saved', 'info');
    } catch (failure) {
      session.setNotice(
        failure instanceof Error ? failure.message : 'Could not save props',
        'error',
      );
    }
  }

  function removeSelected() {
    if (!selected) return;
    app.removeDesignProp(selected.uuid);
    const next = Object.values(app.getCoreSnapshot().catalog.props ?? {})[0];
    setSelectedId(next?.uuid ?? '');
  }

  return (
    <section className="design-domain-stage eu-form" aria-label="Design props">
      <header className="design-domain-head">
        <div className="design-domain-head-main">
          <h1 className="design-domain-breadcrumb">Settings · Props</h1>
          <SettingsSections surface={surface} onSelect={onSelectSurface} />
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
            <button type="button" className="text-button" onClick={() => void persist()}>
              Save catalog
            </button>
          </div>
          <ul className="schema-library-list">
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
