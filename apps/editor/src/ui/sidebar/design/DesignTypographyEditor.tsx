import { useMemo, useState } from 'react';
import { TokenValueControl } from '../../controls/fields/TokenValueControl.js';
import { useTokenResolver } from '../../controls/fields/TokenPreviewContext.js';
import {
  formatTypographyFieldValue,
  parseTypographyFieldValue,
  TYPOGRAPHY_VALUE_KEYS,
  type TypographyCatalogs,
  type TypographyValue,
} from '../../controls/typography/index.js';
import { Field, Inline, Stack } from '../../form/index.js';

export type DesignTypographyValue = TypographyValue | string;
export type DesignTypographyField = (typeof TYPOGRAPHY_VALUE_KEYS)[number];

export interface DesignTypographyEditorProps {
  namePrefix: string;
  label?: string;
  /** The effective value shown in the selected viewport. Raw references remain strings. */
  value: DesignTypographyValue;
  /** The value stored at the current edit target (a sparse override when applicable). */
  storedValue?: DesignTypographyValue;
  /** The base value used to identify inherited fields in a breakpoint override. */
  baseValue?: DesignTypographyValue;
  /** A non-null id (or true) means commits target a breakpoint override. */
  breakpointId?: string | null;
  isOverride?: boolean;
  catalogs: TypographyCatalogs;
  /** Typography references used when the whole token is an alias. */
  typographyTokens?: readonly string[];
  /**
   * Larger breakpoints whose font size can be declared beside the base style.
   * `stored` is the sparse override for that breakpoint.
   */
  mediaQueries?: readonly TypographyMediaQuery[];
  onCommitMediaQuery?: (breakpointId: string, next: DesignTypographyValue | null) => void;
  onCommit: (next: DesignTypographyValue | null) => void;
  /** Reset the complete breakpoint override, if the host owns that action. */
  onReset?: () => void;
}

export interface TypographyMediaQuery {
  id: string;
  label: string;
  stored?: unknown;
}

function isTypographyObject(value: unknown): value is TypographyValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBreakpoint(props: DesignTypographyEditorProps): boolean {
  return props.isOverride ?? (props.breakpointId !== undefined && props.breakpointId !== null);
}

function equalValue(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length && left.every((value, index) => equalValue(value, right[index]))
    );
  }
  return left === right;
}

/**
 * Apply one field while retaining the exact raw aliases in the other fields.
 * Breakpoint values stay sparse: a value equal to the base is removed from the override.
 */
export function editTypographyField(
  current: TypographyValue,
  key: DesignTypographyField,
  nextText: string | null,
  options: { breakpoint: boolean; base?: TypographyValue },
): TypographyValue | null {
  const next: TypographyValue = { ...current };
  const parsed = nextText?.trim() ? parseTypographyFieldValue(key, nextText) : undefined;
  if (options.breakpoint && equalValue(parsed, options.base?.[key])) delete next[key];
  else if (parsed === undefined) delete next[key];
  else {
    switch (key) {
      case 'fontFamily':
        next.fontFamily = parsed as TypographyValue['fontFamily'];
        break;
      case 'fontSize':
        next.fontSize = String(parsed);
        break;
      case 'fontWeight':
        next.fontWeight = parsed as TypographyValue['fontWeight'];
        break;
      case 'lineHeight':
        next.lineHeight = parsed as TypographyValue['lineHeight'];
        break;
      case 'letterSpacing':
        next.letterSpacing = String(parsed);
        break;
    }
  }
  return Object.keys(next).length ? next : null;
}

function tokenOptionsForKey(
  key: DesignTypographyField,
  catalogs: TypographyCatalogs,
): readonly string[] {
  if (key === 'fontFamily') return [...catalogs.fontRefs, ...catalogs.fontFamilyTokens];
  if (key === 'fontWeight') return [...(catalogs.fontWeights ?? []), ...catalogs.fontWeightTokens];
  if (key === 'lineHeight') return [...catalogs.dimensionTokens, ...catalogs.numberTokens];
  return catalogs.dimensionTokens;
}

