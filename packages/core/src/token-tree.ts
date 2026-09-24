import { DocumentError } from './errors.js';
import { canonicalizeJson, isJsonValue, isPlainObject, type JsonValue } from './json.js';
import { tokenTypes, type TokenType } from './schema.js';

/** One path segment. Digits are allowed (`500`); hyphens are not, so CSS names stay unique. */
export const TOKEN_SEGMENT = /^[a-z0-9]+$/;

const REFERENCE = /^\{([a-z0-9]+(?:\.[a-z0-9]+)*)\}$/;
const BREAKPOINT_ID = /^[a-z][a-z0-9]*$/;
const RESERVED = new Set(['$value', '$type', '$description', '$deprecated', '$extensions']);
const FACADEUR_KEYS = new Set(['tier', 'breakpoints']);
const TIERS = new Set(['primitive', 'semantic', 'component']);
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

export type TokenTier = 'primitive' | 'semantic' | 'component';

/** DTCG tree as stored on the document. Object keys are sorted when canonicalized. */
export type TokenTree = Record<string, JsonValue>;

export interface TokenDefinition {
  $value: JsonValue;
  $type?: TokenType;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, JsonValue>;
}

export interface TokenGroupDefinition {
  $type?: TokenType;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, JsonValue>;
}

export interface IndexedToken {
  path: string;
  type: TokenType;
  tier?: TokenTier;
  value: JsonValue;
  description?: string;
  deprecated?: boolean | string;
  breakpoints: Record<string, JsonValue>;
}

export interface IndexedGroup {
  path: string;
  type?: TokenType;
  tier?: TokenTier;
  description?: string;
}

export interface TokenIndex {
  tokens: Map<string, IndexedToken>;
  groups: Map<string, IndexedGroup>;
}

/** Whole-string DTCG reference `{group.token}`, or undefined. */
export function tokenReference(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return REFERENCE.exec(value)?.[1];
}

export function canonicalizeTokenTree(tree: TokenTree | undefined): TokenTree {
  const cloned = canonicalizeJson(tree ?? {}) as JsonValue;
  if (!isPlainObject(cloned)) return {};
  return cloned as TokenTree;
}

/**
 * Walk a DTCG document. Groups inherit `$type` and `facadeur.tier`.
 * A token with children, an unknown `$` key, or a value that does not match its type is rejected.
 * References are checked for shape only; the tokens package resolves them.
 */
export function readTokenTree(tree: unknown): TokenIndex {
  if (!isPlainObject(tree)) {
    throw new DocumentError('token-schema', 'Tokens must be a DTCG object');
  }
  const index: TokenIndex = { tokens: new Map(), groups: new Map() };
  walk(tree, [], undefined, undefined, index);
  return index;
}

export function setTokenInTree(tree: TokenTree, path: string, token: TokenDefinition): TokenTree {
  const parts = assertPath(path);
  const next = cloneTree(tree);
  let cursor: Record<string, unknown> = next;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (!key) continue;
    const child = cursor[key];
    const here = parts.slice(0, index + 1).join('.');
    if (child === undefined) {
      const created: TokenTree = {};
      cursor[key] = created;
      cursor = created;
      continue;
    }
    if (!isPlainObject(child) || '$value' in child) {
      throw new DocumentError(
        'token-schema',
        `Token path "${path}" passes through token "${here}"`,
      );
    }
    cursor = child;
  }
  const leaf = parts[parts.length - 1];
  if (!leaf) throw new DocumentError('token-schema', 'Token path must not be empty');
  const existing = cursor[leaf];
  if (isPlainObject(existing) && !('$value' in existing) && hasChild(existing)) {
    throw new DocumentError(
      'token-schema',
      `"${path}" is a group and cannot be replaced by a token`,
    );
  }
  cursor[leaf] = tokenNode(token, path);
  return canonicalizeTokenTree(next);
}

export function removeTokenFromTree(tree: TokenTree, path: string): TokenTree {
  const parts = assertPath(path);
  const next = cloneTree(tree);
  const parent = parentOf(next, parts);
  const leaf = parts[parts.length - 1];
  if (!leaf) throw new DocumentError('token-schema', 'Token path must not be empty');
  const existing = parent[leaf];
  if (!isPlainObject(existing) || !('$value' in existing)) {
    const kind = isPlainObject(existing) ? 'a group' : 'missing';
    throw new DocumentError(
      'token-missing',
      kind === 'missing' ? `Token "${path}" does not exist` : `"${path}" is a group, not a token`,
    );
  }
  delete parent[leaf];
  pruneEmpty(next, parts.slice(0, -1));
  return canonicalizeTokenTree(next);
}

