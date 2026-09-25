import {
  isPlainObject,
  type JsonValue,
  type TokenDefinition,
  type TokenTree,
  type TokenType,
} from '@facadeur/core';

const TOKEN_TYPES = new Set<TokenType>([
  'color',
  'dimension',
  'number',
  'fontFamily',
  'fontWeight',
  'shadow',
  'typography',
]);

export function formatTokenValue(value: JsonValue): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/** Keep strings as strings. Objects and numbers are parsed so a color edit stays a color. */
export function parseEditedValue(text: string, previous: JsonValue): JsonValue {
  if (typeof previous === 'string') return text.trim();
  if (typeof previous === 'number') {
    const value = Number(text.trim());
    if (!Number.isFinite(value)) throw new Error('Value must be a number');
    return value;
  }
  if (typeof previous === 'boolean') {
    if (text.trim() === 'true') return true;
    if (text.trim() === 'false') return false;
    throw new Error('Value must be true or false');
  }
  return JSON.parse(text) as JsonValue;
}

/** Copy the stored token and replace `$value`, so breakpoints and descriptions stay. */
export function withTokenValue(tree: TokenTree, path: string, value: JsonValue): TokenDefinition {
  const node = tokenNode(tree, path);
  const next: TokenDefinition = { $value: value };
  if (typeof node.$type === 'string' && isTokenType(node.$type)) next.$type = node.$type;
  if (typeof node.$description === 'string') next.$description = node.$description;
  if (typeof node.$deprecated === 'boolean' || typeof node.$deprecated === 'string') {
    next.$deprecated = node.$deprecated;
  }
  if (isPlainObject(node.$extensions)) {
    next.$extensions = node.$extensions as TokenDefinition['$extensions'];
  }
  return next;
}

/**
 * Set or clear one `$extensions.facadeur.breakpoints` value.
 * `$value` and every other breakpoint stay as stored. `null` removes that key.
 */
export function withTokenBreakpoint(
  tree: TokenTree,
  path: string,
  breakpointId: string,
  value: JsonValue | null,
): TokenDefinition {
  const node = tokenNode(tree, path);
  const next = withTokenValue(tree, path, node.$value as JsonValue);
  const extensions = isPlainObject(next.$extensions)
    ? (structuredClone(next.$extensions) as Record<string, JsonValue>)
    : {};
  const facadeur = isPlainObject(extensions.facadeur)
    ? { ...(extensions.facadeur as Record<string, JsonValue>) }
    : {};
  const breakpoints = isPlainObject(facadeur.breakpoints)
    ? { ...(facadeur.breakpoints as Record<string, JsonValue>) }
    : {};
  if (value === null) delete breakpoints[breakpointId];
  else breakpoints[breakpointId] = value;
  if (Object.keys(breakpoints).length) facadeur.breakpoints = breakpoints;
  else delete facadeur.breakpoints;
  if (Object.keys(facadeur).length) extensions.facadeur = facadeur;
  else delete extensions.facadeur;
  if (Object.keys(extensions).length) next.$extensions = extensions;
  else delete next.$extensions;
  return next;
}

function tokenNode(tree: TokenTree, path: string): Record<string, unknown> {
  let cursor: unknown = tree;
  for (const part of path.split('.')) {
    if (!isPlainObject(cursor)) throw new Error(`Missing token ${path}`);
    cursor = cursor[part];
  }
  if (!isPlainObject(cursor) || !('$value' in cursor)) {
    throw new Error(`Missing token ${path}`);
  }
  return cursor;
}

function isTokenType(value: string): value is TokenType {
  return TOKEN_TYPES.has(value as TokenType);
}
