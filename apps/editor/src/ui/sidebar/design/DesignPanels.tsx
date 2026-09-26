import { readTokenTree, type FontFamily } from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
} from '../../../domain/editing.js';
import { documentToJson, saveJsonFile } from '../../../domain/files.js';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import {
  formatTokenValue,
  parseEditedValue,
  withTokenBreakpoint,
  withTokenValue,
} from '../../../domain/token-edit.js';
import { editorBreakpoints, viewportEditContext } from '../../../domain/viewport-edit.js';
import { ColorControl } from '../../controls/color/index.js';
import { ShadowControl } from '../../controls/shadow/index.js';
import { TextControl } from '../../controls/fields/index.js';
import {
  isTypographyValue,
  projectFontRefs,
  TypographyControl,
  type TypographyCatalogs,
} from '../../controls/typography/index.js';
import { OverrideCue } from '../properties/ViewportEditBar.js';
import type { DesignDomain } from './design-domain.js';
import { designDomainLabel, tokenMatchesDomain } from './design-domain.js';

type TokenDomain = Exclude<DesignDomain, 'fonts'>;

export function TokensDomainPanel({
  session,
  snap,
  domain,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  domain: TokenDomain;
}) {
  const [query, setQuery] = useState('');
  const tokens = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return [...indexed.tokens.values()]
      .filter((token) => tokenMatchesDomain(token.path, token.type, domain))
      .sort((left, right) => left.path.localeCompare(right.path));
  }, [snap.design, domain]);
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const writingId = ctx.writingBreakpointId;
  const colorTokens = useMemo(() => colorTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const shadowTokens = useMemo(() => shadowTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const typographyCatalogs = useMemo<TypographyCatalogs>(
    () => ({
      fontRefs: projectFontRefs(snap.design.fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    }),
    [snap.design.fonts, snap.design.tokens],
  );
  const needle = query.trim().toLowerCase();
  const visible = needle ? tokens.filter((token) => token.path.includes(needle)) : tokens;
  let group = '';
  const domainTitle = designDomainLabel(domain);

  return (
    <div className="stack design-domain-panel">
      <div className="panel-head">
        <p className="meta">
          {writingId
            ? `${domainTitle} overrides at ${writingId}. $value stays the base.`
            : `${domainTitle} tokens. Base edits $value and update every viewport that has no override.`}
        </p>
        <button
          type="button"
          className="text-button"
          onClick={() => void saveDesign(session, snap)}
        >
          Save design
        </button>
      </div>
      <label className="field">
        <span>Filter</span>
        <input
          name="token-filter"
          value={query}
          placeholder={`${domain}.accent`}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {visible.length === 0 ? (
        <p className="inspector-empty">No tokens in this domain match the filter.</p>
      ) : null}
      {visible.map((token) => {
        const nextGroup = token.path.split('.')[0] ?? '';
        const heading = nextGroup !== group;
        group = nextGroup;
        const override = writingId ? token.breakpoints[writingId] : undefined;
        const shownValue = writingId ? override : token.value;
        const text = shownValue === undefined ? '' : formatTokenValue(shownValue);
        const previous = shownValue === undefined ? token.value : shownValue;
        const colorString =
          token.type === 'color' && typeof previous === 'string' ? previous : null;
        const shadowString =
          token.type === 'shadow' && typeof previous === 'string' ? previous : null;
        const typographyObject =
          token.type === 'typography' && isTypographyValue(previous) ? previous : null;
        const tokenLabel = `${token.path} · ${token.type}`;
        const commitTokenValue = (next: string | null) => {
          if (writingId && (next === null || next.trim() === '')) {
            if (override !== undefined) {
              resetTokenBreakpoint(session, snap, token.path, writingId);
            }
            return;
          }
          commitToken(session, snap, token.path, previous, next ?? '', writingId);
        };
        const commitTypographyValue = (next: Record<string, unknown> | null) => {
          if (writingId && next === null) {
            if (override !== undefined) {
              resetTokenBreakpoint(session, snap, token.path, writingId);
            }
            return;
          }
          commitToken(
            session,
            snap,
            token.path,
            previous,
            next === null ? '' : JSON.stringify(next),
            writingId,
          );
        };
        return (
          <div key={token.path}>
            {heading ? <h3>{nextGroup}</h3> : null}
            <div className="token-row">
              {colorString !== null ? (
                <ColorControl
                  name={`token-${token.path}`}
                  label={tokenLabel}
                  value={text}
                  colorTokens={colorTokens}
                  onCommit={commitTokenValue}
                />
              ) : shadowString !== null ? (
                <ShadowControl
                  name={`token-${token.path}`}
                  label={tokenLabel}
                  value={text}
                  shadowTokens={shadowTokens}
                  onCommit={commitTokenValue}
                />
              ) : typographyObject !== null ? (
                <TypographyControl
                  namePrefix={`token-${token.path}`}
                  label={tokenLabel}
                  value={typographyObject}
                  partial={writingId !== null && override !== undefined}
                  catalogs={typographyCatalogs}
                  onCommit={commitTypographyValue}
                />
              ) : (
                <TextControl
                  label={tokenLabel}
                  name={`token-${token.path}`}
                  value={text}
                  placeholder={
                    writingId && override === undefined ? formatTokenValue(token.value) : undefined
                  }
                  multiline={typeof previous === 'object' && previous !== null}
                  onCommit={(next) => {
                    if (writingId && next.trim() === '') {
                      if (override !== undefined) {
                        resetTokenBreakpoint(session, snap, token.path, writingId);
                      }
                      return;
                    }
                    commitToken(session, snap, token.path, previous, next, writingId);
                  }}
                />
              )}
            </div>
            {ctx.overrideViewport && token.breakpoints[ctx.overrideViewport.id] !== undefined ? (
              <OverrideCue
                minWidth={ctx.overrideViewport.minWidth}
                onReset={() =>
                  resetTokenBreakpoint(session, snap, token.path, ctx.overrideViewport?.id ?? '')
                }
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function FontsDomainPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  return (
    <div className="stack design-domain-panel">
      <div className="panel-head">
        <p className="meta">
          Project fonts. The last fallback must be a generic family. Font files are shared across
          viewports; type size changes live on typography tokens.
        </p>
        <button
          type="button"
          className="text-button"
          onClick={() => void saveDesign(session, snap)}
        >
          Save design
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
              session.executeDesign({
                type: 'setFont',
                font: editedFont(font, { family: trimmed }),
              });
            }}
          />
          <TextControl
            label="Fallbacks"
            name={`font-${font.id}-fallbacks`}
            value={font.fallbacks.join(', ')}
            onCommit={(text) => {
              const fallbacks = text
                .split(',')
                .map((part) => part.trim())
                .filter((part) => part.length > 0);
              session.executeDesign({ type: 'setFont', font: editedFont(font, { fallbacks }) });
            }}
          />
          <p className="meta">
            {font.source.type === 'google' ? `Google · ${font.source.family}` : 'File'} ·{' '}
            {font.weights.join(', ')}
          </p>
        </fieldset>
      ))}
    </div>
  );
}

function commitToken(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  previous: Parameters<typeof parseEditedValue>[1],
  text: string,
  breakpointId: string | null,
) {
  try {
    const value = parseEditedValue(text, previous);
    const token = breakpointId
      ? withTokenBreakpoint(snap.design.tokens, path, breakpointId, value)
      : withTokenValue(snap.design.tokens, path, value);
    session.executeDesign({ type: 'setToken', path, token });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function resetTokenBreakpoint(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  breakpointId: string,
) {
  if (!breakpointId) return;
  try {
    session.executeDesign({
      type: 'setToken',
      path,
      token: withTokenBreakpoint(snap.design.tokens, path, breakpointId, null),
    });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function editedFont(
  font: FontFamily,
  patch: { family?: string; fallbacks?: string[] },
): FontFamily {
  const family = patch.family ?? font.family;
  return {
    id: font.id,
    family,
    weights: [...font.weights],
    ...(font.styles ? { styles: [...font.styles] } : {}),
    source:
      font.source.type === 'google'
        ? { type: 'google', family: patch.family ?? font.source.family }
        : { type: 'file', files: font.source.files.map((file) => ({ ...file })) },
    fallbacks: patch.fallbacks ? [...patch.fallbacks] : [...font.fallbacks],
  };
}

async function saveDesign(session: EditorSession, snap: EditorSnapshot) {
  const id = snap.design.id;
  try {
    const result = await saveJsonFile({
      filename: session.filenameFor(id),
      text: documentToJson(snap.design),
      handle: session.fileHandle(id),
    });
    if (result.handle) session.rememberHandle(id, result.handle);
    const verb = result.via === 'download' ? 'Downloaded' : 'Saved';
    session.setNotice(`${verb} ${session.filenameFor(id)}`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    session.setNotice(error instanceof Error ? error.message : 'Could not save', 'error');
  }
}