export function setGroupInTree(
  tree: TokenTree,
  path: string,
  group: TokenGroupDefinition,
): TokenTree {
  const next = cloneTree(tree);
  const node = path === '' ? next : ensureGroup(next, assertPath(path));
  if ('$value' in node) {
    throw new DocumentError('token-schema', `"${path}" is a token, not a group`);
  }
  writeGroupMeta(node, group, path || '(root)');
  return canonicalizeTokenTree(next);
}

export function removeGroupFromTree(tree: TokenTree, path: string): TokenTree {
  const parts = assertPath(path);
  const next = cloneTree(tree);
  const parent = parentOf(next, parts);
  const leaf = parts[parts.length - 1];
  if (!leaf || !isPlainObject(parent[leaf]) || '$value' in (parent[leaf] as object)) {
    throw new DocumentError('token-missing', `Token group "${path}" does not exist`);
  }
  delete parent[leaf];
  pruneEmpty(next, parts.slice(0, -1));
  return canonicalizeTokenTree(next);
}

function walk(
  node: Record<string, unknown>,
  parts: string[],
  inheritedType: TokenType | undefined,
  inheritedTier: TokenTier | undefined,
  index: TokenIndex,
): void {
  const path = parts.join('.');
  const where = path || '(root)';
  rejectUnknownReserved(node, where);
  const explicitType = readType(node.$type, where);
  const tier = readTier(node.$extensions, where) ?? inheritedTier;
  const type = explicitType ?? inheritedType;
  const description = readDescription(node.$description, where);
  const deprecated = readDeprecated(node.$deprecated, where);
  const children = childEntries(node, where);
  const isToken = '$value' in node;

  if (isToken && children.length) {
    const child = children[0]?.[0] ?? 'child';
    throw new DocumentError('token-schema', `Token "${where}" cannot contain child "${child}"`);
  }
  if (!isToken && hasGroupBreakpoints(node.$extensions)) {
    throw new DocumentError('token-schema', `Group "${where}" cannot set breakpoint values`);
  }
  if (isToken) {
    if (!path) {
      throw new DocumentError('token-schema', 'The token file root must be a group, not a token');
    }
    if (!type) {
      throw new DocumentError('token-type', `Token "${path}" has no $type`);
    }
    const value = node.$value as JsonValue;
    if (!isJsonValue(value) || value === null) {
      throw new DocumentError('token-type', `Token "${path}" has a value that is not JSON`);
    }
    assertTokenValue(type, value, path);
    const breakpoints = readBreakpoints(node.$extensions, path);
    for (const [breakpoint, override] of Object.entries(breakpoints)) {
      assertBreakpointValue(type, override, path, breakpoint);
    }
    const token: IndexedToken = { path, type, value, breakpoints };
    if (tier) token.tier = tier;
    if (description !== undefined) token.description = description;
    if (deprecated !== undefined) token.deprecated = deprecated;
    index.tokens.set(path, token);
    return;
  }

  if (explicitType || tier || description !== undefined) {
    const group: IndexedGroup = { path };
    if (explicitType) group.type = explicitType;
    if (tier) group.tier = tier;
    if (description !== undefined) group.description = description;
    index.groups.set(path, group);
  }
  for (const [key, child] of children) {
    if (!isPlainObject(child)) {
      throw new DocumentError('token-schema', `Group "${where}" child "${key}" must be an object`);
    }
    walk(child, [...parts, key], type, tier, index);
  }
}

function childEntries(node: Record<string, unknown>, where: string): [string, unknown][] {
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

function rejectUnknownReserved(node: Record<string, unknown>, where: string): void {
  for (const key of Object.keys(node)) {
    if (key.startsWith('$') && !RESERVED.has(key)) {
      throw new DocumentError('token-schema', `Token "${where}" has unknown property "${key}"`);
    }
  }
}

function readType(value: unknown, where: string): TokenType | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !tokenTypes.includes(value as TokenType)) {
    throw new DocumentError(
      'token-type',
      `Unknown token type "${String(value)}" on "${where}" (expected ${tokenTypes.join(', ')})`,
    );
  }
  return value as TokenType;
}

function readTier(extensions: unknown, where: string): TokenTier | undefined {
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
  return facadeur.tier as TokenTier;
}

function readBreakpoints(extensions: unknown, path: string): Record<string, JsonValue> {
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

function readDescription(value: unknown, where: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new DocumentError('token-schema', `"${where}" $description must be a string`);
  }
  return value;
}

function readDeprecated(value: unknown, where: string): boolean | string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  throw new DocumentError('token-schema', `"${where}" $deprecated must be a boolean or a string`);
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

