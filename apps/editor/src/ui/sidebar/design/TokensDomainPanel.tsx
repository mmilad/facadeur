import { readTokenTree } from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
} from '../../../domain/editing.js';
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
import { UnsavedIndicator } from '../../shell/UnsavedIndicator.js';
import type { DesignDomain } from './design-domain.js';
import { designDomainLabel, tokenMatchesDomain } from './design-domain.js';
import { ColorTokenAddRow, RemoveColorTokenButton } from './ColorsTokenCrud.js';
import { RadiusTokenAddRow, RemoveRadiusTokenButton } from './RadiusTokenCrud.js';
import { RemoveSpacingTokenButton, SpacingTokenAddRow } from './SpacingTokenCrud.js';
import { RemoveShadowTokenButton, ShadowTokenAddRow } from './ShadowTokenCrud.js';
import { RemoveTypographyTokenButton, TypographyTokenAddRow } from './TypographyTokenCrud.js';

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
      {domain === 'colors' ? <ColorTokenAddRow session={session} snap={snap} /> : null}
      {domain === 'spacing' ? <SpacingTokenAddRow session={session} snap={snap} /> : null}
      {domain === 'radius' ? <RadiusTokenAddRow session={session} snap={snap} /> : null}
      {domain === 'shadow' ? <ShadowTokenAddRow session={session} snap={snap} /> : null}
      {domain === 'typography' ? <TypographyTokenAddRow session={session} snap={snap} /> : null}
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
            {domain === 'colors' ? (
              <RemoveColorTokenButton session={session} snap={snap} path={token.path} />
            ) : null}
            {domain === 'spacing' ? (
              <RemoveSpacingTokenButton session={session} snap={snap} path={token.path} />
            ) : null}
            {domain === 'radius' ? (
              <RemoveRadiusTokenButton session={session} snap={snap} path={token.path} />
            ) : null}
            {domain === 'shadow' ? (
              <RemoveShadowTokenButton session={session} snap={snap} path={token.path} />
            ) : null}
            {domain === 'typography' ? (
              <RemoveTypographyTokenButton session={session} snap={snap} path={token.path} />
            ) : null}
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
