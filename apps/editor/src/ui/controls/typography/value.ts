import { tokenReference, tokenReferenceValue, type FontFamily } from '@facadeur/core';

const LOCAL_TOKEN_REF = /^\{[a-z0-9.]+\}$/;

export type TypographyValue = {
  fontFamily?: string | string[];
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
};

export const TYPOGRAPHY_VALUE_KEYS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
] as const satisfies readonly (keyof TypographyValue)[];

export const KNOWN_TYPOGRAPHY_STYLE_PROPERTIES = new Set([
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'font-style',
  'font-stretch',
  'font-variant',
  'text-transform',
]);

export function isTokenRef(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(tokenReference(trimmed) || LOCAL_TOKEN_REF.test(trimmed));
}

export function projectFontRefs(fonts: readonly Pick<FontFamily, 'uuid'>[]): string[] {
  return fonts
    .map((font) => tokenReferenceValue(font.uuid))
    .sort((left, right) => left.localeCompare(right));
}

/** Weights declared on the project fonts. Typography picks one of these numbers. */
export function projectFontWeightOptions(
  fonts: readonly Pick<FontFamily, 'value'>[],
): string[] {
  return [...new Set(fonts.flatMap((font) => font.value.weights))]
    .sort((left, right) => left - right)
    .map(String);
}

export function isTypographyValue(value: unknown): value is TypographyValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isTypographyStyleProperty(property: string): boolean {
  const name = property.trim().toLowerCase();
  if (!name) return false;
  if (KNOWN_TYPOGRAPHY_STYLE_PROPERTIES.has(name)) return true;
  return name.startsWith('font-');
}

export function formatTypographyFieldValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function parseTypographyFieldValue(
  key: keyof TypographyValue,
  text: string,
): TypographyValue[keyof TypographyValue] | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (key === 'fontWeight' || key === 'lineHeight') {
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && /^-?\d+(\.\d+)?$/.test(trimmed)) return asNumber;
  }
  if (key === 'fontFamily' && trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return trimmed;
}

export type TypographyFieldMode = 'token' | 'custom';

export function inferTypographyFieldMode(
  value: string,
  tokenOptions: readonly string[],
): TypographyFieldMode {
  const trimmed = value.trim();
  if (!trimmed) return 'custom';
  if (isTokenRef(trimmed) && tokenOptions.includes(trimmed)) return 'token';
  if (isTokenRef(trimmed)) return 'token';
  return 'custom';
}

export function familyTokenOptions(
  fontRefs: readonly string[],
  fontFamilyTokens: readonly string[],
  current?: string,
): string[] {
  const merged = [...fontRefs, ...fontFamilyTokens];
  const unique = [...new Set(merged)].sort((left, right) => left.localeCompare(right));
  if (current && !unique.includes(current)) return [current, ...unique];
  return unique;
}
