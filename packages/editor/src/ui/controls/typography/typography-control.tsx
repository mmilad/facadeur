import { useEffect, useState } from 'react';
import {
  Combobox,
  Field,
  NumberInput,
  SegmentedControl,
  Stack,
  TextInput,
} from '../../form/index.js';
import '../../form/form.css';
import { catalogTokenOptions } from '../token-options.js';
import {
  formatTypographyFieldValue,
  inferTypographyFieldMode,
  parseTypographyFieldValue,
  TYPOGRAPHY_VALUE_KEYS,
  type TypographyFieldMode,
  type TypographyValue,
} from './value.js';

function numberDraft(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function assignTypographyField(
  target: TypographyValue,
  key: (typeof TYPOGRAPHY_VALUE_KEYS)[number],
  parsed: string | number | string[] | undefined,
): void {
  if (parsed === undefined) return;
  switch (key) {
    case 'fontFamily':
      target.fontFamily = parsed as TypographyValue['fontFamily'];
      return;
    case 'fontSize':
      target.fontSize = String(parsed);
      return;
    case 'fontWeight':
      target.fontWeight = parsed as TypographyValue['fontWeight'];
      return;
    case 'lineHeight':
      target.lineHeight = parsed as TypographyValue['lineHeight'];
      return;
    case 'letterSpacing':
      target.letterSpacing = String(parsed);
      return;
    default:
      return;
  }
}

export interface TypographyCatalogs {
  fontRefs: readonly string[];
  fontFamilyTokens: readonly string[];
  fontWeightTokens: readonly string[];
  dimensionTokens: readonly string[];
  numberTokens: readonly string[];
}

function TokenOrCustomField({
  name,
  label,
  value,
  tokenOptions,
  customPlaceholder,
  useNumberCustom,
  onCommit,
}: {
  name: string;
  label: string;
  value: string;
  tokenOptions: readonly string[];
  customPlaceholder?: string;
  useNumberCustom?: boolean;
  onCommit: (next: string | null) => void;
}) {
  const [mode, setMode] = useState<TypographyFieldMode>(() =>
    inferTypographyFieldMode(value, tokenOptions),
  );

  useEffect(() => {
    setMode(inferTypographyFieldMode(value, tokenOptions));
  }, [value, tokenOptions]);

  return (
    <Stack gap={8}>
      <Field label={label}>
        <SegmentedControl
          name={`${name}-mode`}
          value={mode}
          options={[
            { value: 'custom', label: 'Value' },
            { value: 'token', label: 'Token' },
          ]}
          onCommit={(next) => setMode(next as TypographyFieldMode)}
        />
      </Field>
      {mode === 'token' ? (
        <Field label="Token">
          <Combobox
            name={`${name}-token`}
            value={value.trim()}
            options={catalogTokenOptions(tokenOptions, value.trim())}
            onCommit={(next) => onCommit(next.trim() ? next.trim() : null)}
          />
        </Field>
      ) : useNumberCustom ? (
        <Field label={label}>
          <NumberInput
            name={name}
            value={numberDraft(value)}
            onCommit={(next) => onCommit(next === null || next === undefined ? null : String(next))}
          />
        </Field>
      ) : (
        <Field label={label}>
          <TextInput
            name={name}
            value={value.trim()}
            placeholder={customPlaceholder}
            onCommit={(next) => onCommit(next.trim() ? next.trim() : null)}
          />
        </Field>
      )}
    </Stack>
  );
}

function fieldLabel(key: (typeof TYPOGRAPHY_VALUE_KEYS)[number]): string {
  if (key === 'fontFamily') return 'Family';
  if (key === 'fontSize') return 'Size';
  if (key === 'fontWeight') return 'Weight';
  if (key === 'lineHeight') return 'Line height';
  return 'Letter spacing';
}

function tokenOptionsForKey(
  key: (typeof TYPOGRAPHY_VALUE_KEYS)[number],
  catalogs: TypographyCatalogs,
): readonly string[] {
  if (key === 'fontFamily') return [...catalogs.fontRefs, ...catalogs.fontFamilyTokens];
  if (key === 'fontWeight') return catalogs.fontWeightTokens;
  if (key === 'lineHeight') return [...catalogs.dimensionTokens, ...catalogs.numberTokens];
  return catalogs.dimensionTokens;
}

export function TypographyControl({
  namePrefix,
  label,
  value,
  partial,
  catalogs,
  onCommit,
}: {
  namePrefix: string;
  label?: string;
  value: TypographyValue;
  partial?: boolean;
  catalogs: TypographyCatalogs;
  onCommit: (next: TypographyValue | null) => void;
}) {
  const keys = partial
    ? TYPOGRAPHY_VALUE_KEYS.filter((key) => value[key] !== undefined)
    : [...TYPOGRAPHY_VALUE_KEYS];

  const commitKey = (key: (typeof TYPOGRAPHY_VALUE_KEYS)[number], text: string | null) => {
    const next: TypographyValue = { ...value };
    if (!text) {
      delete next[key];
    } else {
      const parsed = parseTypographyFieldValue(key, text);
      if (parsed === undefined) delete next[key];
      else assignTypographyField(next, key, parsed);
    }
    onCommit(Object.keys(next).length ? next : null);
  };

  return (
    <Stack gap={12}>
      {label ? <span className="eu-field__hint">{label}</span> : null}
      {keys.map((key) => {
        const shown = formatTypographyFieldValue(value[key]);
        const tokens = tokenOptionsForKey(key, catalogs);
        const useNumber = key === 'fontWeight' || key === 'lineHeight';
        return (
          <TokenOrCustomField
            key={key}
            name={`${namePrefix}-${key}`}
            label={fieldLabel(key)}
            value={shown}
            tokenOptions={tokens}
            useNumberCustom={useNumber}
            customPlaceholder={key === 'fontFamily' ? 'Inter, sans-serif' : undefined}
            onCommit={(next) => commitKey(key, next)}
          />
        );
      })}
    </Stack>
  );
}

export function TypographyStyleControl({
  name,
  label,
  property,
  value,
  catalogs,
  onCommit,
}: {
  name?: string;
  label?: string;
  property: string;
  value: string;
  catalogs: TypographyCatalogs;
  onCommit: (next: string | null) => void;
}) {
  const key = property.trim().toLowerCase();
  const fieldLabel = label ?? property;
  const fieldName = name ?? `style-${key}`;

  if (key === 'font-family') {
    const tokens = [...catalogs.fontRefs, ...catalogs.fontFamilyTokens];
    return (
      <TokenOrCustomField
        name={fieldName}
        label={fieldLabel}
        value={value}
        tokenOptions={tokens}
        customPlaceholder="Inter, sans-serif"
        onCommit={onCommit}
      />
    );
  }
  if (key === 'font-weight') {
    return (
      <TokenOrCustomField
        name={fieldName}
        label={fieldLabel}
        value={value}
        tokenOptions={catalogs.fontWeightTokens}
        useNumberCustom
        onCommit={onCommit}
      />
    );
  }
  if (key === 'line-height') {
    return (
      <TokenOrCustomField
        name={fieldName}
        label={fieldLabel}
        value={value}
        tokenOptions={[...catalogs.dimensionTokens, ...catalogs.numberTokens]}
        useNumberCustom
        onCommit={onCommit}
      />
    );
  }
  if (key === 'font-size' || key === 'letter-spacing') {
    return (
      <TokenOrCustomField
        name={fieldName}
        label={fieldLabel}
        value={value}
        tokenOptions={catalogs.dimensionTokens}
        onCommit={onCommit}
      />
    );
  }

  return (
    <Field label={fieldLabel}>
      <TextInput
        name={fieldName}
        value={value}
        onCommit={(next) => onCommit(next.trim() || null)}
      />
    </Field>
  );
}
