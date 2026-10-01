import {
  assertComponentTokenDefault,
  assertComponentTokenKind,
  parseComponentToken,
  type ComponentToken,
} from '../component-tokens.js';
import { DocumentError } from '../document/errors.js';
import type { FlatDocument } from '../document/flat.js';
import { adoptTokenReads } from './token-reads.js';

const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;

export function setComponentToken(
  doc: FlatDocument,
  path: string,
  token: ComponentToken,
  globalPaths: ReadonlySet<string>,
): void {
  assertComponentTokenKind(doc.kind);
  if (!TOKEN_PATH.test(path)) {
    throw new DocumentError('schema', `Invalid component token path "${path}"`);
  }
  const next = parseComponentToken(token);
  assertComponentTokenDefault(next.value, globalPaths);
  doc.componentTokens = { ...(doc.componentTokens ?? {}), [path]: next };
  adoptTokenReads(doc);
}

export function removeComponentToken(doc: FlatDocument, path: string): void {
  if (!doc.componentTokens?.[path]) {
    throw new DocumentError('schema', `Component token "${path}" is not defined`);
  }
  const { [path]: _removed, ...rest } = doc.componentTokens;
  if (Object.keys(rest).length) doc.componentTokens = rest;
  else delete doc.componentTokens;
}
