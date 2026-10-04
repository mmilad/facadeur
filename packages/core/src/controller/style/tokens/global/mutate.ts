import { DocumentError } from '../../../../document/errors.js';
import {
  canonicalizeJson,
  isJsonValue,
  isPlainObject,
  type JsonValue,
} from '../../../../document/json.js';
import { tokenTypes } from '../../../../document/schema.js';
import type { TokenDefinition, TokenGroupDefinition, TokenTree } from '../types.js';

import { TOKEN_SEGMENT } from '../syntax.js';

export function assertPath(path: string) {
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

export function tokenNode(token: TokenDefinition, path: string) {
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

export function writeGroupMeta(
  node: Record<string, unknown>,
  group: TokenGroupDefinition,
  where: string,
) {
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

function extensionNode(extensions: Record<string, JsonValue>, where: string) {
  if (!isJsonValue(extensions) || !isPlainObject(extensions)) {
    throw new DocumentError('token-schema', `"${where}" $extensions must be an object`);
  }
  return canonicalizeJson(extensions);
}

export function ensureGroup(tree: TokenTree, parts: string[]) {
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

export function parentOf(tree: TokenTree, parts: string[]) {
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

export function pruneEmpty(tree: TokenTree, parts: string[]): void {
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

export function hasChild(node: Record<string, unknown>) {
  return Object.keys(node).some((key) => !key.startsWith('$'));
}

function hasMeta(node: Record<string, unknown>) {
  return Object.keys(node).some((key) => key.startsWith('$'));
}

export function cloneTree(tree: TokenTree) {
  return structuredClone(tree);
}
