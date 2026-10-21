import type { DesignTokenValueType, FontFamilyDefinition } from '@facadeur/domain';
import { tokenReference, tokenReferenceValue } from '../syntax';
import { refsInText } from '../../references/text';
import { readTokenTree } from './tree';
import type { IndexedToken } from '../types';

/** UUID references for tokens with a given value type, sorted for stable UI options. */
export function tokenReferencesByType(tree: unknown, type: DesignTokenValueType) {
  return [...readTokenTree(tree).tokens.values()]
    .filter((token) => token.type === type)
    .map((token) => tokenReferenceValue(token.uuid))
    .sort((left, right) => left.localeCompare(right));
}

/** Font-family records in the token tree, retaining the index's deterministic family order. */
export function fontFamilyTokens(tree: unknown) {
  return [...readTokenTree(tree).tokens.values()].filter(isFontFamilyToken);
}

/** Return a cloned indexed token from a serialized token tree by UUID. */
export function tokenByUuid(tree: unknown, uuid: string) {
  const token = readTokenTree(tree).tokens.get(uuid);
  return token ? structuredClone(token) : undefined;
}

/** Resolve a token reference string to a cloned indexed token, if it is valid. */
export function tokenByReference(tree: unknown, value: unknown) {
  const uuid = tokenReference(value);
  return uuid ? tokenByUuid(tree, uuid) : undefined;
}

/** Sorted token paths whose values or breakpoint overrides reference the requested UUID. */
export function tokenReferencePaths(tree: unknown, uuid: string) {
  const paths: string[] = [];
  const contains = (value: unknown): boolean => {
    if (typeof value === 'string') return refsInText(value).includes(uuid);
    if (Array.isArray(value)) return value.some(contains);
    if (value && typeof value === 'object') return Object.values(value).some(contains);
    return false;
  };
  for (const token of readTokenTree(tree).tokens.values()) {
    if (
      contains(token.value) ||
      Object.values(token.breakpoints).some((value) => contains(value))
    ) {
      paths.push(token.path);
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function isFontFamilyToken(token: IndexedToken): token is IndexedToken & FontFamilyDefinition {
  return token.family === 'font' && token.valueType === 'fontFamily';
}
