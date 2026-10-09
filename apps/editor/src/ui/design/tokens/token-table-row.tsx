import { readTokenTree, tokenReferenceValue, type DesignTokenValue } from '@facadeur/core';
import { TransformableField, TextField } from '@facadeur/form';
import { typographyTokenRefs } from '../../../domain/editing';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import { formatTokenValue } from '../../../domain/edits/token-edit';
import type { viewportEditContext } from '../../../domain/viewport/viewport-edit';
import { TextControl } from '../../controls/fields/index';
import { TokenValueControl } from '../../controls/fields/TokenValueControl';
import type { TypographyCatalogs } from '../../controls/typography/index';
import { DesignShadowEditor, type DesignShadowInput } from '../DesignShadowEditor';
import { DesignTypographyEditor, type DesignTypographyValue } from '../DesignTypographyEditor';
import { OverrideCue } from '../../sidebar/properties/ViewportEditBar';
import { RemoveTokenButton } from './TokenCrud';
import {
  commitRawToken,
  commitToken,
  resetTokenBreakpoint,
  type TableToken,
} from './token-breakpoint-helpers';
import { tokenLeafLabel } from './token-labels';
import { withTokenMetadata, withTokenLabel } from '../../../domain/edits/token-edit';
import {
  previewDesignTokenCssVar,
  PROJECT_TOKEN_CSS_PREFIX,
} from '../../../domain/component-tokens';
import type { TableRowData } from '../../settings/Table';
import {
  colorTransformOptions,
  dimensionTransformOptions,
} from '../../settings/config/token-transform-options';
type ViewportContext = ReturnType<typeof viewportEditContext>;

