import type { DesignTokenValueType, FontFamilyDefinition } from '@facadeur/domain';
import { tokenReferenceValue } from '../syntax';
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

function isFontFamilyToken(token: IndexedToken): token is IndexedToken & FontFamilyDefinition {
  return token.family === 'font' && token.valueType === 'fontFamily';
}