function fieldLabel(key: DesignTypographyField): string {
  switch (key) {
    case 'fontFamily':
      return 'Family';
    case 'fontSize':
      return 'Size';
    case 'fontWeight':
      return 'Weight';
    case 'lineHeight':
      return 'Line height';
    default:
      return 'Letter spacing';
  }
}

const CSS_LENGTH =
  /^-?(?:(?:\d+(?:\.\d+)?)|(?:\.\d+))(?:px|rem|em|ex|ch|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|cm|mm|q|in|pt|pc|%)$/i;
const CSS_FUNCTION = /^(?:calc|clamp|min|max|var|env)\([\s\S]+\)$/i;
const REFERENCE = /^\{[^{}]+\}$/;

function supportsCss(property: string, value: string): boolean | undefined {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return undefined;
  return CSS.supports(property, value);
}

function validateCssDimension(property: string, value: string, allowNormal = false): void {
  if (allowNormal && value.trim().toLowerCase() === 'normal') return;
  const supported = supportsCss(property, value);
  if (
    supported === true ||
    (supported === undefined &&
      (CSS_LENGTH.test(value) || CSS_FUNCTION.test(value) || value === '0' || value === '-0'))
  ) {
    return;
  }
  throw new Error(`${property} must be a valid CSS length or expression.`);
}

function validateTypographyField(key: DesignTypographyField, value: unknown): void {
  if (typeof value === 'string' && REFERENCE.test(value.trim())) return;
  if (key === 'fontFamily') {
    if (
      (typeof value !== 'string' && !Array.isArray(value)) ||
      (Array.isArray(value) && value.length === 0)
    ) {
      throw new Error('Family must contain at least one name.');
    }
    return;
  }
  if (key === 'fontWeight') {
    if (!(
      (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1000) ||
      (typeof value === 'string' && ['normal', 'bold', 'lighter', 'bolder'].includes(value))
    )) {
      throw new Error('Weight must be an integer from 1 to 1000 or a CSS keyword.');
    }
    return;
  }
  if (key === 'lineHeight' && typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Line height must be a finite number.');
    return;
  }
  if (typeof value !== 'string') throw new Error(`${fieldLabel(key)} must be a CSS value.`);
  validateCssDimension(
    key === 'fontSize' ? 'font-size' : key === 'lineHeight' ? 'line-height' : 'letter-spacing',
    value,
    key === 'lineHeight' || key === 'letterSpacing',
  );
}

function previewText(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  return value === undefined ? '' : String(value);
}

