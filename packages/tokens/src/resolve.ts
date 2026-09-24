import {
  defaultBreakpoints,
  DocumentError,
  isPlainObject,
  readTokenTree,
  tokenReference,
  type Breakpoint,
  type FontFamily,
  type IndexedToken,
  type JsonValue,
  type TokenIndex,
  type TokenTier,
  type TokenType,
} from '@facadeur/core';
import { fontCustomProperty, tokenCustomProperty, typographyCustomProperty } from './names.js';

const TYPOGRAPHY_FIELDS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
] as const;

type TypographyField = (typeof TYPOGRAPHY_FIELDS)[number];
type Expectation = TokenType | 'lineHeight';

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

export interface DesignInput {
  tokens?: unknown;
  fonts?: readonly FontFamily[];
  breakpoints?: readonly Breakpoint[];
}

export interface ParsedToken {
  path: string;
  /** Custom property for a scalar token. Typography uses one name per field. */
  name: string;
  type: TokenType;
  tier?: TokenTier;
  /** Unresolved DTCG value. */
  value: JsonValue;
  description?: string;
  breakpoints: Record<string, JsonValue>;
}

export interface CssProperty {
  name: string;
  /** Value at the base breakpoint. Empty when the property exists only in a query. */
  value: string;
  /** Overrides for non-base breakpoints, keyed by breakpoint id. */
  breakpoints: Record<string, string>;
}

export interface ResolvedDesign {
  tokens: ParsedToken[];
  properties: CssProperty[];
  fonts: FontFamily[];
  /**
   * Sorted by min-width. The first entry is the base layer and does not emit `@media`.
   * Its min-width is the viewport width of that frame, not a query threshold.
   */
  breakpoints: Breakpoint[];
}

/** Parse a DTCG tree, inherit group `$type`, and resolve references. */
export function loadTokens(input: DesignInput = {}): ResolvedDesign {
  const index = readTokenTree(input.tokens ?? {});
  const fonts = [...(input.fonts ?? [])];
  const breakpoints = activeBreakpoints(input.breakpoints);
  assertFontPaths(index, fonts);
  assertBreakpointKeys(index, breakpoints);
  const stack = new Set<string>();
  const done = new Set<string>();
  for (const path of [...index.tokens.keys()].sort()) {
    resolveToken(path, index, fonts, stack, done);
  }
  return {
    tokens: [...index.tokens.values()]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map(toParsed),
    properties: collectProperties(index, fonts, breakpoints),
    fonts,
    breakpoints,
  };
}

export function activeBreakpoints(breakpoints: readonly Breakpoint[] | undefined): Breakpoint[] {
  const source = breakpoints?.length ? breakpoints : defaultBreakpoints;
  return source
    .map((item) => ({ id: item.id, minWidth: item.minWidth }))
    .sort((left, right) => left.minWidth - right.minWidth || left.id.localeCompare(right.id));
}

function assertFontPaths(index: TokenIndex, fonts: readonly FontFamily[]): void {
  const ids = new Set<string>();
  for (const font of fonts) {
    if (ids.has(font.id)) {
      throw new DocumentError('schema', `Duplicate font "${font.id}"`);
    }
    ids.add(font.id);
    const path = `font.${font.id}`;
    const occupied =
      index.tokens.has(path) ||
      index.groups.has(path) ||
      [...index.tokens.keys()].some((key) => key.startsWith(`${path}.`)) ||
      [...index.groups.keys()].some((key) => key.startsWith(`${path}.`));
    if (occupied) {
      throw new DocumentError(
        'token-schema',
        `Font "${font.id}" collides with token path "${path}"`,
      );
    }
  }
}

