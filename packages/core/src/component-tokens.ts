import { DocumentError } from './document/errors.js';
import { tokenTypeSchema, type TokenType } from './document/schemas/schema-fonts.js';
import { Value } from '@sinclair/typebox/value';

export interface ComponentToken {
  type: TokenType;
  value: string;
}

export type ComponentTokenMap = Record<string, ComponentToken>;

const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;
const SINGLE_REF = /^\{([a-z][a-z0-9]*(?:\.[a-z0-9]+)*)\}$/;

export function componentTokenPublicPath(documentId: string, localPath: string): string {
  if (!TOKEN_PATH.test(localPath)) {
    throw new DocumentError('schema', `Invalid component token path "${localPath}"`);
  }
  return `${documentId}.${localPath}`;
}

/** Validates a default before `setComponentToken`; `globalPaths` comes from the design token index. */
export function assertComponentTokenDefault(
  value: string,
  globalPaths: ReadonlySet<string>,
): void {
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
      throw new DocumentError('schema', `Unknown global token "{${ref}}" in component token default`);
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

export function globalRefInComponentTokenDefault(value: string): string | undefined {
  const match = value.match(SINGLE_REF);
  return match?.[1];
}

export function isLocalComponentTokenPath(
  doc: { componentTokens?: ComponentTokenMap },
  path: string,
): boolean {
  return doc.componentTokens?.[path] !== undefined;
}

export function parseComponentToken(value: unknown): ComponentToken {
  if (!Value.Check(tokenTypeSchema, (value as ComponentToken)?.type)) {
    throw new DocumentError('schema', 'Component token type is invalid');
  }
  const record = value as ComponentToken;
  if (typeof record.value !== 'string' || record.value.length === 0) {
    throw new DocumentError('schema', 'Component token value must be a non-empty string');
  }
  return { type: record.type, value: record.value };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseComponentTokens(value: unknown): ComponentTokenMap | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new DocumentError('schema', 'componentTokens must be an object');
  }
  const record = value as Record<string, unknown>;
  const next: ComponentTokenMap = {};
  for (const path of Object.keys(record).sort()) {
    if (!TOKEN_PATH.test(path)) {
      throw new DocumentError('schema', `Invalid component token path "${path}"`);
    }
    next[path] = parseComponentToken(record[path]);
  }
  if (!Object.keys(next).length) {
    throw new DocumentError('schema', 'componentTokens must not be empty');
  }
  return next;
}

export function canonicalizeComponentTokens(
  value: ComponentTokenMap | undefined,
): ComponentTokenMap | undefined {
  if (!value) return undefined;
  return parseComponentTokens(value);
}

export function assertComponentTokenKind(kind: string): void {
  if (kind === 'page') {
    throw new DocumentError('schema', 'Page documents cannot define component tokens');
  }
  if (kind !== 'atom' && kind !== 'component' && kind !== 'section') {
    throw new DocumentError('schema', `${kind} documents cannot define component tokens`);
  }
}
