import { useMemo, useState } from 'react';
import { fontStack } from '@facadeur/tokens';
import {
  assertFontId,
  createDefaultFont,
  editedFont,
  parseFontFallbacks,
  parseFontWeights,
  suggestFontId,
  tokenPathsReferencingFont,
} from '../../../domain/font-edit.js';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { TextControl } from '../../controls/fields/index.js';
import { Field, Popover, TextInput } from '../../form/index.js';
import './design-resources.css';

export { TokensDomainPanel } from './TokensDomainPanel.js';
export { IconsDomainPanel } from './IconsDomainPanel.js';

export function FontsDomainPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const [newFontId, setNewFontId] = useState(() =>
    suggestFontId(snap.design.fonts.map((font) => font.id)),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const fonts = useMemo(() => {
    if (!needle) return snap.design.fonts;
    return snap.design.fonts.filter((font) => {
      const source = font.source.type === 'google' ? font.source.family : 'file';
      return [font.id, font.family, source, font.source.type].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [needle, snap.design.fonts]);

  function commitFont(
    font: (typeof snap.design.fonts)[number],
    patch: Parameters<typeof editedFont>[1],
  ) {
    try {
      session.executeDesign({ type: 'setFont', font: editedFont(font, patch) });
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid font', 'error');
    }
  }

  function removeFont(font: (typeof snap.design.fonts)[number]) {
    const refs = tokenPathsReferencingFont(snap.design.tokens, font.id);
    if (refs.length) {
      session.setNotice(
        `Cannot remove "${font.id}": {font.${font.id}} is referenced in ${refs.join(', ')}`,
        'error',
      );
      return;
    }
    session.executeDesign({ type: 'removeFont', id: font.id });
    setExpandedId((current) => (current === font.id ? null : current));
  }

  function addFont() {
    try {
      const id = newFontId.trim();
      assertFontId(id);
      if (snap.design.fonts.some((font) => font.id === id)) {
        throw new Error(`Font "${id}" already exists`);
      }
      session.executeDesign({ type: 'setFont', font: createDefaultFont(id) });
      setNewFontId(suggestFontId([...snap.design.fonts.map((font) => font.id), id]));
      setExpandedId(id);
      setAddOpen(false);
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid font', 'error');
    }
  }

  return (
    <div className="stack design-domain-panel fonts-domain-panel">
      <div className="panel-head">
        <p className="meta">
          Project fonts. Fallbacks end with a generic family. Font files are shared across
          viewports; type size changes live on typography tokens.
        </p>
      </div>
      <div className="resource-toolbar">
        <Field label="Search fonts">
          <TextInput
            name="font-search"
            aria-label="Search fonts"
            value={query}
            placeholder="Search names, ids, or source"
            onChange={setQuery}
          />
        </Field>
        <Popover
          open={addOpen}
          onOpenChange={setAddOpen}
          trigger={
            <button
              type="button"
              className="text-button"
              name="add-font-trigger"
              aria-expanded={addOpen}
              aria-haspopup="dialog"
            >
              Add font
            </button>
          }
        >
          <div className="font-add-popover">
            <Field label="New font id">
              <TextInput
                name="new-font-id"
                aria-label="New font id"
                value={newFontId}
                placeholder="display"
                onChange={setNewFontId}
              />
            </Field>
            <button type="button" className="text-button" name="add-font" onClick={addFont}>
              Add
            </button>
          </div>
        </Popover>
      </div>
      {fonts.length === 0 ? <p className="inspector-empty">No fonts match.</p> : null}
      {fonts.length ? (
        <div className="font-table-wrap">
          <table className="font-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Preview</th>
                <th scope="col">Family</th>
                <th scope="col">Source</th>
                <th scope="col">Weights</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fonts.map((font) => {
                const expanded = expandedId === font.id;
                const source =
                  font.source.type === 'google' ? `Google · ${font.source.family}` : 'File';
                return (
                  <FontTableRows
                    key={font.id}
                    font={font}
                    expanded={expanded}
                    source={source}
                    onToggle={() => setExpandedId(expanded ? null : font.id)}
                    onRemove={() => removeFont(font)}
                    onCommit={(patch) => commitFont(font, patch)}
                    onError={(error) =>
                      session.setNotice(
                        error instanceof Error ? error.message : 'Invalid font',
                        'error',
                      )
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

type Font = EditorSnapshot['design']['fonts'][number];
type FontPatch = Parameters<typeof editedFont>[1];

function FontTableRows({
  font,
  expanded,
  source,
  onToggle,
  onRemove,
  onCommit,
  onError,
}: {
  font: Font;
  expanded: boolean;
  source: string;
  onToggle: () => void;
  onRemove: () => void;
  onCommit: (patch: FontPatch) => void;
  onError: (error: unknown) => void;
}) {
  const googleFamily = font.source.type === 'google' ? font.source.family : null;
  return (
    <>
      <tr className={expanded ? 'font-row is-expanded' : 'font-row'}>
        <th scope="row">
          <button
            type="button"
            className="font-row-toggle"
            name={`font-details-${font.id}`}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            <span className="font-row-chevron" aria-hidden="true">
              {expanded ? '⌄' : '›'}
            </span>
            <code>{font.id}</code>
          </button>
        </th>
        <td>
          <span className="font-preview" style={{ fontFamily: fontStack(font) }}>
            Aa
          </span>
        </td>
        <td className="font-family-cell">{font.family}</td>
        <td>{source}</td>
        <td>
          <span className="font-weights">{font.weights.join(', ')}</span>
        </td>
        <td className="font-actions">
          <button
            type="button"
            className="icon-button danger-button"
            name={`remove-font-${font.id}`}
            title={`Remove font ${font.id}`}
            aria-label={`Remove font ${font.id}`}
            onClick={onRemove}
          >
            <TrashIcon />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="font-detail-row">
          <td colSpan={6}>
            <div className="font-details">
              <section className="font-detail-section">
                <h3>Source metadata</h3>
                <TextControl
                  label="Family"
                  name={`font-${font.id}-family`}
                  value={font.family}
                  onCommit={(family) => {
                    const trimmed = family.trim();
                    if (!trimmed || trimmed === font.family) return;
                    onCommit({ family: trimmed });
                  }}
                />
                {googleFamily ? (
                  <TextControl
                    label="Google family"
                    name={`font-${font.id}-google-family`}
                    value={googleFamily}
                    onCommit={(family) => {
                      const trimmed = family.trim();
                      if (!trimmed || trimmed === googleFamily) return;
                      onCommit({ googleFamily: trimmed });
                    }}
                  />
                ) : (
                  <p className="meta resource-detail-note">
                    File source · file list editing is not supported in the UI yet.
                  </p>
                )}
              </section>
              <section className="font-detail-section">
                <h3>Fallbacks and weights</h3>
                <TextControl
                  label="Fallbacks"
                  name={`font-${font.id}-fallbacks`}
                  value={font.fallbacks.join(', ')}
                  onCommit={(text) => {
                    try {
                      const fallbacks = parseFontFallbacks(text);
                      if (fallbacks.join(', ') === font.fallbacks.join(', ')) return;
                      onCommit({ fallbacks });
                    } catch (error) {
                      onError(error);
                    }
                  }}
                />
                <TextControl
                  label="Weights"
                  name={`font-${font.id}-weights`}
                  value={font.weights.join(', ')}
                  onCommit={(text) => {
                    try {
                      const weights = parseFontWeights(text);
                      if (weights.join(',') === font.weights.join(',')) return;
                      onCommit({ weights });
                    } catch (error) {
                      onError(error);
                    }
                  }}
                />
              </section>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.5 5.5v7h9v-7M2.5 4h11M6 4V2.5h4V4M6.5 7.5v3M9.5 7.5v3" />
    </svg>
  );
}