function assertBreakpointKeys(index: TokenIndex, breakpoints: readonly Breakpoint[]): void {
  const base = breakpoints[0];
  if (!base) throw new DocumentError('schema', 'Breakpoints must not be empty');
  const known = new Set(breakpoints.map((item) => item.id));
  for (const token of index.tokens.values()) {
    for (const id of Object.keys(token.breakpoints)) {
      if (!known.has(id)) {
        throw new DocumentError(
          'token-schema',
          `Token "${token.path}" uses unknown breakpoint "${id}" (expected ${[...known].join(', ')})`,
        );
      }
      if (id === base.id) {
        throw new DocumentError(
          'token-schema',
          `Token "${token.path}" repeats the base breakpoint "${id}" in $extensions. Put that value in $value`,
        );
      }
    }
  }
}

function resolveToken(
  path: string,
  index: TokenIndex,
  fonts: readonly FontFamily[],
  stack: Set<string>,
  done: Set<string>,
): void {
  if (done.has(path)) return;
  if (stack.has(path)) {
    throw new DocumentError(
      'token-cycle',
      `Cycle in token references: ${[...stack, path].join(' → ')}`,
    );
  }
  const token = index.tokens.get(path);
  if (!token) {
    throw new DocumentError('token-missing', `Missing token "{${path}}"`);
  }
  stack.add(path);
  walkValue(token.value, token.type, token.path, undefined, index, fonts, stack, done);
  for (const [breakpoint, value] of Object.entries(token.breakpoints)) {
    if (token.type === 'typography' && isPlainObject(value)) {
      walkTypography(value, token.path, index, fonts, stack, done);
      continue;
    }
    walkValue(value, token.type, token.path, breakpoint, index, fonts, stack, done);
  }
  stack.delete(path);
  done.add(path);
}

function walkValue(
  value: JsonValue,
  expected: Expectation,
  from: string,
  field: string | undefined,
  index: TokenIndex,
  fonts: readonly FontFamily[],
  stack: Set<string>,
  done: Set<string>,
): void {
  const ref = tokenReference(value);
  if (ref) {
    followReference(ref, expected, from, field, index, fonts, stack, done);
    return;
  }
  if (expected === 'typography' && isPlainObject(value)) {
    walkTypography(value, from, index, fonts, stack, done);
    return;
  }
  if (expected === 'shadow') walkShadow(value, from, index, fonts, stack, done);
  if (expected === 'fontFamily' && Array.isArray(value)) {
    for (const item of value) {
      if (isJson(item)) {
        walkValue(item, 'fontFamily', from, 'fontFamily', index, fonts, stack, done);
      }
    }
  }
}

function walkTypography(
  value: Record<string, unknown>,
  from: string,
  index: TokenIndex,
  fonts: readonly FontFamily[],
  stack: Set<string>,
  done: Set<string>,
): void {
  const fields: [TypographyField, Expectation][] = [
    ['fontFamily', 'fontFamily'],
    ['fontSize', 'dimension'],
    ['fontWeight', 'fontWeight'],
    ['lineHeight', 'lineHeight'],
    ['letterSpacing', 'dimension'],
  ];
  for (const [field, expected] of fields) {
    if (!(field in value)) continue;
    const item = value[field];
    if (!isJson(item)) continue;
    walkValue(item, expected, from, field, index, fonts, stack, done);
  }
}

function walkShadow(
  value: JsonValue,
  from: string,
  index: TokenIndex,
  fonts: readonly FontFamily[],
  stack: Set<string>,
  done: Set<string>,
): void {
  const list = Array.isArray(value) ? value : [value];
  for (const item of list) {
    if (!isPlainObject(item)) continue;
    for (const field of ['color', 'offsetX', 'offsetY', 'blur', 'spread'] as const) {
      if (!(field in item)) continue;
      const entry = item[field];
      if (!isJson(entry)) continue;
      const expected = field === 'color' ? 'color' : 'dimension';
      walkValue(entry, expected, from, field, index, fonts, stack, done);
    }
  }
}

