import {
  defaultBreakpoints,
  DocumentError,
  isPlainObject,
  readTokenTree,
  tokenReference,
  type Breakpoint,
  type DesignTokenValue,
  type FontFamily,
  type IndexedToken,
  type TokenIndex,
  type TokenTier,
  type TokenType,
} from '@facadeur/core';
import { tokenCustomProperty } from './names';
import { collectProperties, type CssProperty } from './css-properties';

export type { CssProperty } from './css-properties';
export { fontStack, quoteFamily } from './css-properties';

type TypographyField = 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing';
type Expectation = TokenType | 'lineHeight';

export interface DesignInput {
  tokens?: unknown;
  breakpoints?: readonly Breakpoint[];
}

export interface ParsedToken {
  path: string;
  /** Custom property for a scalar token. Typography uses one name per field. */
  name: string;
  type: TokenType;
  tier?: TokenTier;
  /** Unresolved token value, including stable UUID references. */
  value: DesignTokenValue;
  breakpoints: Record<string, DesignTokenValue>;
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

/** Index canonical token records and resolve their UUID references. */
export function loadTokens(input: DesignInput = {}): ResolvedDesign {
  const index = readTokenTree(input.tokens ?? {});
  const fonts = [...index.tokens.values()].filter(isFontFamilyToken);
  const breakpoints = activeBreakpoints(input.breakpoints);
  assertBreakpointKeys(index, breakpoints);
  const stack = new Set<string>();
  const done = new Set<string>();
  for (const uuid of [...index.tokens.keys()].sort()) {
    resolveToken(uuid, index, stack, done);
  }
  return {
    tokens: [...index.tokens.values()]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map(toParsed),
    properties: collectProperties(index, breakpoints),
    fonts,
    breakpoints,
  };
}

export function isBreakpointEnabled(breakpoint: Pick<Breakpoint, 'enabled'>): boolean {
  return breakpoint.enabled !== false;
}

/** All configured viewports, including disabled ones, sorted by min-width. */
export function configuredBreakpoints(
  breakpoints: readonly Breakpoint[] | undefined,
): Breakpoint[] {
  const source = breakpoints?.length ? breakpoints : defaultBreakpoints;
  return source
    .map(normalizeBreakpoint)
    .sort((left, right) => left.minWidth - right.minWidth || left.uuid.localeCompare(right.uuid));
}

/** Viewports shown in the editor, on the stage, and in compiled design CSS. */
export function activeBreakpoints(breakpoints: readonly Breakpoint[] | undefined): Breakpoint[] {
  return configuredBreakpoints(breakpoints).filter(isBreakpointEnabled);
}

function normalizeBreakpoint(item: Breakpoint): Breakpoint {
  return {
    uuid: item.uuid,
    minWidth: item.minWidth,
    label: item.label,
    ...(item.enabled === false ? { enabled: false } : {}),
  };
}

function assertBreakpointKeys(index: TokenIndex, breakpoints: readonly Breakpoint[]): void {
  const base = breakpoints[0];
  if (!base) throw new DocumentError('schema', 'Breakpoints must not be empty');
  const known = new Set(breakpoints.map((item) => item.uuid));
  for (const token of index.tokens.values()) {
    for (const id of Object.keys(token.breakpoints)) {
      if (!known.has(id)) {
        throw new DocumentError(
          'token-schema',
          `Token "${token.path}" uses unknown breakpoint "${id}" (expected ${[...known].join(', ')})`,
        );
      }
      if (id === base.uuid) {
        throw new DocumentError(
          'token-schema',
          `Token "${token.path}" repeats the base breakpoint "${id}". Put that value in value`,
        );
      }
    }
  }
}

function resolveToken(
  uuid: string,
  index: TokenIndex,
  stack: Set<string>,
  done: Set<string>,
): void {
  if (done.has(uuid)) return;
  if (stack.has(uuid)) {
    throw new DocumentError(
      'token-cycle',
      `Cycle in token references: ${[...stack, uuid].join(' → ')}`,
    );
  }
  const token = index.tokens.get(uuid);
  if (!token) {
    throw new DocumentError('token-missing', `Missing token "{token:${uuid}}"`);
  }
  stack.add(uuid);
  walkValue(token.value, token.type, token.path, undefined, index, stack, done);
  for (const [breakpoint, value] of Object.entries(token.breakpoints)) {
    if (token.type === 'typography' && isPlainObject(value)) {
      walkTypography(value, token.path, index, stack, done);
      continue;
    }
    walkValue(value, token.type, token.path, breakpoint, index, stack, done);
  }
  stack.delete(uuid);
  done.add(uuid);
}

function walkValue(
  value: DesignTokenValue,
  expected: Expectation,
  from: string,
  field: string | undefined,
  index: TokenIndex,
  stack: Set<string>,
  done: Set<string>,
): void {
  const ref = tokenReference(value);
  if (ref) {
    followReference(ref, expected, from, field, index, stack, done);
    return;
  }
  if (expected === 'typography' && isPlainObject(value)) {
    walkTypography(value, from, index, stack, done);
    return;
  }
  if (expected === 'shadow') walkShadow(value, from, index, stack, done);
  if (expected === 'fontFamily' && Array.isArray(value)) {
    for (const item of value) {
      if (isJson(item)) {
        walkValue(item, 'fontFamily', from, 'fontFamily', index, stack, done);
      }
    }
  }
}

function walkTypography(
  value: Record<string, unknown>,
  from: string,
  index: TokenIndex,
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
    walkValue(item, expected, from, field, index, stack, done);
  }
}

function walkShadow(
  value: DesignTokenValue,
  from: string,
  index: TokenIndex,
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
      walkValue(entry, expected, from, field, index, stack, done);
    }
  }
}

function followReference(
  ref: string,
  expected: Expectation,
  from: string,
  field: string | undefined,
  index: TokenIndex,
  stack: Set<string>,
  done: Set<string>,
): void {
  const target = index.tokens.get(ref);
  if (!target) throw missingReference(ref, from, field);
  if (!accepts(expected, target.type)) {
    throw typeMismatch(from, field, ref, target.type, expected);
  }
  resolveToken(ref, index, stack, done);
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

function toParsed(token: IndexedToken): ParsedToken {
  const parsed: ParsedToken = {
    path: token.path,
    name: tokenCustomProperty(token.path),
    type: token.type,
    value: token.value,
    breakpoints: token.breakpoints,
  };
  if (token.tier) parsed.tier = token.tier;
  return parsed;
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