export function createTokenTableRow({
  session,
  snap,
  token,
  writingId,
  ctx,
  colorTokens,
  shadowTokens,
  typographyCatalogs,
  showType,
  resolvePreview,
  labelFor,
  searchValue,
  transformDraft,
  onTransform,
  onTransformValue,
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
  resolvePreview: (reference: string) => string | undefined;
  labelFor: (reference: string) => string;
  searchValue: (reference: string) => string | undefined;
  transformDraft?: { base: string; value: string };
  onTransform: (type: 'text' | 'color' | 'prop' | 'token') => void;
  onTransformValue: (next: string) => void;
}): TableRowData {
  const shownValue = token.effectiveValue;
  const text = formatTokenValue(shownValue);
  const displayLabel = token.label ?? tokenLeafLabel(token.path);
  const colorString = token.type === 'color' && typeof shownValue === 'string' ? shownValue : null;
  const shadowString =
    token.type === 'shadow' && typeof shownValue === 'string' ? shownValue : null;
  const ref = tokenReferenceValue(token.uuid);
  const cssVar = previewDesignTokenCssVar(token.path);
  const scalarTokens = scalarTokenRefs(token.type, colorTokens, typographyCatalogs).filter(
    (option) => option !== ref,
  );
  const resolvedPreview = typeof shownValue === 'string' ? resolvePreview(shownValue) : undefined;
  const fieldOptions =
    token.type === 'color'
      ? colorTransformOptions(colorTokens, labelFor, searchValue, resolvePreview)
      : [];
  const dimensionFieldOptions =
    token.type === 'dimension'
      ? dimensionTransformOptions(scalarTokens, labelFor, searchValue, resolvePreview)
      : [];
  const commitTokenValue = (next: string | null) => {
    if (next === text) return;
    if (writingId && (next === null || next.trim() === '')) {
      if (token.override !== undefined)
        resetTokenBreakpoint(session, snap, token.family, token.uuid, writingId);
      return;
    }
    commitToken(session, snap, token.family, token.uuid, shownValue, next ?? '', writingId);
  };
  const commitLabel = (next: string) => {
    if (next.trim() === displayLabel) return;
    session.executeDesign({
      type: 'setToken',
      family: token.family,
      token: withTokenLabel(snap.design.tokens, token.family, token.uuid, next),
    });
  };
  const pathParts = token.path.split('.');
  const tokenPathSuffix = pathParts.slice(1).join('-');
  const commitPath = (next: string) => {
    const suffix = next.trim().toLowerCase();
    if (!suffix || suffix === tokenPathSuffix) return;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suffix)) {
      session.setNotice(
        'Token name must use lowercase letters and numbers separated by hyphens',
        'error',
      );
      return;
    }
    const segments = suffix.split('-');
    const nextLabel = (segments.pop() ?? '').replace(/\b\w/g, (letter) => letter.toUpperCase());
    const nextGroup = segments.join('.');
    const nextPath = [token.family, nextGroup, nextLabel].filter(Boolean).join('.');
    try {
      const indexed = readTokenTree(snap.design.tokens);
      const duplicate = [...indexed.tokens.values()].find(
        (item) => item.path === nextPath && item.uuid !== token.uuid,
      );
      if (duplicate || indexed.groups.has(nextPath)) {
        throw new Error(`Token path "${nextPath}" already exists`);
      }
      session.executeDesign({
        type: 'setToken',
        family: token.family,
        token: withTokenMetadata(snap.design.tokens, token.family, token.uuid, {
          label: nextLabel,
          group: nextGroup,
        }),
      });
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Could not rename token', 'error');
    }
  };
  return {
    id: token.uuid,
    className: 'token-table-row',
    dataAttributes: { 'data-token-path': token.path },
    cells: [
      <div className="token-table-name">
        <TextField
          id={`token-label-${token.uuid}`}
          name={`token-label-${token.uuid}`}
          label={`Label for ${cssVar}`}
          key={token.label ?? ''}
          className="token-table-label-input"
          value={displayLabel}
          onChange={() => undefined}
          onCommit={commitLabel}
        />
        <div className="token-path-editor">
          <span aria-hidden="true">
            --{PROJECT_TOKEN_CSS_PREFIX}-{pathParts[0]}-
          </span>
          <TextField
            id={`token-path-${token.uuid}`}
            name={`token-path-${token.uuid}`}
            label={`CSS variable name for ${cssVar}`}
            className="token-path-input"
            value={tokenPathSuffix}
            onChange={() => undefined}
            onCommit={commitPath}
          />
        </div>
        {showType ? <span>{token.type}</span> : null}
      </div>,
      <TokenPreview
        value={shownValue}
        type={token.type}
        color={colorString}
        shadow={shadowString}
        resolved={resolvedPreview}
        resolve={resolvePreview}
      />,
      <div className="token-table-value">
        {colorString !== null ? (
          <TransformableField
            id={`token-${token.uuid}`}
            name={`token-${token.uuid}`}
            label="Color value"
            value={transformDraft?.base === text ? transformDraft.value : text}
            fieldOptions={fieldOptions}
            onTransform={onTransform}
            onChange={(next) => {
              onTransformValue(next);
              commitTokenValue(next);
            }}
          />
        ) : token.type === 'shadow' ? (
          <DesignShadowEditor
            namePrefix={`token-${token.uuid}`}
            value={shownValue as DesignShadowInput}
            storedValue={
              (writingId ? (token.override ?? token.baseValue) : token.value) as DesignShadowInput
            }
            baseValue={token.baseValue as DesignShadowInput}
            breakpointId={writingId}
            isOverride={Boolean(writingId)}
            shadowTokens={shadowTokens.filter((candidate) => candidate !== ref)}
            dimensionTokens={typographyCatalogs.dimensionTokens}
            colorTokens={colorTokens}
            onCommit={(next) =>
              commitRawToken(session, snap, token.family, token.uuid, next, writingId)
            }
            onReset={
              writingId && token.override !== undefined
                ? () => resetTokenBreakpoint(session, snap, token.family, token.uuid, writingId)
                : undefined
            }
          />
        ) : token.type === 'typography' ? (
          <DesignTypographyEditor
            namePrefix={`token-${token.uuid}`}
            label={displayLabel}
            value={shownValue as DesignTypographyValue}
            storedValue={
              (writingId ? token.override : token.value) as DesignTypographyValue | undefined
            }
            baseValue={token.baseValue as DesignTypographyValue}
            breakpointId={writingId}
            isOverride={Boolean(writingId)}
            catalogs={typographyCatalogs}
            typographyTokens={typographyTokenRefs(snap.design.tokens).filter(
              (candidate) => candidate !== ref,
            )}
            onCommit={(next) =>
              commitRawToken(session, snap, token.family, token.uuid, next, writingId)
            }
            onReset={
              writingId && token.override !== undefined
                ? () => resetTokenBreakpoint(session, snap, token.family, token.uuid, writingId)
                : undefined
            }
          />
        ) : token.type === 'dimension' ? (
          <TransformableField
            id={`token-${token.uuid}`}
            name={`token-${token.uuid}`}
            label="Spacing value"
            value={transformDraft?.base === text ? transformDraft.value : text}
            fieldOptions={dimensionFieldOptions}
            onTransform={onTransform}
            onChange={(next) => {
              onTransformValue(next);
              commitTokenValue(next);
            }}
          />
        ) : scalarTokens.length && typeof shownValue === 'string' ? (
          <TokenValueControl
            name={`token-${token.uuid}`}
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
            name={`token-${token.uuid}`}
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
                  resetTokenBreakpoint(session, snap, token.family, token.uuid, writingId);
                return;
              }
              commitToken(session, snap, token.family, token.uuid, shownValue, next, writingId);
            }}
          />
        )}
      </div>,
      <div className="token-table-actions">
        {ctx.overrideViewport && token.override !== undefined ? (
          <OverrideCue
            minWidth={ctx.overrideViewport.minWidth}
            onReset={() =>
              resetTokenBreakpoint(
                session,
                snap,
                token.family,
                token.uuid,
                ctx.overrideViewport?.uuid ?? '',
              )
            }
          />
        ) : null}
        {token.family !== 'font' ? (
          <RemoveTokenButton
            session={session}
            snap={snap}
            family={token.family}
            uuid={token.uuid}
            label={displayLabel}
          />
        ) : null}
      </div>,
    ],
  };
}

function TokenPreview({
  value,
  type,
  color,
  shadow,
  resolved,
  resolve,
}: {
  value: DesignTokenValue;
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
    <div
      className={
        dimension ? 'token-table-preview token-table-preview--dimension' : 'token-table-preview'
      }
      title={previewText}
    >
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
  const match = value
    .trim()
    .match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(px|rem|em|ch|ex|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q|%)?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = match[2] ?? 'px';
  return { width: amount === 0 ? '2px' : `${Math.abs(amount)}${unit}` };
}

function shadowPreview(
  value: Readonly<Record<string, DesignTokenValue>>,
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

function isRecord(value: unknown): value is Readonly<Record<string, DesignTokenValue>> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