export function DesignTypographyEditor(props: DesignTypographyEditorProps) {
  const { catalogs } = props;
  const resolvePreview = useTokenResolver();
  const [error, setError] = useState<string | null>(null);
  const breakpoint = isBreakpoint(props);
  const base = isTypographyObject(props.baseValue)
    ? props.baseValue
    : isTypographyObject(props.value)
      ? props.value
      : {};
  const effective = isTypographyObject(props.value) ? props.value : {};
  const stored = isTypographyObject(props.storedValue)
    ? props.storedValue
    : breakpoint
      ? {}
      : effective;
  const summary = useMemo(() => {
    if (typeof props.value === 'string') return props.value;
    const size = previewText(effective.fontSize) || 'Inherited size';
    const family = previewText(effective.fontFamily) || 'Inherited family';
    const queries = (props.mediaQueries ?? [])
      .map((query) => {
        const stored = isTypographyObject(query.stored) ? query.stored : undefined;
        const querySize = previewText(stored?.fontSize);
        return querySize ? `${query.id} ${querySize}` : '';
      })
      .filter((note) => note.length > 0);
    return [size, family, ...queries].join(' · ');
  }, [effective.fontFamily, effective.fontSize, props.mediaQueries, props.value]);

  const previewValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.map((item) => previewValue(item)).join(', ');
    const text = previewText(value);
    return text.startsWith('{') ? (resolvePreview(text) ?? text) : text;
  };

  if (typeof props.value === 'string') {
    return (
      <TokenValueControl
        name={props.namePrefix}
        label={props.label ?? 'Typography'}
        value={props.value}
        tokens={props.typographyTokens ?? []}
        onCommit={props.onCommit}
      />
    );
  }

  const commitField = (key: DesignTypographyField, text: string | null) => {
    try {
      if (!breakpoint && text === null && key !== 'letterSpacing') {
        throw new Error(`${fieldLabel(key)} is required for a base typography token.`);
      }
      const parsed = text?.trim() ? parseTypographyFieldValue(key, text) : undefined;
      if (parsed !== undefined) validateTypographyField(key, parsed);
      props.onCommit(editTypographyField(stored, key, text, { breakpoint, base }));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid typography value');
    }
  };

  const commitMediaQuerySize = (query: TypographyMediaQuery, text: string | null) => {
    try {
      const current = isTypographyObject(query.stored) ? query.stored : {};
      const parsed = text?.trim() ? parseTypographyFieldValue('fontSize', text) : undefined;
      if (parsed !== undefined) validateTypographyField('fontSize', parsed);
      props.onCommitMediaQuery?.(
        query.id,
        editTypographyField(current, 'fontSize', text, { breakpoint: true, base }),
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid typography value');
    }
  };

  return (
    <details className="design-token-editor design-typography-editor">
      <summary>
        <Inline gap={8}>
          <strong>{props.label ?? 'Typography'}</strong>
          <span className="meta">{summary}</span>
        </Inline>
      </summary>
      <Stack gap={8}>
        {error ? (
          <p className="eu-field__error" role="alert">
            {error}
          </p>
        ) : null}
        {props.onReset && breakpoint ? (
          <button type="button" className="text-button" onClick={props.onReset}>
            Reset all fields
          </button>
        ) : null}
        {TYPOGRAPHY_VALUE_KEYS.map((key) => {
          const shown = effective[key];
          const local = stored[key];
          const inherited = breakpoint && local === undefined;
          return (
            <div key={key} className="design-token-field">
              <TokenValueControl
                name={`${props.namePrefix}-${key}`}
                label={fieldLabel(key)}
                value={formatTypographyFieldValue(shown)}
                tokens={tokenOptionsForKey(key, catalogs)}
                placeholder={
                  key === 'fontFamily'
                    ? 'Inter, sans-serif'
                    : key === 'fontWeight'
                      ? (catalogs.fontWeights ?? []).join(', ') || '400'
                      : 'Inherited'
                }
                onCommit={(next) => commitField(key, next)}
              />
              {inherited ? <span className="meta">Inherited</span> : null}
              {breakpoint && local !== undefined ? (
                <button
                  type="button"
                  className="text-button"
                  name={`${props.namePrefix}-${key}-reset`}
                  onClick={() => commitField(key, null)}
                >
                  Reset field
                </button>
              ) : null}
            </div>
          );
        })}
        {props.mediaQueries?.length && props.onCommitMediaQuery ? (
          <fieldset className="design-typography-media">
            <legend>Media queries</legend>
            {props.mediaQueries.map((query) => {
              const queryStored = isTypographyObject(query.stored) ? query.stored : undefined;
              const querySize = formatTypographyFieldValue(queryStored?.fontSize);
              const baseSize = formatTypographyFieldValue(base.fontSize);
              return (
                <TokenValueControl
                  key={query.id}
                  name={`${props.namePrefix}-media-${query.id}-fontSize`}
                  label={query.label}
                  value={querySize}
                  tokens={catalogs.dimensionTokens}
                  placeholder={baseSize ? `Inherited · ${baseSize}` : 'Inherited'}
                  onCommit={(next) => commitMediaQuerySize(query, next)}
                />
              );
            })}
          </fieldset>
        ) : null}
        <Field label="Sample">
          <div
            className="design-typography-sample"
            style={{
              fontFamily: previewValue(effective.fontFamily) || undefined,
              fontSize: previewValue(effective.fontSize) || undefined,
              fontWeight:
                typeof effective.fontWeight === 'number'
                  ? effective.fontWeight
                  : previewValue(effective.fontWeight) || undefined,
              lineHeight: previewValue(effective.lineHeight) || undefined,
              letterSpacing: previewValue(effective.letterSpacing) || undefined,
            }}
          >
            Aa — The quick brown fox
          </div>
        </Field>
      </Stack>
    </details>
  );
}
