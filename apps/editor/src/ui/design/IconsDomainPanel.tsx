import { useMemo, useState } from 'react';
import type { EditorSnapshot } from '../../domain/session';
import { Field } from '../components/feedback';
import { TextInput } from '../controls/form-binding/index';
import { IconGraphic } from '../icons/IconGraphic';
import './design-resources.css';

export function IconsDomainPanel({ snap }: { snap: EditorSnapshot }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(snap.design.icons?.[0]?.id ?? null);
  const needle = query.trim().toLowerCase();
  const icons = useMemo(() => {
    const source = snap.design.icons ?? [];
    return source.filter(
      (icon) =>
        !needle ||
        icon.name.toLowerCase().includes(needle) ||
        icon.id.toLowerCase().includes(needle) ||
        icon.category?.toLowerCase().includes(needle),
    );
  }, [needle, snap.design.icons]);
  const categories = [...new Set(icons.map((icon) => icon.category ?? 'uncategorized'))];
  const activeSelectedId = icons.some((icon) => icon.id === selectedId)
    ? selectedId
    : (icons[0]?.id ?? null);
  const selected = snap.design.icons?.find((icon) => icon.id === activeSelectedId) ?? null;

  return (
    <div className="stack design-domain-panel icons-domain-panel">
      <div className="panel-head">
        <p className="meta">
          Project icons are shared visual resources. Select an icon to inspect its stable id and
          source.
        </p>
      </div>
      <Field label="Search icons">
        <TextInput
          name="icon-search"
          aria-label="Search icons"
          value={query}
          placeholder="Search names, ids, or categories"
          onChange={setQuery}
        />
      </Field>
      {icons.length === 0 ? <p className="inspector-empty">No icons match.</p> : null}
      {categories.map((category) => {
        const items = icons.filter((icon) => (icon.category ?? 'uncategorized') === category);
        return (
          <section key={category} className="icon-category" aria-labelledby={`icons-${category}`}>
            <h2 id={`icons-${category}`}>{titleCase(category)}</h2>
            <div className="icon-grid">
              {items.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  className={activeSelectedId === icon.id ? 'icon-card is-selected' : 'icon-card'}
                  aria-pressed={activeSelectedId === icon.id}
                  name={`icon-${icon.id}`}
                  onClick={() => setSelectedId(icon.id)}
                >
                  <span className="icon-preview">
                    <IconGraphic icon={icon} />
                  </span>
                  <strong>{icon.name}</strong>
                  <span>{icon.id}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {selected ? <IconDetails icon={selected} /> : null}
    </div>
  );
}

function IconDetails({ icon }: { icon: NonNullable<EditorSnapshot['design']['icons']>[number] }) {
  return (
    <aside className="icon-details" aria-label="Selected icon details">
      <div className="icon-details-preview">
        <IconGraphic icon={icon} />
      </div>
      <div className="icon-details-copy">
        <h2>{icon.name}</h2>
        <dl>
          <div>
            <dt>ID</dt>
            <dd>
              <code>{icon.id}</code>
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{icon.category ? titleCase(icon.category) : 'Uncategorized'}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>
              <code className="icon-source" title={icon.data.viewBox}>
                viewBox {icon.data.viewBox} · {icon.data.paths.length} path
                {icon.data.paths.length === 1 ? '' : 's'}
              </code>
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

function titleCase(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
