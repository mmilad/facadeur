import { useEffect, useMemo, useState } from 'react';
import { TokenValueControl } from '../../controls/fields/TokenValueControl.js';
import { useTokenResolver, useTokenValueLabel } from '../../controls/fields/TokenPreviewContext.js';
import { Checkbox, Field, Inline, Stack, TextArea } from '../../form/index.js';

export interface DesignShadowValue {
  color: string;
  offsetX: string;
  offsetY: string;
  blur: string;
  spread?: string;
  inset?: boolean;
  [key: string]: unknown;
}

export type DesignShadowInput = DesignShadowValue | DesignShadowValue[] | string;
export type DesignShadowField = 'offsetX' | 'offsetY' | 'blur' | 'spread' | 'color' | 'inset';

export interface DesignShadowEditorProps {
  namePrefix: string;
  label?: string;
  /** Effective value. String aliases are kept in raw form and use the token picker. */
  value: DesignShadowInput;
  /** Raw value at the current edit target, when it differs from the effective value. */
  storedValue?: DesignShadowInput;
  /** Base value used for viewport editing and summary context. */
  baseValue?: DesignShadowInput;
  breakpointId?: string | null;
  isOverride?: boolean;
  shadowTokens: readonly string[];
  dimensionTokens?: readonly string[];
  colorTokens?: readonly string[];
  onCommit: (next: DesignShadowInput | null) => void;
  onReset?: () => void;
}

const SHADOW_FIELDS: readonly DesignShadowField[] = [
  'offsetX',
  'offsetY',
  'blur',
  'spread',
  'color',
  'inset',
];

function isBreakpoint(props: DesignShadowEditorProps): boolean {
  return props.isOverride ?? (props.breakpointId !== undefined && props.breakpointId !== null);
}

function isShadowObject(value: unknown): value is DesignShadowValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return (
    ['color', 'offsetX', 'offsetY', 'blur'].every((key) => key in value) &&
    Object.keys(value).every((key) => SHADOW_FIELDS.includes(key as DesignShadowField))
  );
}

function isSupported(value: DesignShadowInput): value is DesignShadowValue | DesignShadowValue[] {
  if (Array.isArray(value)) return value.length > 0 && value.every(isShadowObject);
  return (
    isShadowObject(value) &&
    Object.keys(value).every((key) => SHADOW_FIELDS.includes(key as DesignShadowField))
  );
}

function cloneShadow(value: DesignShadowValue): DesignShadowValue {
  return { ...value };
}

function displayField(value: unknown): string {
  return value === undefined ? '' : String(value);
}

/** Preserve the object/array shape while changing one supported property. */
export function editShadowField(
  current: DesignShadowValue | DesignShadowValue[],
  index: number,
  field: DesignShadowField,
  next: string | boolean | null,
): DesignShadowValue | DesignShadowValue[] {
  const list = Array.isArray(current) ? current.map(cloneShadow) : [cloneShadow(current)];
  const target = list[index] ?? list[0];
  if (!target) return current;
  if (field === 'inset') {
    if (next === true) target.inset = true;
    else if (target.inset === true) delete target.inset;
  } else if (next === null || next === '') {
    delete target[field];
  } else {
    target[field] = next as string;
  }
  return Array.isArray(current) ? list : list[0]!;
}

function valueSummary(value: DesignShadowInput, labelFor: (reference: string) => string): string {
  if (typeof value === 'string') return value;
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return 'Empty shadow';
  const display = (raw: unknown) => {
    const text = displayField(raw);
    return /^\{[^{}]+\}$/.test(text) ? labelFor(text) : text;
  };
  return `${display(first.offsetX)} ${display(first.offsetY)} ${display(first.blur)}${first.spread ? ` ${display(first.spread)}` : ''} · ${display(first.color)}`;
}

const CSS_LENGTH =
  /^-?(?:(?:\d+(?:\.\d+)?)|(?:\.\d+))(?:px|rem|em|ex|ch|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|cm|mm|q|in|pt|pc|%)$/i;
const CSS_FUNCTION = /^(?:calc|clamp|min|max|var|env)\([\s\S]+\)$/i;
const REFERENCE = /^\{[^{}]+\}$/;

