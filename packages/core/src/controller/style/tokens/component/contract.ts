import { DocumentError } from '../../../../document/errors.js';
import { createId, ID_PATTERN } from '../../../../document/ids.js';
import { isPlainObject } from '../../../../document/json.js';
import { tokenTypeSchema, type TokenType } from '../../../../document/schemas/schema-fonts.js';
import { Value } from '@sinclair/typebox/value';

export interface ComponentToken {
  path: string;
  type: TokenType;
  value: string;
  label?: string;
}

export type ComponentTokenMap = Record<string, ComponentToken>;

export interface ListedComponentToken extends ComponentToken {
  id: string;
}

const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;
const SINGLE_REF = /^\{([a-z][a-z0-9]*(?:\.[a-z0-9]+)*)\}$/;

export function componentTokenPublicPath(documentId: string, localPath: string): string {
  if (!TOKEN_PATH.test(localPath)) {
    throw new DocumentError('schema', `Invalid component token path "${localPath}"`);
  }
  return `${documentId}.${localPath}`;
}

/** Validates a default before `setComponentToken`; `globalPaths` comes from the design token index. */
export function assertComponentTokenDefault(value: string, globalPaths: ReadonlySet<string>): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DocumentError('schema', 'Component token value must be a non-empty string');
  }
  const match = value.match(SINGLE_REF);
  if (match) {
    const ref = match[1];
    if (!ref || !TOKEN_PATH.test(ref)) {
      throw new DocumentError('schema', `Invalid token reference in component token default`);
    }
    if (!globalPaths.has(ref)) {
      throw new DocumentError(
        'schema',
        `Unknown global token "{${ref}}" in component token default`,
      );
    }
    return;
  }
  if (value.includes('{') || value.includes('}')) {
    throw new DocumentError(
      'schema',
      'Component token default must be a literal or a single {global.path} reference',
    );
  }
}

export function globalRefInComponentTokenDefault(value: string) {
  const match = value.match(SINGLE_REF);
  return match?.[1];
}

export function listComponentTokens(map: ComponentTokenMap | undefined): ListedComponentToken[] {
  if (!map) return [];
  return Object.entries(map)
    .map(([id, token]) => ({ id, ...token }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function componentTokenPaths(map: ComponentTokenMap | undefined): Set<string> {
  const paths = new Set<string>();
  if (!map) return paths;
  for (const token of Object.values(map)) {
    paths.add(token.path);
  }
  return paths;
}

export function findComponentTokenByPath(
  doc: { componentTokens?: ComponentTokenMap },
  path: string,
): ListedComponentToken | undefined {
  if (!doc.componentTokens) return undefined;
  for (const [id, token] of Object.entries(doc.componentTokens)) {
    if (token.path === path) return { id, ...token };
  }
  return undefined;
}

export function isLocalComponentTokenPath(
  doc: { componentTokens?: ComponentTokenMap },
  path: string,
): boolean {
  return findComponentTokenByPath(doc, path) !== undefined;
}

/** Path-indexed view for style compilation ({path} references). Accepts legacy path-keyed maps. */
export function componentTokensByPath(
  value: ComponentTokenMap | undefined,
): Record<string, Pick<ComponentToken, 'type' | 'value'>> | undefined {
  const map = value === undefined ? undefined : parseComponentTokens(value);
  if (!map) return undefined;
  const byPath: Record<string, Pick<ComponentToken, 'type' | 'value'>> = {};
  for (const token of Object.values(map)) {
    byPath[token.path] = { type: token.type, value: token.value };
  }
  return byPath;
}

export function parseComponentTokenBody(value: unknown): Omit<ComponentToken, 'path'> {
  if (!Value.Check(tokenTypeSchema, (value as ComponentToken)?.type)) {
    throw new DocumentError('schema', 'Component token type is invalid');
  }
  const record = value as ComponentToken;
  if (typeof record.value !== 'string' || record.value.length === 0) {
    throw new DocumentError('schema', 'Component token value must be a non-empty string');
  }
  const label =
    record.label === undefined
      ? undefined
      : typeof record.label === 'string' && record.label.trim()
        ? record.label.trim()
        : (() => {
            throw new DocumentError('schema', 'Component token label must be a non-empty string');
          })();
  return { type: record.type, value: record.value, ...(label ? { label } : {}) };
}

export function parseComponentToken(value: unknown, path: string): ComponentToken {
  if (!TOKEN_PATH.test(path)) {
    throw new DocumentError('schema', `Invalid component token path "${path}"`);
  }
  return { path, ...parseComponentTokenBody(value) };
}

function isLegacyComponentTokenEntry(key: string, value: unknown) {
  if (!TOKEN_PATH.test(key)) return false;
  if (!isPlainObject(value)) return false;
  return typeof value.path !== 'string';
}

function isLegacyComponentTokens(record: Record<string, unknown>) {
  const keys = Object.keys(record);
  if (!keys.length) return false;
  return keys.every((key) => isLegacyComponentTokenEntry(key, record[key]));
}

export function parseComponentTokens(value: unknown) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    throw new DocumentError('schema', 'componentTokens must be an object');
  }
  const record = value as Record<string, unknown>;
  if (!Object.keys(record).length) {
    throw new DocumentError('schema', 'componentTokens must not be empty');
  }

  if (isLegacyComponentTokens(record)) {
    const next: ComponentTokenMap = {};
    for (const path of Object.keys(record).sort()) {
      const id = createId();
      next[id] = parseComponentToken(record[path], path);
    }
    return next;
  }

  const next: ComponentTokenMap = {};
  for (const id of Object.keys(record).sort()) {
    if (!ID_PATTERN.test(id)) {
      throw new DocumentError('schema', `Invalid component token id "${id}"`);
    }
    const raw = record[id];
    if (!isPlainObject(raw) || typeof raw.path !== 'string') {
      throw new DocumentError('schema', `Component token "${id}" must include a path`);
    }
    next[id] = parseComponentToken(raw, raw.path.trim());
  }
  return next;
}

export function canonicalizeComponentTokens(value: ComponentTokenMap | undefined) {
  if (!value) return undefined;
  return parseComponentTokens(value);
}

export function assertComponentTokenKind(kind: string) {
  if (kind === 'page') {
    throw new DocumentError('schema', 'Page documents cannot define component tokens');
  }
  if (kind !== 'atom' && kind !== 'component' && kind !== 'section') {
    throw new DocumentError('schema', `${kind} documents cannot define component tokens`);
  }
}
