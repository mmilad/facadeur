import { DocumentError } from '../../../../document/errors.js';
import { canonicalizeJson, isJsonValue, isPlainObject, type JsonValue } from '../../../../utils.js';
import type { TokenType } from '../../../../schema/document.js';
import {
  assertPath,
  cloneTree,
  ensureGroup,
  hasChild,
  parentOf,
  pruneEmpty,
  tokenNode,
  writeGroupMeta,
} from './mutate.js';
import {
  childEntries,
  hasGroupBreakpoints,
  readBreakpoints,
  readDeprecated,
  readDescription,
  readLabel,
  readTier,
  readType,
  rejectUnknownReserved,
} from './read.js';
import { assertBreakpointValue, assertTokenValue } from './values.js';
import type {
  TokenTier,
  TokenTree,
  TokenDefinition,
  TokenGroupDefinition,
  IndexedToken,
  IndexedGroup,
  TokenIndex,
} from '../types.js';

export { assertTokenValue } from './values.js';

export { TOKEN_SEGMENT, tokenReference } from '../syntax.js';
export type {
  TokenTier,
  TokenTree,
  TokenDefinition,
  TokenGroupDefinition,
  IndexedToken,
  IndexedGroup,
  TokenIndex,
} from '../types.js';

export function canonicalizeTokenTree(tree: TokenTree | undefined) {
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

export function setTokenInTree(tree: TokenTree, path: string, token: TokenDefinition) {
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

export function removeTokenFromTree(tree: TokenTree, path: string) {
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

export function setGroupInTree(tree: TokenTree, path: string, group: TokenGroupDefinition) {
  const next = cloneTree(tree);
  const node = path === '' ? next : ensureGroup(next, assertPath(path));
  if ('$value' in node) {
    throw new DocumentError('token-schema', `"${path}" is a token, not a group`);
  }
  writeGroupMeta(node, group, path || '(root)');
  return canonicalizeTokenTree(next);
}

export function removeGroupFromTree(tree: TokenTree, path: string) {
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
    const label = readLabel(node.$extensions, path);
    const token: IndexedToken = { path, type, value, breakpoints };
    if (label !== undefined) token.label = label;
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