function supportsCss(property: string, value: string): boolean | undefined {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return undefined;
  return CSS.supports(property, value);
}

function validateShadowField(field: DesignShadowField, value: string | boolean | null): void {
  if (field === 'inset') return;
  if (value === null) {
    if (field !== 'spread') throw new Error(`${field} is required for a shadow.`);
    return;
  }
  if (typeof value !== 'string') throw new Error(`${field} must be a text value.`);
  if (value.trim() === '') {
    if (field !== 'spread') throw new Error(`${field} is required for a shadow.`);
    return;
  }
  if (REFERENCE.test(value.trim())) return;
  if (field === 'color') {
    if (/[;{}]/.test(value)) throw new Error('Color must be a CSS color.');
    if (supportsCss('color', value) === false) throw new Error('Color must be a CSS color.');
    return;
  }
  const supported = supportsCss('width', value);
  if (
    supported !== true &&
    !(
      supported === undefined &&
      (CSS_LENGTH.test(value) || CSS_FUNCTION.test(value) || value === '0' || value === '-0')
    )
  ) {
    throw new Error(`${field} must be a valid CSS length or expression.`);
  }
}

function ShadowObjectEditor({
  value,
  namePrefix,
  shadowTokens: _shadowTokens,
  dimensionTokens,
  colorTokens,
  onCommit,
}: {
  value: DesignShadowValue | DesignShadowValue[];
  namePrefix: string;
  shadowTokens: readonly string[];
  dimensionTokens?: readonly string[];
  colorTokens?: readonly string[];
  onCommit: (next: DesignShadowValue | DesignShadowValue[]) => void;
}) {
  const list = Array.isArray(value) ? value : [value];
  const [error, setError] = useState<string | null>(null);
  const labels: Record<DesignShadowField, string> = {
    offsetX: 'X',
    offsetY: 'Y',
    blur: 'Blur',
    spread: 'Spread',
    color: 'Color',
    inset: 'Inset',
  };
  const commitField = (index: number, field: DesignShadowField, next: string | boolean | null) => {
    try {
      validateShadowField(field, next);
      onCommit(editShadowField(value, index, field, next));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid shadow value');
    }
  };
  return (
    <Stack gap={8}>
      {error ? (
        <p className="eu-field__error" role="alert">
          {error}
        </p>
      ) : null}
      {list.map((shadow, index) => (
        <fieldset key={index} className="design-shadow-layer">
          {list.length > 1 ? <legend>Layer {index + 1}</legend> : null}
          <Stack gap={8}>
            {SHADOW_FIELDS.map((field) => {
              if (field === 'inset') {
                return (
                  <Checkbox
                    key={field}
                    name={`${namePrefix}-${index}-${field}`}
                    label={labels[field]}
                    value={shadow.inset === true}
                    onCommit={(next) => commitField(index, field, next)}
                  />
                );
              }
              const current = displayField(shadow[field]);
              return (
                <TokenValueControl
                  key={field}
                  name={`${namePrefix}-${index}-${field}`}
                  label={labels[field]}
                  value={current}
                  tokens={field === 'color' ? (colorTokens ?? []) : (dimensionTokens ?? [])}
                  color={field === 'color'}
                  placeholder={field === 'color' ? '#00000080' : '0px'}
                  onCommit={(next) => commitField(index, field, next)}
                />
              );
            })}
          </Stack>
        </fieldset>
      ))}
    </Stack>
  );
}

