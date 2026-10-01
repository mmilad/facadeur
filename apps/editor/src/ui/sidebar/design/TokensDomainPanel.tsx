import { readTokenTree, refsInText, type JsonValue } from '@facadeur/core';
import { useMemo, useState } from 'react';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
  typographyTokenRefs,
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
import { TextControl } from '../../controls/fields/index.js';
import { TokenValueControl } from '../../controls/fields/TokenValueControl.js';
import { projectFontRefs, type TypographyCatalogs } from '../../controls/typography/index.js';
import { useTokenResolver } from '../../controls/fields/TokenPreviewContext.js';
import { DesignShadowEditor, type DesignShadowInput } from './DesignShadowEditor.js';
import { DesignTypographyEditor, type DesignTypographyValue } from './DesignTypographyEditor.js';
import { OverrideCue } from '../properties/ViewportEditBar.js';
import type { DesignDomain } from './design-domain.js';
import { designDomainLabel, tokenMatchesDomain } from './design-domain.js';
import { ColorTokenAddRow, RemoveColorTokenButton } from './ColorsTokenCrud.js';
import { RadiusTokenAddRow, RemoveRadiusTokenButton } from './RadiusTokenCrud.js';
import { RemoveSpacingTokenButton, SpacingTokenAddRow } from './SpacingTokenCrud.js';
import { RemoveShadowTokenButton, ShadowTokenAddRow } from './ShadowTokenCrud.js';
import { RemoveTypographyTokenButton, TypographyTokenAddRow } from './TypographyTokenCrud.js';
import {
  naturalTokenCompare,
  tokenMatchesQuery,
  TokenTable,
  TokenTableGroup,
  TokenTableToolbar,
} from './TokenTable.js';
import './token-tables.css';

type TokenDomain = Exclude<DesignDomain, 'fonts' | 'icons'>;
type ViewportContext = ReturnType<typeof viewportEditContext>;
interface TableToken {
  path: string;
  type: string;
  value: JsonValue;
  effectiveValue: JsonValue;
  baseValue: JsonValue;
  override: JsonValue | undefined;
  inherited: boolean;
  deprecated: boolean | string | undefined;
}

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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const tokens = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return [...indexed.tokens.values()]
      .filter((token) => tokenMatchesDomain(token.path, token.type, domain))
      .sort((left, right) => naturalTokenCompare(left.path, right.path));
  }, [snap.design.tokens, domain]);
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
  const tableTokens = useMemo<TableToken[]>(
    () =>
      tokens.map((token) => {
        const override = writingId ? token.breakpoints[writingId] : undefined;
        const baseValue = writingId
          ? effectiveBreakpointValue(
              token.value,
              token.breakpoints,
              writingId,
              ctx.breakpoints,
              true,
              token.type,
            )
          : token.value;
        const effectiveValue = writingId
          ? effectiveBreakpointValue(
              token.value,
              token.breakpoints,
              writingId,
              ctx.breakpoints,
              false,
              token.type,
            )
          : token.value;
        return {
          path: token.path,
          type: token.type,
          value: token.value,
          baseValue,
          effectiveValue,
          override,
          inherited: Boolean(writingId && override === undefined),
          deprecated: token.deprecated,
        };
      }),
    [tokens, writingId, ctx.breakpoints],
  );
  const visible = tableTokens.filter((token) =>
    tokenMatchesQuery(
      { path: token.path, valueText: formatTokenValue(token.effectiveValue) },
      query,
    ),
  );
  const groups = groupTokens(visible);
  const domainTitle = designDomainLabel(domain);
  return (
    <div className="stack design-domain-panel">
      <TokenTableToolbar
        query={query}
        onQueryChange={setQuery}
        count={visible.length}
        total={tableTokens.length}
        context={writingId ? `${domainTitle} overrides at ${writingId}` : undefined}
        addAction={
          <>
            {domain === 'colors' ? <ColorTokenAddRow session={session} snap={snap} /> : null}
            {domain === 'spacing' ? <SpacingTokenAddRow session={session} snap={snap} /> : null}
            {domain === 'radius' ? <RadiusTokenAddRow session={session} snap={snap} /> : null}
            {domain === 'shadow' ? <ShadowTokenAddRow session={session} snap={snap} /> : null}
            {domain === 'typography' ? (
              <TypographyTokenAddRow session={session} snap={snap} />
            ) : null}
          </>
        }
      />
      {visible.length === 0 ? (
        <p className="inspector-empty">
          {tableTokens.length
            ? 'No tokens match the search.'
            : `No ${domainTitle.toLowerCase()} tokens.`}
        </p>
      ) : (
        <TokenTable>
          {groups.map((group) => {
            const open = !collapsedGroups.has(group.path);
            return (
              <TokenTableGroup
                key={group.path}
                path={group.path}
                count={group.tokens.length}
                open={open}
                onToggle={() =>
                  setCollapsedGroups((current) => {
                    const next = new Set(current);
                    if (next.has(group.path)) next.delete(group.path);
                    else next.add(group.path);
                    return next;
                  })
                }
              >
                {group.tokens.map((token) => (
                  <TokenTableRow
                    key={token.path}
                    session={session}
                    snap={snap}
                    token={token}
                    writingId={writingId}
                    ctx={ctx}
                    colorTokens={colorTokens}
                    shadowTokens={shadowTokens}
                    typographyCatalogs={typographyCatalogs}
                    showType={domain === 'typography'}
                  />
                ))}
              </TokenTableGroup>
            );
          })}
        </TokenTable>
      )}
    </div>
  );
}