function assertBreakpointValue(
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

function assertTypography(
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

function malformedReference(value: string): boolean {
  return (value.includes('{') || value.includes('}')) && !tokenReference(value);
}

function assertPath(path: string): string[] {
  if (!path) throw new DocumentError('token-schema', 'Token path must not be empty');
  const parts = path.split('.');
  for (const part of parts) {
    if (!TOKEN_SEGMENT.test(part)) {
      throw new DocumentError(
        'token-schema',
        `Token path "${path}" has an invalid segment "${part}"`,
      );
    }
  }
  return parts;
}

function tokenNode(token: TokenDefinition, path: string): TokenTree {
  if (!isJsonValue(token.$value) || token.$value === null) {
    throw new DocumentError('token-type', `Token "${path}" has a value that is not JSON`);
  }
  const node: TokenTree = { $value: token.$value };
  if (token.$type !== undefined) {
    if (!tokenTypes.includes(token.$type)) {
      throw new DocumentError('token-type', `Unknown token type "${token.$type}"`);
    }
    node.$type = token.$type;
  }
  if (token.$description !== undefined) {
    if (typeof token.$description !== 'string') {
      throw new DocumentError('token-schema', `Token "${path}" $description must be a string`);
    }
    node.$description = token.$description;
  }
  if (token.$deprecated !== undefined) {
    if (typeof token.$deprecated !== 'boolean' && typeof token.$deprecated !== 'string') {
      throw new DocumentError(
        'token-schema',
        `Token "${path}" $deprecated must be a boolean or a string`,
      );
    }
    node.$deprecated = token.$deprecated;
  }
  if (token.$extensions !== undefined) {
    node.$extensions = extensionNode(token.$extensions, path);
  }
  return node;
}

function writeGroupMeta(
  node: Record<string, unknown>,
  group: TokenGroupDefinition,
  where: string,
): void {
  if (group.$type === undefined) delete node.$type;
  else {
    if (!tokenTypes.includes(group.$type)) {
      throw new DocumentError('token-type', `Unknown token type "${group.$type}"`);
    }
    node.$type = group.$type;
  }
  if (group.$description === undefined) delete node.$description;
  else node.$description = group.$description;
  if (group.$deprecated === undefined) delete node.$deprecated;
  else node.$deprecated = group.$deprecated;
  if (group.$extensions === undefined) delete node.$extensions;
  else node.$extensions = extensionNode(group.$extensions, where);
  const facadeur = group.$extensions?.facadeur;
  if (isPlainObject(facadeur) && 'breakpoints' in facadeur) {
    throw new DocumentError('token-schema', `Group "${where}" cannot set breakpoint values`);
  }
}

function extensionNode(extensions: Record<string, JsonValue>, where: string): JsonValue {
  if (!isJsonValue(extensions) || !isPlainObject(extensions)) {
    throw new DocumentError('token-schema', `"${where}" $extensions must be an object`);
  }
  return canonicalizeJson(extensions);
}

function ensureGroup(tree: TokenTree, parts: string[]): Record<string, unknown> {
  let cursor: Record<string, unknown> = tree;
  for (const key of parts) {
    const child = cursor[key];
    const here = key;
    if (child === undefined) {
      const created: TokenTree = {};
      cursor[key] = created;
      cursor = created;
      continue;
    }
    if (!isPlainObject(child) || '$value' in child) {
      throw new DocumentError('token-schema', `Token group path passes through token "${here}"`);
    }
    cursor = child;
  }
  return cursor;
}

function parentOf(tree: TokenTree, parts: string[]): Record<string, unknown> {
  let cursor: Record<string, unknown> = tree;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (!key) continue;
    const child = cursor[key];
    if (!isPlainObject(child)) {
      throw new DocumentError('token-missing', `Token "${parts.join('.')}" does not exist`);
    }
    cursor = child;
  }
  return cursor;
}

function pruneEmpty(tree: TokenTree, parts: string[]): void {
  if (!parts.length) return;
  const parent = parentOf(tree, parts);
  const leaf = parts[parts.length - 1];
  if (!leaf) return;
  const node = parent[leaf];
  if (isPlainObject(node) && !hasChild(node) && !hasMeta(node)) {
    delete parent[leaf];
    pruneEmpty(tree, parts.slice(0, -1));
  }
}

function hasGroupBreakpoints(extensions: unknown): boolean {
  return (
    isPlainObject(extensions) &&
    isPlainObject(extensions.facadeur) &&
    extensions.facadeur.breakpoints !== undefined
  );
}

function hasChild(node: Record<string, unknown>): boolean {
  return Object.keys(node).some((key) => !key.startsWith('$'));
}

function hasMeta(node: Record<string, unknown>): boolean {
  return Object.keys(node).some((key) => key.startsWith('$'));
}

function cloneTree(tree: TokenTree): TokenTree {
  return structuredClone(tree);
}
