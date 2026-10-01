import { DocumentError } from './document/errors.js';
import { isPlainObject, type JsonValue } from './document/json.js';
import type { TokenType } from './document/schema.js';

const REFERENCE = /^\{([a-z0-9]+(?:\.[a-z0-9]+)*)\}$/;
const FONT_WEIGHT_KEYWORDS = new Set(['normal', 'bold', 'lighter', 'bolder']);
const DIMENSION = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:px|rem|em|%)$/;

const TYPOGRAPHY_FIELDS = new Set([
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
]);
const SHADOW_FIELDS = new Set(['color', 'offsetX', 'offsetY', 'blur', 'spread', 'inset']);

function tokenReference(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return REFERENCE.exec(value)?.[1];
}

export function assertBreakpointValue(
  type: TokenType,
  value: JsonValue,
  path: string,
  breakpoint: string,
): void {
  const where = `Token "${path}" breakpoint "${breakpoint}"`;
  if (type === 'typography' && isPlainObject(value)) {
    assertTypography(value, where, true);
    return;
  }
  assertTokenValue(type, value, where);
}

export function assertTokenValue(type: TokenType, value: JsonValue, where: string): void {
  if (typeof value === 'string' && malformedReference(value)) {
    throw new DocumentError('token-schema', `${where} has a malformed reference "${value}"`);
  }
  if (tokenReference(value)) return;
  switch (type) {
    case 'color':
      assertColor(value, where);
      return;
    case 'dimension':
      assertDimension(value, where);
      return;
    case 'number':
      assertNumber(value, where);
      return;
    case 'fontWeight':
      assertFontWeight(value, where);
      return;
    case 'fontFamily':
      assertFontFamily(value, where);
      return;
    case 'shadow':
      assertShadow(value, where);
      return;
    case 'typography':
      assertTypography(value, where, false);
      return;
    default: {
      const unreachable: never = type;
      throw new DocumentError('token-type', `Unknown token type "${String(unreachable)}"`);
    }
  }
}

export function assertTypography(
  value: Record<string, unknown> | JsonValue,
  where: string,
  partial: boolean,
): void {
  if (!isPlainObject(value)) {
    throw new DocumentError('token-type', `${where} must be a typography value`);
  }
  const keys = Object.keys(value);
  if (partial && keys.length === 0) {
    throw new DocumentError('token-type', `${where} typography override is empty`);
  }
  for (const key of keys) {
    if (!TYPOGRAPHY_FIELDS.has(key)) {
      throw new DocumentError('token-type', `${where} typography has unknown field "${key}"`);
    }
  }
  const required = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight'] as const;
  if (!partial) {
    for (const key of required) {
      if (!(key in value)) {
        throw new DocumentError('token-type', `${where} typography needs ${key}`);
      }
    }
  }
  if ('fontFamily' in value)
    assertMaybeRef(value.fontFamily, where, 'fontFamily', assertFontFamily);
  if ('fontSize' in value) assertMaybeRef(value.fontSize, where, 'fontSize', assertDimension);
  if ('fontWeight' in value)
    assertMaybeRef(value.fontWeight, where, 'fontWeight', assertFontWeight);
  if ('lineHeight' in value) {
    assertMaybeRef(value.lineHeight, where, 'lineHeight', (item, label) => {
      if (typeof item === 'number') {
        assertNumber(item, label);
        return;
      }
      assertDimension(item, label);
    });
  }
  if ('letterSpacing' in value) {
    assertMaybeRef(value.letterSpacing, where, 'letterSpacing', assertDimension);
  }
}

function assertColor(value: JsonValue, where: string): void {
  if (typeof value !== 'string' || value.trim() === '' || /[;{}]/.test(value)) {
    throw new DocumentError('token-type', `${where} must be a CSS color`);
  }
}

function assertDimension(value: JsonValue, where: string): void {
  if (typeof value !== 'string' || (!DIMENSION.test(value) && value !== '0' && value !== '-0')) {
    throw new DocumentError('token-type', `${where} must be a dimension such as 16px, 1rem, or 0`);
  }
}

function assertNumber(value: JsonValue, where: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DocumentError('token-type', `${where} must be a finite number`);
  }
}

function assertFontWeight(value: JsonValue, where: string): void {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      throw new DocumentError('token-type', `${where} must be a font weight from 1 to 1000`);
    }
    return;
  }
  if (typeof value === 'string' && FONT_WEIGHT_KEYWORDS.has(value)) return;
  throw new DocumentError('token-type', `${where} must be a font weight`);
}

function assertFontFamily(value: JsonValue, where: string): void {
  if (typeof value === 'string') {
    assertFamilyName(value, where);
    return;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new DocumentError('token-type', `${where} must be a font family or a list of them`);
  }
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new DocumentError('token-type', `${where} font families must be strings`);
    }
    if (tokenReference(item)) continue;
    if (malformedReference(item)) {
      throw new DocumentError('token-schema', `${where} has a malformed reference "${item}"`);
    }
    assertFamilyName(item, where);
  }
}

function assertFamilyName(value: string, where: string): void {
  if (value.trim() === '' || /[\n\r";{}]/.test(value)) {
    throw new DocumentError('token-type', `${where} has an invalid font family name`);
  }
}

function assertShadow(value: JsonValue, where: string): void {
  if (Array.isArray(value)) {
    if (!value.length) throw new DocumentError('token-type', `${where} shadow list is empty`);
    for (const item of value) assertShadowObject(item, where);
    return;
  }
  assertShadowObject(value, where);
}

function assertShadowObject(value: JsonValue, where: string): void {
  if (!isPlainObject(value)) {
    throw new DocumentError('token-type', `${where} must be a shadow`);
  }
  for (const key of Object.keys(value)) {
    if (!SHADOW_FIELDS.has(key)) {
      throw new DocumentError('token-type', `${where} shadow has unknown field "${key}"`);
    }
  }
  for (const key of ['color', 'offsetX', 'offsetY', 'blur'] as const) {
    if (!(key in value)) {
      throw new DocumentError('token-type', `${where} shadow needs ${key}`);
    }
  }
  assertMaybeRef(value.color, where, 'color', assertColor);
  assertMaybeRef(value.offsetX, where, 'offsetX', assertDimension);
  assertMaybeRef(value.offsetY, where, 'offsetY', assertDimension);
  assertMaybeRef(value.blur, where, 'blur', assertDimension);
  if ('spread' in value) assertMaybeRef(value.spread, where, 'spread', assertDimension);
  if ('inset' in value && typeof value.inset !== 'boolean') {
    throw new DocumentError('token-type', `${where} shadow inset must be a boolean`);
  }
}

function assertMaybeRef(
  value: unknown,
  where: string,
  field: string,
  assertLiteral: (value: JsonValue, where: string) => void,
): void {
  const label = `${where} ${field}`;
  if (!isJsonValue(value) || value === null) {
    throw new DocumentError('token-type', `${label} must be JSON`);
  }
  if (typeof value === 'string' && malformedReference(value)) {
    throw new DocumentError('token-schema', `${label} has a malformed reference "${value}"`);
  }
  if (tokenReference(value)) return;
  assertLiteral(value, label);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return true;
  return isPlainObject(value);
}

function malformedReference(value: string): boolean {
  return (value.includes('{') || value.includes('}')) && !tokenReference(value);
}
