import {
  isPlainObject,
  tokenReference,
  type Breakpoint,
  type DesignTokenValue,
  type FontFamily,
  type IndexedToken,
  type TokenIndex,
  type TokenType,
} from '@facadeur/core';
import { tokenCustomProperty, typographyCustomProperty } from './names';

export interface CssProperty {
  name: string;
  /** Value at the base breakpoint. Empty when the property exists only in a query. */
  value: string;
  /** Overrides for non-base breakpoints, keyed by breakpoint id. */
  breakpoints: Record<string, string>;
}

const TYPOGRAPHY_FIELDS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
] as const;

type TypographyField = (typeof TYPOGRAPHY_FIELDS)[number];

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
]);

export function collectProperties(
  index: TokenIndex,
  breakpoints: readonly Breakpoint[],
): CssProperty[] {
  const props = new Map<string, CssProperty>();
  const add = (name: string, breakpoint: string | undefined, value: string) => {
    let property = props.get(name);
    if (!property) {
      property = { name, value: '', breakpoints: {} };
      props.set(name, property);
    }
    if (!breakpoint) property.value = value;
    else property.breakpoints[breakpoint] = value;
  };

  const fonts = [...index.tokens.values()].filter(isFontFamilyToken);
  for (const font of fonts) {
    add(tokenCustomProperty(font.path), undefined, fontStack(font));
  }

  const baseId = breakpoints[0]?.uuid;
  for (const token of [...index.tokens.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    emitToken(token, undefined, token.value, false, add, index);
    for (const breakpoint of breakpoints) {
      if (breakpoint.uuid === baseId) continue;
      const override = token.breakpoints[breakpoint.uuid];
      if (override === undefined) continue;
      emitToken(token, breakpoint.uuid, override, true, add, index);
    }
  }
  return [...props.values()].sort((left, right) => left.name.localeCompare(right.name));
}

/** CSS `font-family` stack: quoted family name, then fallbacks. Generics stay bare. */
export function fontStack(font: FontFamily): string {
  return [font.value.family, ...font.value.fallbacks].map((name) => quoteFamily(name)).join(', ');
}

export function quoteFamily(name: string): string {
  const lower = name.toLowerCase();
  if (GENERIC_FAMILIES.has(lower)) return lower;
  return `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function emitToken(
  token: IndexedToken,
  breakpoint: string | undefined,
  value: DesignTokenValue,
  partial: boolean,
  add: (name: string, breakpoint: string | undefined, value: string) => void,
  index: TokenIndex,
): void {
  if (token.type === 'typography') {
    emitTypography(token.path, breakpoint, value, partial, add, index);
    return;
  }
  add(tokenCustomProperty(token.path), breakpoint, cssValue(token.type, value, index));
}

function emitTypography(
  path: string,
  breakpoint: string | undefined,
  value: DesignTokenValue,
  partial: boolean,
  add: (name: string, breakpoint: string | undefined, value: string) => void,
  index: TokenIndex,
): void {
  const ref = tokenReference(value);
  if (ref) {
    const target = index.tokens.get(ref);
    if (!target) return;
    for (const field of typographyFields(target, index, new Set())) {
      add(
        typographyCustomProperty(path, field),
        breakpoint,
        `var(${typographyCustomProperty(target.path, field)})`,
      );
    }
    return;
  }
  if (!isPlainObject(value)) return;
  for (const field of TYPOGRAPHY_FIELDS) {
    if (!(field in value)) continue;
    if (partial && value[field] === undefined) continue;
    const item = value[field];
    if (!isJson(item)) continue;
    add(typographyCustomProperty(path, field), breakpoint, cssField(field, item, index));
  }
}

function typographyFields(
  token: IndexedToken,
  index: TokenIndex,
  seen: Set<string>,
): TypographyField[] {
  if (seen.has(token.path)) return [];
  seen.add(token.path);
  const ref = tokenReference(token.value);
  if (ref) {
    const target = index.tokens.get(ref);
    return target ? typographyFields(target, index, seen) : [];
  }
  const value = token.value;
  if (!isPlainObject(value)) return [];
  return TYPOGRAPHY_FIELDS.filter((field) => field in value);
}

function cssField(field: TypographyField, value: DesignTokenValue, index: TokenIndex): string {
  if (tokenReference(value)) return cssReference(String(value), index);
  switch (field) {
    case 'fontFamily':
      return cssValue('fontFamily', value, index);
    case 'fontSize':
    case 'letterSpacing':
      return cssValue('dimension', value, index);
    case 'fontWeight':
      return cssValue('fontWeight', value, index);
    case 'lineHeight':
      return typeof value === 'number' ? String(value) : cssValue('dimension', value, index);
    default: {
      const unreachable: never = field;
      return String(unreachable);
    }
  }
}

function cssValue(type: TokenType, value: DesignTokenValue, index: TokenIndex): string {
  const ref = tokenReference(value);
  if (ref) return cssReference(`{token:${ref}}`, index);
  switch (type) {
    case 'color':
    case 'dimension':
      return String(value);
    case 'number':
    case 'fontWeight':
      return String(value);
    case 'fontFamily':
      return cssFontFamily(value, index);
    case 'shadow':
      return cssShadow(value, index);
    case 'typography':
      return '';
    default: {
      const unreachable: never = type;
      return String(unreachable);
    }
  }
}

function cssReference(value: string, index: TokenIndex): string {
  const ref = tokenReference(value);
  if (!ref) return value;
  const target = index.tokens.get(ref);
  return target ? `var(${tokenCustomProperty(target.path)})` : `var(--token-${ref})`;
}

function cssFontFamily(value: DesignTokenValue, index: TokenIndex): string {
  if (typeof value === 'string') {
    if (tokenReference(value)) return cssReference(value, index);
    return quoteFamily(value);
  }
  if (!Array.isArray(value)) return '';
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => (tokenReference(item) ? cssReference(item, index) : quoteFamily(item)))
    .join(', ');
}

function cssShadow(value: DesignTokenValue, index: TokenIndex): string {
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter((item) => isPlainObject(item))
    .map((item) => {
      const inset = item.inset === true ? 'inset ' : '';
      const spread = isJson(item.spread) ? cssValue('dimension', item.spread, index) : '0';
      const offsetX = isJson(item.offsetX) ? cssValue('dimension', item.offsetX, index) : '0';
      const offsetY = isJson(item.offsetY) ? cssValue('dimension', item.offsetY, index) : '0';
      const blur = isJson(item.blur) ? cssValue('dimension', item.blur, index) : '0';
      const color = isJson(item.color) ? cssValue('color', item.color, index) : 'transparent';
      return `${inset}${offsetX} ${offsetY} ${blur} ${spread} ${color}`;
    })
    .join(', ');
}

function isJson(value: unknown): value is DesignTokenValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return true;
  return isPlainObject(value);
}

function isFontFamilyToken(token: IndexedToken): token is IndexedToken & FontFamily {
  return token.family === 'font' && token.valueType === 'fontFamily';
}
