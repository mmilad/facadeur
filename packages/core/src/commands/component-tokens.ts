import {
  assertComponentTokenDefault,
  assertComponentTokenKind,
  parseComponentTokenBody,
  type ComponentToken,
} from '../component-tokens.js';
import { DocumentError } from '../document/errors.js';
import type { FlatDocument } from '../document/flat.js';
import { ID_PATTERN } from '../document/ids.js';
import { adoptTokenReads } from './token-reads.js';
import { rewriteLocalComponentTokenPath } from './component-token-rewrite.js';

const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;

function assertTokenId(id: string): void {
  if (!ID_PATTERN.test(id)) {
    throw new DocumentError('schema', `Invalid component token id "${id}"`);
  }
}

function assertPathAvailable(doc: FlatDocument, path: string, exceptId: string | null): void {
  if (!TOKEN_PATH.test(path)) {
    throw new DocumentError('schema', `Invalid component token path "${path}"`);
  }
  for (const [id, token] of Object.entries(doc.componentTokens ?? {})) {
    if (id === exceptId) continue;
    if (token.path === path) {
      throw new DocumentError('schema', `Local token "${path}" already exists`);
    }
  }
}

export function setComponentToken(
  doc: FlatDocument,
  id: string,
  path: string,
  token: Omit<ComponentToken, 'path'>,
  globalPaths: ReadonlySet<string>,
): void {
  assertComponentTokenKind(doc.kind);
  assertTokenId(id);
  assertPathAvailable(doc, path.trim(), doc.componentTokens?.[id] ? id : null);
  const body = parseComponentTokenBody(token);
  assertComponentTokenDefault(body.value, globalPaths);
  const next: ComponentToken = { path: path.trim(), ...body };
  doc.componentTokens = { ...(doc.componentTokens ?? {}), [id]: next };
  adoptTokenReads(doc);
}

export function removeComponentToken(doc: FlatDocument, id: string): void {
  assertTokenId(id);
  if (!doc.componentTokens?.[id]) {
    throw new DocumentError('schema', `Component token "${id}" is not defined`);
  }
  const { [id]: _removed, ...rest } = doc.componentTokens;
  if (Object.keys(rest).length) doc.componentTokens = rest;
  else delete doc.componentTokens;
}

export function renameComponentTokenPath(
  doc: FlatDocument,
  id: string,
  newPath: string,
  globalPaths: ReadonlySet<string>,
): void {
  assertComponentTokenKind(doc.kind);
  assertTokenId(id);
  const existing = doc.componentTokens?.[id];
  if (!existing) {
    throw new DocumentError('schema', `Component token "${id}" is not defined`);
  }
  const trimmed = newPath.trim();
  if (trimmed === existing.path) return;
  assertPathAvailable(doc, trimmed, id);
  rewriteLocalComponentTokenPath(doc, existing.path, trimmed);
  const updated: ComponentToken = { ...existing, path: trimmed };
  assertComponentTokenDefault(updated.value, globalPaths);
  doc.componentTokens = { ...doc.componentTokens, [id]: updated };
  adoptTokenReads(doc);
}