export function DesignShadowEditor(props: DesignShadowEditorProps) {
  const breakpoint = isBreakpoint(props);
  const labelFor = useTokenValueLabel();
  const [advancedDraft, setAdvancedDraft] = useState(() =>
    typeof props.value === 'string' ? props.value : JSON.stringify(props.value, null, 2),
  );
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const supported = typeof props.value !== 'string' && isSupported(props.value);
  const summary = useMemo(() => valueSummary(props.value, labelFor), [labelFor, props.value]);
  const editableValue =
    typeof props.storedValue !== 'string' && props.storedValue && isSupported(props.storedValue)
      ? props.storedValue
      : supported
        ? props.value
        : null;
  const currentObject = editableValue;
  const resolvePreview = useTokenResolver();

  const previewShadowCss = (value: DesignShadowValue): string => {
    const resolve = (item: unknown) => {
      const text = displayField(item);
      return text.startsWith('{') ? (resolvePreview(text) ?? text) : text;
    };
    return `${value.inset ? 'inset ' : ''}${resolve(value.offsetX)} ${resolve(value.offsetY)} ${resolve(value.blur)}${value.spread ? ` ${resolve(value.spread)}` : ''} ${resolve(value.color)}`;
  };

  useEffect(() => {
    setAdvancedDraft(
      typeof props.value === 'string' ? props.value : JSON.stringify(props.value, null, 2),
    );
    setAdvancedError(null);
  }, [props.value]);

  if (typeof props.value === 'string') {
    return (
      <TokenValueControl
        name={props.namePrefix}
        label={props.label ?? 'Shadow'}
        value={props.value}
        tokens={props.shadowTokens}
        onCommit={props.onCommit}
        placeholder="0 8px 24px rgba(0,0,0,0.12)"
      />
    );
  }

  const commitStructured = (next: DesignShadowValue | DesignShadowValue[]) => {
    props.onCommit(next);
  };

  return (
    <details className="design-token-editor design-shadow-editor">
      <summary>
        <Inline gap={8}>
          <strong>{props.label ?? 'Shadow'}</strong>
          <span className="meta">{summary}</span>
          {currentObject && !Array.isArray(currentObject) ? (
            <span
              className="design-shadow-preview"
              aria-label="Shadow preview"
              style={{ boxShadow: previewShadowCss(currentObject as DesignShadowValue) }}
            />
          ) : null}
        </Inline>
      </summary>
      <Stack gap={8}>
        {props.onReset && breakpoint ? (
          <button type="button" className="text-button" onClick={props.onReset}>
            Reset override
          </button>
        ) : null}
        {supported ? (
          <ShadowObjectEditor
            value={editableValue as DesignShadowValue | DesignShadowValue[]}
            namePrefix={props.namePrefix}
            shadowTokens={props.shadowTokens}
            dimensionTokens={props.dimensionTokens}
            colorTokens={props.colorTokens}
            onCommit={commitStructured}
          />
        ) : null}
        {supported ? (
          <details className="design-shadow-advanced">
            <summary>Advanced JSON</summary>
            <Field label="Shadow JSON">
              <TextArea
                name={`${props.namePrefix}-advanced`}
                value={advancedDraft}
                rows={4}
                invalid={advancedError !== null}
                onChange={(next) => {
                  setAdvancedDraft(next);
                  setAdvancedError(null);
                }}
                onCommit={(next) => {
                  try {
                    const parsed = JSON.parse(next) as unknown;
                    if (isShadowJsonInput(parsed)) {
                      setAdvancedError(null);
                      props.onCommit(parsed as DesignShadowInput);
                    } else {
                      throw new Error('Use a shadow object or an array of shadow objects.');
                    }
                  } catch (error) {
                    setAdvancedError(
                      error instanceof Error ? error.message : 'Invalid shadow JSON',
                    );
                  }
                }}
              />
            </Field>
          </details>
        ) : (
          <Field label="Shadow JSON">
            <TextArea
              name={`${props.namePrefix}-advanced`}
              value={advancedDraft}
              rows={4}
              invalid={advancedError !== null}
              onChange={(next) => {
                setAdvancedDraft(next);
                setAdvancedError(null);
              }}
              onCommit={(next) => {
                try {
                  const parsed = JSON.parse(next) as unknown;
                  if (isShadowJsonInput(parsed)) {
                    setAdvancedError(null);
                    props.onCommit(parsed as DesignShadowInput);
                  } else {
                    throw new Error('Use a shadow object or an array of shadow objects.');
                  }
                } catch (error) {
                  setAdvancedError(error instanceof Error ? error.message : 'Invalid shadow JSON');
                }
              }}
            />
          </Field>
        )}
        {advancedError ? <p className="eu-field__error">{advancedError}</p> : null}
        {supported && !Array.isArray(props.value) ? (
          <p className="meta">Preview: {previewShadowCss(props.value)}</p>
        ) : null}
      </Stack>
    </details>
  );
}

function isShadowJsonInput(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === 'object' && value !== null;
}
