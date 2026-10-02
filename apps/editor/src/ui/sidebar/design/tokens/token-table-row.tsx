import type { JsonValue } from '@facadeur/core';
import { typographyTokenRefs } from '../../../../domain/editing.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { formatTokenValue } from '../../../../domain/edits/token-edit.js';
import type { viewportEditContext } from '../../../../domain/viewport/viewport-edit.js';
import { ColorControl } from '../../../controls/color/index.js';
import { TextControl } from '../../../controls/fields/index.js';
import { TokenValueControl } from '../../../controls/fields/TokenValueControl.js';
import { useTokenResolver } from '../../../controls/fields/TokenPreviewContext.js';
import type { TypographyCatalogs } from '../../../controls/typography/index.js';
import { DesignShadowEditor, type DesignShadowInput } from '../DesignShadowEditor.js';
import { DesignTypographyEditor, type DesignTypographyValue } from '../DesignTypographyEditor.js';
import { OverrideCue } from '../../properties/ViewportEditBar.js';
import { RemoveColorTokenButton } from './ColorsTokenCrud.js';
import { RemoveRadiusTokenButton } from './RadiusTokenCrud.js';
import { RemoveSpacingTokenButton } from './SpacingTokenCrud.js';
import { RemoveShadowTokenButton } from './ShadowTokenCrud.js';
import { RemoveTypographyTokenButton } from './TypographyTokenCrud.js';
import {
  commitRawToken,
  commitToken,
  resetTokenBreakpoint,
  type TableToken,
} from './token-breakpoint-helpers.js';
import { tokenLeafLabel } from './token-labels.js';
import { withTokenLabel } from '../../../../domain/edits/token-edit.js';
import { previewDesignTokenCssVar } from '../../../../domain/component-tokens.js';

type ViewportContext = ReturnType<typeof viewportEditContext>;

export function TokenTableRow({
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
  const displayLabel = token.label ?? tokenLeafLabel(token.path);
  const colorString = token.type === 'color' && typeof shownValue === 'string' ? shownValue : null;
  const shadowString =
    token.type === 'shadow' && typeof shownValue === 'string' ? shownValue : null;
  const cssVar = previewDesignTokenCssVar(token.path);
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
  const commitLabel = (next: string) => {
    session.executeDesign({
      type: 'setToken',
      path: token.path,
      token: withTokenLabel(snap.design.tokens, token.path, next),
    });
  };
  return (
    <tr className="token-table-row" data-token-path={token.path}>
      <th scope="row">
        <div className="token-table-name">
          <input
            className="token-table-label-input"
            aria-label={`Label for ${cssVar}`}
            defaultValue={displayLabel}
            onBlur={(event) => commitLabel(event.currentTarget.value)}
          />
          <span className="token-path-id">{cssVar}</span>
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
              label=""
              value={text}
              colorTokens={colorTokens.filter((ref) => ref !== `{${token.path}}`)}
              onCommit={commitTokenValue}
            />
          ) : token.type === 'shadow' ? (
            <DesignShadowEditor
              namePrefix={`token-${token.path}`}
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
              label={tokenLeafLabel(token.path)}
              value={shownValue as DesignTypographyValue}
              storedValue={
                (writingId ? token.override : token.value) as DesignTypographyValue | undefined
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
              label=""
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

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