function TokenTableRow({
  session,
  snap,
  token,
  writingId,
  ctx,
  colorTokens,
  shadowTokens,
  typographyCatalogs,
  showType,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  token: TableToken;
  writingId: string | null;
  ctx: ViewportContext;
  colorTokens: readonly string[];
  shadowTokens: readonly string[];
  typographyCatalogs: TypographyCatalogs;
  showType: boolean;
}) {
  const resolvePreview = useTokenResolver();
  const shownValue = token.effectiveValue;
  const text = formatTokenValue(shownValue);
  const colorString = token.type === 'color' && typeof shownValue === 'string' ? shownValue : null;
  const shadowString =
    token.type === 'shadow' && typeof shownValue === 'string' ? shownValue : null;
  const tokenLabel = `${token.path} · ${token.type}`;
  const scalarTokens = scalarTokenRefs(token.type, colorTokens, typographyCatalogs).filter(
    (ref) => ref !== `{${token.path}}`,
  );
  const resolvedPreview = typeof shownValue === 'string' ? resolvePreview(shownValue) : undefined;
  const commitTokenValue = (next: string | null) => {
    if (writingId && (next === null || next.trim() === '')) {
      if (token.override !== undefined) resetTokenBreakpoint(session, snap, token.path, writingId);
      return;
    }
    commitToken(session, snap, token.path, shownValue, next ?? '', writingId);
  };
  return (
    <tr className="token-table-row" data-token-path={token.path}>
      <th scope="row">
        <div className="token-table-name">
          <strong>{token.path}</strong>
          {showType ? <span>{token.type}</span> : null}
        </div>
      </th>
      <td>
        <TokenPreview
          value={shownValue}
          type={token.type}
          color={colorString}
          shadow={shadowString}
          resolved={resolvedPreview}
          resolve={resolvePreview}
        />
      </td>
      <td>
        <div className="token-table-value">
          {colorString !== null ? (
            <ColorControl
              name={`token-${token.path}`}
              label={tokenLabel}
              value={text}
              colorTokens={colorTokens.filter((ref) => ref !== `{${token.path}}`)}
              onCommit={commitTokenValue}
            />
          ) : token.type === 'shadow' ? (
            <DesignShadowEditor
              namePrefix={`token-${token.path}`}
              label={tokenLabel}
              value={shownValue as DesignShadowInput}
              storedValue={
                (writingId ? (token.override ?? token.baseValue) : token.value) as DesignShadowInput
              }
              baseValue={token.baseValue as DesignShadowInput}
              breakpointId={writingId}
              isOverride={Boolean(writingId)}
              shadowTokens={shadowTokens.filter((ref) => ref !== `{${token.path}}`)}
              dimensionTokens={typographyCatalogs.dimensionTokens}
              colorTokens={colorTokens}
              onCommit={(next) => commitRawToken(session, snap, token.path, next, writingId)}
              onReset={
                writingId && token.override !== undefined
                  ? () => resetTokenBreakpoint(session, snap, token.path, writingId)
                  : undefined
              }
            />
          ) : token.type === 'typography' ? (
            <DesignTypographyEditor
              namePrefix={`token-${token.path}`}
              label={tokenLabel}
              value={shownValue as DesignTypographyValue}
              storedValue={
                (writingId
                  ? (token.override ?? token.baseValue)
                  : token.value) as DesignTypographyValue
              }
              baseValue={token.baseValue as DesignTypographyValue}
              breakpointId={writingId}
              isOverride={Boolean(writingId)}
              catalogs={typographyCatalogs}
              typographyTokens={typographyTokenRefs(snap.design.tokens).filter(
                (ref) => ref !== `{${token.path}}`,
              )}
              onCommit={(next) => commitRawToken(session, snap, token.path, next, writingId)}
              onReset={
                writingId && token.override !== undefined
                  ? () => resetTokenBreakpoint(session, snap, token.path, writingId)
                  : undefined
              }
            />
          ) : scalarTokens.length && typeof shownValue === 'string' ? (
            <TokenValueControl
              name={`token-${token.path}`}
              label={tokenLabel}
              value={shownValue}
              tokens={scalarTokens}
              placeholder={
                writingId && token.inherited
                  ? `Inherited · ${formatTokenValue(token.value)}`
                  : undefined
              }
              onCommit={commitTokenValue}
            />
          ) : (
            <TextControl
              label={tokenLabel}
              name={`token-${token.path}`}
              value={text}
              placeholder={
                writingId && token.inherited
                  ? `Inherited · ${formatTokenValue(token.value)}`
                  : undefined
              }
              multiline={typeof shownValue === 'object' && shownValue !== null}
              onCommit={(next) => {
                if (writingId && next.trim() === '') {
                  if (token.override !== undefined)
                    resetTokenBreakpoint(session, snap, token.path, writingId);
                  return;
                }
                commitToken(session, snap, token.path, shownValue, next, writingId);
              }}
            />
          )}
        </div>
      </td>
      <td>
        <div className="token-table-status">
          <span
            className={`token-status${token.override !== undefined ? ' token-status--override' : ''}`}
          >
            {writingId ? (token.override !== undefined ? 'Override' : 'Inherited') : 'Base'}
          </span>
          {token.deprecated ? (
            <span className="token-status token-status--deprecated">Deprecated</span>
          ) : null}
          {ctx.overrideViewport && token.override !== undefined ? (
            <OverrideCue
              minWidth={ctx.overrideViewport.minWidth}
              onReset={() =>
                resetTokenBreakpoint(session, snap, token.path, ctx.overrideViewport?.id ?? '')
              }
            />
          ) : null}
        </div>
      </td>
      <td>
        <div className="token-table-actions">
          {token.type === 'color' ? (
            <RemoveColorTokenButton session={session} snap={snap} path={token.path} />
          ) : null}
          {token.type === 'dimension' && token.path.startsWith('space.') ? (
            <RemoveSpacingTokenButton session={session} snap={snap} path={token.path} />
          ) : null}
          {token.type === 'dimension' && token.path.startsWith('radius.') ? (
            <RemoveRadiusTokenButton session={session} snap={snap} path={token.path} />
          ) : null}
          {token.type === 'shadow' ? (
            <RemoveShadowTokenButton session={session} snap={snap} path={token.path} />
          ) : null}
          {token.type === 'typography' ? (
            <RemoveTypographyTokenButton session={session} snap={snap} path={token.path} />
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function TokenPreview({
  value,
  type,
  color,
  shadow,
  resolved,
  resolve,
}: {
  value: JsonValue;
  type: string;
  color: string | null;
  shadow: string | null;
  resolved?: string;
  resolve: (reference: string) => string | undefined;
}) {
  const previewText = formatTokenValue(value);
  const previewValue = resolved ?? previewText;
  const dimension =
    type === 'dimension' && typeof value === 'string' ? dimensionPreview(value) : null;
  const typography = type === 'typography' && isRecord(value) ? value : null;
  const typographyFamily =
    typography && typeof typography.fontFamily === 'string'
      ? (resolve(typography.fontFamily) ?? typography.fontFamily)
      : undefined;
  const typographySize =
    typography && typeof typography.fontSize === 'string'
      ? (resolve(typography.fontSize) ?? typography.fontSize)
      : undefined;
  const shadowObject = type === 'shadow' && isRecord(value) ? shadowPreview(value, resolve) : null;
  return (
    <div className="token-table-preview" title={previewText}>
      {color !== null ? (
        <span
          className="token-table-swatch"
          style={{ background: resolved ?? color }}
          aria-hidden="true"
        />
      ) : null}
      {shadow !== null || shadowObject !== null ? (
        <span
          className="token-table-swatch"
          style={{ boxShadow: resolved ?? shadowObject ?? shadow ?? undefined }}
          aria-hidden="true"
        />
      ) : null}
      {dimension ? (
        <span
          className="token-table-dimension-bar"
          style={{ width: dimension.width }}
          aria-hidden="true"
        />
      ) : null}
      {typography ? (
        <span
          className="token-table-type-sample"
          style={{ fontFamily: typographyFamily, fontSize: typographySize }}
          aria-hidden="true"
        >
          Aa
        </span>
      ) : null}
      {color === null && shadow === null && shadowObject === null && !dimension && !typography ? (
        <span className="token-table-preview-text">{previewValue}</span>
      ) : null}
      {color !== null || shadow !== null || shadowObject !== null ? (
        <span className="token-table-preview-text">{resolved ?? shadowObject ?? previewValue}</span>
      ) : null}
    </div>
  );
}

function dimensionPreview(value: string): { width: string } | null {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return null;
  const width = Math.max(8, Math.min(88, 8 + Math.abs(number) * 2));
  return { width: `${width}px` };
}

function shadowPreview(
  value: Record<string, JsonValue>,
  resolve: (reference: string) => string | undefined,
): string | null {
  const part = (key: string, fallback: string) => {
    const raw = value[key];
    if (typeof raw !== 'string') return fallback;
    return raw.startsWith('{') ? (resolve(raw) ?? raw) : raw;
  };
  const color = part('color', 'rgba(0,0,0,.2)');
  const x = part('offsetX', '0px');
  const y = part('offsetY', '2px');
  const blur = part('blur', '8px');
  const spread = value.spread === undefined ? '' : ` ${part('spread', '0px')}`;
  return `${value.inset ? 'inset ' : ''}${x} ${y} ${blur}${spread} ${color}`;
}

function groupTokens(tokens: readonly TableToken[]): { path: string; tokens: TableToken[] }[] {
  const groups = new Map<string, TableToken[]>();
  for (const token of tokens) {
    const parts = token.path.split('.');
    const path = parts.length > 1 ? parts.slice(0, -1).join('.') : '(root)';
    const group = groups.get(path);
    if (group) group.push(token);
    else groups.set(path, [token]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => naturalTokenCompare(left, right))
    .map(([path, grouped]) => ({ path, tokens: grouped }));
}

function scalarTokenRefs(
  type: string,
  colors: readonly string[],
  catalogs: TypographyCatalogs,
): readonly string[] {
  if (type === 'color') return colors;
  if (type === 'fontFamily') return catalogs.fontFamilyTokens;
  if (type === 'fontWeight') return catalogs.fontWeightTokens;
  if (type === 'dimension') return catalogs.dimensionTokens;
  if (type === 'number') return catalogs.numberTokens;
  return [];
}

function effectiveBreakpointValue(
  base: JsonValue,
  overrides: Record<string, JsonValue>,
  targetId: string,
  breakpoints: readonly { id: string; minWidth: number }[],
  beforeTarget = false,
  type?: string,
): JsonValue {
  const target = breakpoints.find((breakpoint) => breakpoint.id === targetId);
  if (!target) return base;
  let effective = base;
  for (const breakpoint of breakpoints) {
    if (
      breakpoint.minWidth > target.minWidth ||
      (beforeTarget && breakpoint.minWidth >= target.minWidth)
    )
      break;
    const override = overrides[breakpoint.id];
    if (override !== undefined)
      effective = type === 'typography' ? mergeBreakpointValue(effective, override) : override;
  }
  return effective;
}

function mergeBreakpointValue(base: JsonValue, override: JsonValue | undefined): JsonValue {
  if (override === undefined) return base;
  if (isRecord(base) && isRecord(override)) {
    return { ...base, ...override } as JsonValue;
  }
  return override;
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function commitToken(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  previous: JsonValue,
  text: string,
  breakpointId: string | null,
) {
  try {
    const value = parseEditedValue(text, previous);
    if (containsTokenReference(value, path))
      throw new Error(`Token "${path}" cannot reference itself`);
    const token = breakpointId
      ? withTokenBreakpoint(snap.design.tokens, path, breakpointId, value)
      : withTokenValue(snap.design.tokens, path, value);
    session.executeDesign({ type: 'setToken', path, token });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function commitRawToken(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  next: unknown,
  breakpointId: string | null,
) {
  if (next === null || next === undefined) {
    if (breakpointId) resetTokenBreakpoint(session, snap, path, breakpointId);
    return;
  }
  try {
    const value = JSON.parse(JSON.stringify(next)) as JsonValue;
    if (containsTokenReference(value, path))
      throw new Error(`Token "${path}" cannot reference itself`);
    const token = breakpointId
      ? withTokenBreakpoint(snap.design.tokens, path, breakpointId, value)
      : withTokenValue(snap.design.tokens, path, value);
    session.executeDesign({ type: 'setToken', path, token });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function containsTokenReference(value: unknown, path: string): boolean {
  if (typeof value === 'string') return refsInText(value).includes(path);
  if (Array.isArray(value)) return value.some((item) => containsTokenReference(item, path));
  if (value && typeof value === 'object')
    return Object.values(value).some((item) => containsTokenReference(item, path));
  return false;
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
