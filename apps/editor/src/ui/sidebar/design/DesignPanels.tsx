import { useState } from 'react';
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
import { Field, TextInput } from '../../form/index.js';
import { UnsavedIndicator } from '../../shell/UnsavedIndicator.js';

export { TokensDomainPanel } from './TokensDomainPanel.js';

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
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid font', 'error');
    }
  }

  return (
    <div className="stack design-domain-panel">
      <div className="panel-head">
        <p className="meta">
          Project fonts. The last fallback must be a generic family. Font files are shared across
          viewports; type size changes live on typography tokens.
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
      <div className="font-add-row">
        <Field label="New font id">
          <TextInput
            name="new-font-id"
            value={newFontId}
            placeholder="display"
            onChange={setNewFontId}
          />
        </Field>
        <button type="button" className="text-button" name="add-font" onClick={() => addFont()}>
          Add font
        </button>
      </div>
      {snap.design.fonts.length === 0 ? <p className="inspector-empty">No fonts yet.</p> : null}
      {snap.design.fonts.map((font) => (
        <fieldset key={font.id} className="font-card">
          <legend>{font.id}</legend>
          <TextControl
            label="Family"
            name={`font-${font.id}-family`}
            value={font.family}
            onCommit={(family) => {
              const trimmed = family.trim();
              if (!trimmed || trimmed === font.family) return;
              commitFont(font, { family: trimmed });
            }}
          />
          <TextControl
            label="Fallbacks"
            name={`font-${font.id}-fallbacks`}
            value={font.fallbacks.join(', ')}
            onCommit={(text) => {
              try {
                const fallbacks = parseFontFallbacks(text);
                if (fallbacks.join(', ') === font.fallbacks.join(', ')) return;
                commitFont(font, { fallbacks });
              } catch (error) {
                session.setNotice(
                  error instanceof Error ? error.message : 'Invalid fallbacks',
                  'error',
                );
              }
            }}
          />
          {font.source.type === 'google' ? (
            <>
              <TextControl
                label="Google family"
                name={`font-${font.id}-google-family`}
                value={font.source.family}
                onCommit={(family) => {
                  if (font.source.type !== 'google') return;
                  const trimmed = family.trim();
                  if (!trimmed || trimmed === font.source.family) return;
                  commitFont(font, { googleFamily: trimmed });
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
                    commitFont(font, { weights });
                  } catch (error) {
                    session.setNotice(
                      error instanceof Error ? error.message : 'Invalid weights',
                      'error',
                    );
                  }
                }}
              />
            </>
          ) : (
            <>
              <p className="meta">
                Source: file · file list editing is not supported in the UI yet.
              </p>
              <p className="meta">Weights: {font.weights.join(', ')}</p>
            </>
          )}
          <button
            type="button"
            className="text-button"
            name={`remove-font-${font.id}`}
            onClick={() => removeFont(font)}
          >
            Remove font
          </button>
        </fieldset>
      ))}
    </div>
  );
}
