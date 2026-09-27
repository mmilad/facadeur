import { useMemo, useState } from 'react';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { Field, TextInput } from '../../form/index.js';
import { UnsavedIndicator } from '../../shell/UnsavedIndicator.js';

export function IconsDomainPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const [query, setQuery] = useState('');
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

  return (
    <div className="stack design-domain-panel icons-domain-panel">
      <div className="panel-head">
        <p className="meta">
          Project icons are shared visual resources. Controls can use them through image fields or
          icon slots.
        </p>
        <UnsavedIndicator designDirty={snap.designDirty} />
        <button
          type="button"
          className="text-button"
          data-save="design"
          onClick={() => void session.saveDesign()}
        >
          Save design
        </button>
      </div>
      <Field label="Search icons">
        <TextInput
          name="icon-search"
          value={query}
          placeholder="Search by name or category"
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
                <article key={icon.id} className="icon-card">
                  <div className="icon-preview">
                    <img src={icon.src} alt="" aria-hidden="true" />
                  </div>
                  <strong>{icon.name}</strong>
                  <span>{icon.id}</span>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function titleCase(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