function followReference(
  ref: string,
  expected: Expectation,
  from: string,
  field: string | undefined,
  index: TokenIndex,
  fonts: readonly FontFamily[],
  stack: Set<string>,
  done: Set<string>,
): void {
  const fontId = fontIdFromPath(ref);
  if (fontId && !index.tokens.has(ref)) {
    if (!fonts.some((font) => font.id === fontId)) {
      throw missingReference(ref, from, field);
    }
    if (!accepts(expected, 'fontFamily')) {
      throw typeMismatch(from, field, ref, 'fontFamily', expected);
    }
    return;
  }
  const target = index.tokens.get(ref);
  if (!target) throw missingReference(ref, from, field);
  if (!accepts(expected, target.type)) {
    throw typeMismatch(from, field, ref, target.type, expected);
  }
  resolveToken(ref, index, fonts, stack, done);
}

function accepts(expected: Expectation, actual: TokenType): boolean {
  if (expected === 'lineHeight') return actual === 'number' || actual === 'dimension';
  return expected === actual;
}

function missingReference(ref: string, from: string, field: string | undefined): DocumentError {
  const via = field ? ` (${field})` : '';
  return new DocumentError(
    'token-missing',
    `Missing token "{${ref}}" referenced by "${from}"${via}`,
  );
}

function typeMismatch(
  from: string,
  field: string | undefined,
  ref: string,
  actual: TokenType,
  expected: Expectation,
): DocumentError {
  const via = field ? ` ${field}` : '';
  return new DocumentError(
    'token-type',
    `Token "${from}"${via} references "{${ref}}" (${actual}) but expects a ${expected}`,
  );
}

function collectProperties(
  index: TokenIndex,
  fonts: readonly FontFamily[],
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

  for (const font of fonts) add(fontCustomProperty(font.id), undefined, fontStack(font));

  const baseId = breakpoints[0]?.id;
  for (const token of [...index.tokens.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    emitToken(token, undefined, token.value, false, add, index);
    for (const breakpoint of breakpoints) {
      if (breakpoint.id === baseId) continue;
      const override = token.breakpoints[breakpoint.id];
      if (override === undefined) continue;
      emitToken(token, breakpoint.id, override, true, add, index);
    }
  }
  return [...props.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function emitToken(
  token: IndexedToken,
  breakpoint: string | undefined,
  value: JsonValue,
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
  value: JsonValue,
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
        `var(${typographyCustomProperty(ref, field)})`,
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

function cssField(field: TypographyField, value: JsonValue, index: TokenIndex): string {
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

function cssValue(type: TokenType, value: JsonValue, index: TokenIndex): string {
  const ref = tokenReference(value);
  if (ref) return cssReference(`{${ref}}`, index);
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
  const fontId = fontIdFromPath(ref);
  if (fontId && !index.tokens.has(ref)) return `var(${fontCustomProperty(fontId)})`;
  return `var(${tokenCustomProperty(ref)})`;
}

function cssFontFamily(value: JsonValue, index: TokenIndex): string {
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

function cssShadow(value: JsonValue, index: TokenIndex): string {
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

/** CSS `font-family` stack: quoted family name, then fallbacks. Generics stay bare. */
export function fontStack(font: FontFamily): string {
  return [font.family, ...font.fallbacks].map((name) => quoteFamily(name)).join(', ');
}

export function quoteFamily(name: string): string {
  const lower = name.toLowerCase();
  if (GENERIC_FAMILIES.has(lower)) return lower;
  return `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function fontIdFromPath(path: string): string | undefined {
  const [head, id, extra] = path.split('.');
  if (head !== 'font' || !id || extra !== undefined) return undefined;
  return id;
}

function toParsed(token: IndexedToken): ParsedToken {
  const parsed: ParsedToken = {
    path: token.path,
    name: tokenCustomProperty(token.path),
    type: token.type,
    value: token.value,
    breakpoints: token.breakpoints,
  };
  if (token.tier) parsed.tier = token.tier;
  if (token.description !== undefined) parsed.description = token.description;
  return parsed;
}

function isJson(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return true;
  return isPlainObject(value);
}
