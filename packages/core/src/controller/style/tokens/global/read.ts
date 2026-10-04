import { DocumentError } from '../../../../document/errors.js';
import { canonicalizeJson, isJsonValue, isPlainObject, type JsonValue } from '../../../../utils.js';
import { tokenTypes, type TokenType } from '../../../../schema/document.js';
import { TOKEN_SEGMENT } from '../syntax.js';
const BREAKPOINT_ID = /^[a-z][a-z0-9]*$/;
const RESERVED = new Set(['$value', '$type', '$description', '$deprecated', '$extensions']);
const FACADEUR_KEYS = new Set(['tier', 'breakpoints', 'label']);
const TIERS = new Set(['primitive', 'semantic', 'component']);

export function childEntries(node: Record<string, unknown>, where: string) {
  const entries: [string, unknown][] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (!TOKEN_SEGMENT.test(key)) {
      throw new DocumentError(
        'token-schema',
        `Token path "${where === '(root)' ? key : `${where}.${key}`}" has an invalid segment "${key}"`,
      );
    }
    entries.push([key, value]);
  }
  return entries;
}

export function rejectUnknownReserved(node: Record<string, unknown>, where: string) {
  for (const key of Object.keys(node)) {
    if (key.startsWith('$') && !RESERVED.has(key)) {
      throw new DocumentError('token-schema', `Token "${where}" has unknown property "${key}"`);
    }
  }
}

export function readType(value: unknown, where: string) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !tokenTypes.includes(value as TokenType)) {
    throw new DocumentError(
      'token-type',
      `Unknown token type "${String(value)}" on "${where}" (expected ${tokenTypes.join(', ')})`,
    );
  }
  return value as TokenType;
}

export function readTier(extensions: unknown, where: string) {
  if (extensions === undefined) return undefined;
  if (!isPlainObject(extensions)) {
    throw new DocumentError('token-schema', `"${where}" $extensions must be an object`);
  }
  for (const key of Object.keys(extensions)) {
    if (!isJsonValue(extensions[key])) {
      throw new DocumentError('token-schema', `"${where}" $extensions.${key} must be JSON`);
    }
  }
  const facadeur = extensions.facadeur;
  if (facadeur === undefined) return undefined;
  if (!isPlainObject(facadeur)) {
    throw new DocumentError('token-schema', `"${where}" $extensions.facadeur must be an object`);
  }
  for (const key of Object.keys(facadeur)) {
    if (!FACADEUR_KEYS.has(key)) {
      throw new DocumentError('token-schema', `"${where}" has unknown facadeur extension "${key}"`);
    }
  }
  if (facadeur.tier === undefined) return undefined;
  if (typeof facadeur.tier !== 'string' || !TIERS.has(facadeur.tier)) {
    throw new DocumentError(
      'token-schema',
      `"${where}" tier must be primitive, semantic, or component`,
    );
  }
  return facadeur.tier as 'primitive' | 'semantic' | 'component';
}

export function readBreakpoints(extensions: unknown, path: string) {
  if (!isPlainObject(extensions) || !isPlainObject(extensions.facadeur)) return {};
  const raw = extensions.facadeur.breakpoints;
  if (raw === undefined) return {};
  if (!isPlainObject(raw)) {
    throw new DocumentError('token-schema', `Token "${path}" breakpoints must be an object`);
  }
  const breakpoints: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!BREAKPOINT_ID.test(key)) {
      throw new DocumentError('token-schema', `Token "${path}" has an invalid breakpoint "${key}"`);
    }
    if (!isJsonValue(value) || value === null) {
      throw new DocumentError(
        'token-type',
        `Token "${path}" breakpoint "${key}" has a value that is not JSON`,
      );
    }
    breakpoints[key] = canonicalizeJson(value);
  }
  return breakpoints;
}

export function readLabel(extensions: unknown, path: string) {
  if (!isPlainObject(extensions) || !isPlainObject(extensions.facadeur)) return undefined;
  const label = extensions.facadeur.label;
  if (label === undefined) return undefined;
  if (typeof label !== 'string' || !label.trim()) {
    throw new DocumentError('token-schema', `Token "${path}" label must be a non-empty string`);
  }
  return label.trim();
}

export function readDescription(value: unknown, where: string) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new DocumentError('token-schema', `"${where}" $description must be a string`);
  }
  return value;
}

export function readDeprecated(value: unknown, where: string) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  throw new DocumentError('token-schema', `"${where}" $deprecated must be a boolean or a string`);
}

export function hasGroupBreakpoints(extensions: unknown) {
  return (
    isPlainObject(extensions) &&
    isPlainObject(extensions.facadeur) &&
    extensions.facadeur.breakpoints !== undefined
  );
}
