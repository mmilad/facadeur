import { readTokenTree, tokenReferenceValue, tokenReferencesByType } from '@facadeur/core';
import { TransformableField, TextField } from '@facadeur/form';
import type { EditorSnapshot } from '../../../domain/session';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';
import { formatTokenValue } from '../../../domain/edits/token-edit';
import type { viewportEditContext } from '../../../domain/viewport/viewport-edit';
import { TextControl } from '../../controls/fields/index';
import { TokenValueControl } from '../../controls/fields/TokenValueControl';
import type { TypographyCatalogs } from '../../controls/typography/index';
import { DesignShadowEditor, type DesignShadowInput } from '../DesignShadowEditor';
import { DesignTypographyEditor, type DesignTypographyValue } from '../DesignTypographyEditor';
import { IconButton } from '../../components/IconButton';
import { RemoveTokenButton } from './TokenCrud';
import {
  commitRawToken,
  commitToken,
  resetTokenBreakpoint,
  type TableToken,
} from './token-breakpoint-helpers';
import { TokenPreview } from './token-table-preview';
import { ComboField } from '../../combofield/ComboField';
import { tokenLeafLabel } from '../../controls/fields/token-presentation';
import { withTokenMetadata, withTokenLabel } from '../../../domain/edits/token-edit';
import { DESIGN_TOKEN_CSS_PREFIX, previewDesignTokenCssVar } from '@facadeur/style-engine';
import type { TableRowData } from '../../settings/Table';
import {
  colorTransformOptions,
  dimensionTransformOptions,
} from '../../settings/config/token-transform-options';
type ViewportContext = ReturnType<typeof viewportEditContext>;

