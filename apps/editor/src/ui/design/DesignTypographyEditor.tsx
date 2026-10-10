import { useEffect, useMemo, useState } from 'react';
import { TransformableField, type TransformableFieldOption } from '@facadeur/form';
import {
  useTokenResolver,
  useTokenSearchValue,
  useTokenValueLabel,
} from '../controls/fields/TokenPreviewContext';
import {
  formatTypographyFieldValue,
  parseTypographyFieldValue,
  TYPOGRAPHY_VALUE_KEYS,
  type TypographyCatalogs,
  type TypographyValue,
} from '../controls/typography/index';
import { Field, Inline } from '../form/index';
import { ComboField, type ComboFieldItem } from '../combofield/ComboField';
import { tokenTransformOptions } from '../settings/config/token-transform-options';

export type DesignTypographyValue = TypographyValue | string;
export type DesignTypographyField = Exclude<(typeof TYPOGRAPHY_VALUE_KEYS)[number], 'fontFamily'>;
const DESIGN_TYPOGRAPHY_FIELDS = TYPOGRAPHY_VALUE_KEYS.filter(
  (key): key is DesignTypographyField => key !== 'fontFamily',
);

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
  onCommit: (next: DesignTypographyValue | null) => void;
  /** Reset the complete breakpoint override, if the host owns that action. */
  onReset?: () => void;
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

function fieldOptionsForKey(
  key: DesignTypographyField,
  catalogs: TypographyCatalogs,
  current: string,
  labelFor: (reference: string) => string,
  searchValue: (reference: string) => string | undefined,
  resolve: (reference: string) => string | undefined,
): readonly TransformableFieldOption[] {
  const references =
    key === 'fontWeight'
      ? catalogs.fontWeightTokens
      : key === 'lineHeight'
        ? [...catalogs.dimensionTokens, ...catalogs.numberTokens]
        : catalogs.dimensionTokens;
  const tokens =
    REFERENCE.test(current.trim()) && !references.includes(current.trim())
      ? [current.trim(), ...references]
      : references;
  const weightOptions =
    key === 'fontWeight' && catalogs.fontWeights?.length
      ? [
          {
            type: 'token' as const,
            label: 'Font weights',
            items: catalogs.fontWeights.map((weight) => ({
              value: weight,
              label: weight,
              group: 'Font weights',
            })),
          },
        ]
      : [];

  return [
    { type: 'text', label: key === 'fontWeight' ? 'Weight' : 'Dimension' },
    ...weightOptions,
    ...tokenTransformOptions(tokens, labelFor, searchValue, resolve, 'Typography'),
  ];
}

function fieldLabel(key: DesignTypographyField): string {
  switch (key) {
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
  const labelFor = useTokenValueLabel();
  const searchValue = useTokenSearchValue();
  const [error, setError] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState(() =>
    typeof props.value === 'string' ? props.value : '',
  );
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({});
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
    const size = summaryValue(effective.fontSize, labelFor) || 'Inherited size';
    return size;
  }, [effective.fontSize, labelFor, props.value]);

  useEffect(() => {
    setAliasDraft(typeof props.value === 'string' ? props.value : '');
  }, [props.value]);
  useEffect(() => setFieldDrafts({}), [props.value, props.storedValue]);

  const previewValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.map((item) => previewValue(item)).join(', ');
    const text = previewText(value);
    return text.startsWith('{') ? (resolvePreview(text) ?? text) : text;
  };

  if (typeof props.value === 'string') {
    const tokens = props.typographyTokens ?? [];
    const aliasTokens =
      REFERENCE.test(props.value.trim()) && !tokens.includes(props.value.trim())
        ? [props.value.trim(), ...tokens]
        : tokens;
    return (
      <ComboField
        fields={[
          {
            key: 'typography-alias',
            label: props.label ?? 'Typography',
            htmlFor: props.namePrefix,
            control: (
              <TransformableField
                id={props.namePrefix}
                name={props.namePrefix}
                label={props.label ?? 'Typography'}
                value={aliasDraft}
                fieldOptions={[
                  { type: 'text', label: 'Text' },
                  ...tokenTransformOptions(
                    aliasTokens,
                    labelFor,
                    searchValue,
                    resolvePreview,
                    'Typography',
                  ),
                ]}
                onChange={setAliasDraft}
                onTransform={() => setAliasDraft('')}
                onCommit={(next) => props.onCommit(next.trim() || null)}
              />
            ),
          },
        ]}
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
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid typography value');
      return false;
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
      <ComboField
        fields={
          [
            ...(error
              ? [
                  {
                    key: 'error',
                    content: (
                      <p className="eu-field__error" role="alert">
                        {error}
                      </p>
                    ),
                  },
                ]
              : []),
            ...(props.onReset && breakpoint
              ? [
                  {
                    key: 'reset-all',
                    content: (
                      <button type="button" className="text-button" onClick={props.onReset}>
                        Reset all fields
                      </button>
                    ),
                  },
                ]
              : []),
            ...DESIGN_TYPOGRAPHY_FIELDS.map((key) => {
              const shown = effective[key];
              const local = stored[key];
              const inherited = breakpoint && local === undefined;
              const name = `${props.namePrefix}-${key}`;
              const value = fieldDrafts[key] ?? formatTypographyFieldValue(shown);
              return {
                key,
                label: fieldLabel(key),
                htmlFor: name,
                control: (
                  <TransformableField
                    id={name}
                    name={name}
                    label={fieldLabel(key)}
                    value={value}
                    fieldOptions={fieldOptionsForKey(
                      key,
                      catalogs,
                      value,
                      labelFor,
                      searchValue,
                      resolvePreview,
                    )}
                    placeholder={key === 'fontWeight' ? '400' : 'Inherited'}
                    onTransform={() => {
                      setError(null);
                      setFieldDrafts((drafts) => ({ ...drafts, [key]: '' }));
                    }}
                    onChange={(next) => setFieldDrafts((drafts) => ({ ...drafts, [key]: next }))}
                    onCommit={(next) => {
                      if (commitField(key, next)) {
                        setFieldDrafts((drafts) => {
                          const updated = { ...drafts };
                          delete updated[key];
                          return updated;
                        });
                      }
                    }}
                  />
                ),
                hint: inherited ? <span className="meta">Inherited</span> : undefined,
                action:
                  breakpoint && local !== undefined ? (
                    <button
                      type="button"
                      className="text-button"
                      name={`${props.namePrefix}-${key}-reset`}
                      onClick={() => {
                        if (commitField(key, null)) {
                          setFieldDrafts((drafts) => {
                            const updated = { ...drafts };
                            delete updated[key];
                            return updated;
                          });
                        }
                      }}
                    >
                      Reset field
                    </button>
                  ) : undefined,
              };
            }),
          ] satisfies readonly ComboFieldItem[]
        }
      >
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
      </ComboField>
    </details>
  );
}

function summaryValue(value: unknown, labelFor: (reference: string) => string): string {
  const display = (item: unknown) => {
    const text = previewText(item);
    return /^\{[^{}]+\}$/.test(text) ? labelFor(text) : text;
  };
  return Array.isArray(value) ? value.map(display).join(', ') : display(value);
}