export function createTokenTableRow({
  onEvent,
  snap,
  token,
  writingId,
  ctx,
  colorTokens,
  shadowTokens,
  typographyCatalogs,
  showType,
  expanded = false,
  onToggle,
  resolvePreview,
  labelFor,
  searchValue,
  transformDraft,
  onTransform,
  onTransformValue,
}: {
  onEvent: (event: EditorEvent) => void;
  snap: EditorSnapshot;
  token: TableToken;
  writingId: string | null;
  ctx: ViewportContext;
  colorTokens: readonly string[];
  shadowTokens: readonly string[];
  typographyCatalogs: TypographyCatalogs;
  showType: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  resolvePreview: (reference: string) => string | undefined;
  labelFor: (reference: string) => string;
  searchValue: (reference: string) => string | undefined;
  transformDraft?: { base: string; value: string };
  onTransform: (type: 'text' | 'color' | 'prop' | 'token' | 'icon') => void;
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
  const shadowDimensionFieldOptions =
    token.type === 'shadow'
      ? dimensionTransformOptions(
          typographyCatalogs.dimensionTokens,
          labelFor,
          searchValue,
          resolvePreview,
        )
      : undefined;
  const shadowColorFieldOptions =
    token.type === 'shadow'
      ? colorTransformOptions(colorTokens, labelFor, searchValue, resolvePreview)
      : undefined;
  const commitTokenValue = (next: string | null) => {
    if (next === text) return;
    if (writingId && (next === null || next.trim() === '')) {
      if (token.override !== undefined)
        resetTokenBreakpoint(onEvent, snap, token.family, token.uuid, writingId);
      return;
    }
    commitToken(onEvent, snap, token.family, token.uuid, shownValue, next ?? '', writingId);
  };
  const commitLabel = (next: string) => {
    if (next.trim() === displayLabel) return;
    onEvent({
      type: EditorEventType.DesignCommandExecute,
      data: {
        command: {
          type: 'setToken',
          family: token.family,
          token: withTokenLabel(snap.design.tokens, token.family, token.uuid, next),
        },
      },
    });
  };
  const pathParts = token.path.split('.');
  const tokenPathSuffix = pathParts.slice(1).join('-');
  const commitPath = (next: string) => {
    const suffix = next.trim().toLowerCase();
    if (!suffix || suffix === tokenPathSuffix) return;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suffix)) {
      onEvent({
        type: EditorEventType.NoticeSet,
        data: {
          text: 'Token name must use lowercase letters and numbers separated by hyphens',
          tone: 'error',
        },
      });
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
      onEvent({
        type: EditorEventType.DesignCommandExecute,
        data: {
          command: {
            type: 'setToken',
            family: token.family,
            token: withTokenMetadata(snap.design.tokens, token.family, token.uuid, {
              label: nextLabel,
              group: nextGroup,
            }),
          },
        },
      });
    } catch (error) {
      onEvent({
        type: EditorEventType.NoticeSet,
        data: {
          text: error instanceof Error ? error.message : 'Could not rename token',
          tone: 'error',
        },
      });
    }
  };
  const typographyEditor =
    token.type === 'typography' ? (
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
        typographyTokens={tokenReferencesByType(snap.design.tokens, 'typography').filter(
          (candidate) => candidate !== ref,
        )}
        showDisclosure={false}
        onCommit={(next) =>
          commitRawToken(onEvent, snap, token.family, token.uuid, next, writingId)
        }
        onReset={
          writingId && token.override !== undefined
            ? () => resetTokenBreakpoint(onEvent, snap, token.family, token.uuid, writingId)
            : undefined
        }
      />
    ) : null;
  const details = typographyEditor ? (
    <div className="token-typography-details">
      <section className="token-typography-detail-section">
        <h3>Token metadata</h3>
        <TextField
          id={`token-label-${token.uuid}`}
          name={`token-label-${token.uuid}`}
          label="Label"
          key={token.label ?? ''}
          value={displayLabel}
          onChange={() => undefined}
          onCommit={commitLabel}
        />
        <div className="token-path-editor">
          <span aria-hidden="true">
            --{DESIGN_TOKEN_CSS_PREFIX}-{pathParts[0]}-
          </span>
          <TextField
            id={`token-path-${token.uuid}`}
            name={`token-path-${token.uuid}`}
            label="CSS variable name"
            className="token-path-input"
            value={tokenPathSuffix}
            onChange={() => undefined}
            onCommit={commitPath}
          />
        </div>
      </section>
      <section className="token-typography-detail-section">
        <h3>Typography style</h3>
        {typographyEditor}
      </section>
    </div>
  ) : undefined;
  const nameCell = typographyEditor ? (
    <div className="token-table-name token-table-typography-name">
      <strong>{displayLabel}</strong>
    </div>
  ) : (
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
          --{DESIGN_TOKEN_CSS_PREFIX}-{pathParts[0]}-
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
    </div>
  );
  return {
    id: token.uuid,
    className: 'token-table-row',
    dataAttributes: { 'data-token-path': token.path },
    details,
    detailsClassName: details ? 'token-typography-detail-row' : undefined,
    expanded: details ? expanded : undefined,
    toggleName: details ? `token-details-${token.uuid}` : undefined,
    onToggle: details ? onToggle : undefined,
    cells: [
      nameCell,
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
            dimensionFieldOptions={shadowDimensionFieldOptions}
            colorFieldOptions={shadowColorFieldOptions}
            onCommit={(next) =>
              commitRawToken(onEvent, snap, token.family, token.uuid, next, writingId)
            }
            onReset={
              writingId && token.override !== undefined
                ? () => resetTokenBreakpoint(onEvent, snap, token.family, token.uuid, writingId)
                : undefined
            }
          />
        ) : token.type === 'typography' ? (
          <span className="token-table-typography-summary">
            {typographySummary(shownValue, labelFor)}
          </span>
        ) : token.type === 'dimension' ? (
          <ComboField
            className="design-spacing-field"
            fields={[
              {
                key: 'spacing',
                label: 'Spacing value',
                htmlFor: `token-${token.uuid}`,
                control: (
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
                ),
              },
            ]}
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
                  resetTokenBreakpoint(onEvent, snap, token.family, token.uuid, writingId);
                return;
              }
              commitToken(onEvent, snap, token.family, token.uuid, shownValue, next, writingId);
            }}
          />
        )}
      </div>,
      <div className="token-table-actions">
        {ctx.overrideViewport && token.override !== undefined ? (
          <IconButton
            className="token-override-reset"
            label={`Reset override at ${ctx.overrideViewport.minWidth}px`}
            name={`reset-token-override-${token.uuid}`}
            onClick={() =>
              resetTokenBreakpoint(
                onEvent,
                snap,
                token.family,
                token.uuid,
                ctx.overrideViewport?.uuid ?? '',
              )
            }
          >
            <ResetOverrideIcon />
          </IconButton>
        ) : null}
        {token.family !== 'font' ? (
          <RemoveTokenButton
            family={token.family}
            uuid={token.uuid}
            label={displayLabel}
            onEvent={onEvent}
          />
        ) : null}
      </div>,
    ],
  };
}

function typographySummary(value: unknown, labelFor: (reference: string) => string): string {
  if (typeof value === 'string') return labelFor(value) || value;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return JSON.stringify(value) ?? '';
  }
  const record = value as Record<string, unknown>;
  const display = (item: unknown) => {
    if (typeof item === 'string' && /^\{[^{}]+\}$/.test(item)) return labelFor(item);
    return Array.isArray(item) ? item.join(', ') : String(item ?? '');
  };
  return [record.fontSize, record.fontWeight, record.fontFamily]
    .filter((item) => item !== undefined)
    .map(display)
    .join(' · ');
}

function ResetOverrideIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3 6a5 5 0 1 1-.2 3M3 3v3h3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
