import {
  readTokenTree,
  tokenReferenceValue,
  type ComponentToken,
  type FlatDocument,
  type FontFamily,
  type IndexedToken,
} from '@facadeur/core';

import { readComponentTokens } from './component-tokens';

/** Global dimension tokens as UUID references, for gap, padding, and margin. */
export function dimensionTokenRefs(tree: unknown): string[] {
  return tokenRefsByType(tree, 'dimension');
}

/** Global radius-family tokens as UUID references. */
export function radiusTokenRefs(tree: unknown): string[] {
  return [...readTokenTree(tree).tokens.values()]
    .filter((token) => token.family === 'radius')
    .map((token) => tokenReferenceValue(token.uuid))
    .sort((left, right) => left.localeCompare(right));
}

/** Global color tokens as UUID references for style and token editors. */
export function colorTokenRefs(tree: unknown): string[] {
  return tokenRefsByType(tree, 'color');
}

/** Global typography tokens as UUID references. */
export function typographyTokenRefs(tree: unknown): string[] {
  return tokenRefsByType(tree, 'typography');
}

export function shadowTokenRefs(tree: unknown): string[] {
  return tokenRefsByType(tree, 'shadow');
}

export function fontFamilyTokenRefs(tree: unknown): string[] {
  return tokenRefsByType(tree, 'fontFamily');
}

export function fontWeightTokenRefs(tree: unknown): string[] {
  return tokenRefsByType(tree, 'fontWeight');
}

export function numberTokenRefs(tree: unknown): string[] {
  return tokenRefsByType(tree, 'number');
}

export function tokenRefsByType(tree: unknown, type?: string): string[] {
  const index = readTokenTree(tree);
  return [...index.tokens.values()]
    .filter((token) => token.type === type)
    .map((token) => tokenReferenceValue(token.uuid))
    .sort((left, right) => left.localeCompare(right));
}

export function fontFamilies(tree: unknown): FontFamily[] {
  return [...readTokenTree(tree).tokens.values()].filter(isFontFamily);
}

function isFontFamily(token: IndexedToken): token is IndexedToken & FontFamily {
  return token.family === 'font' && token.valueType === 'fontFamily';
}

function componentTokenRefsByType(
  tokens: Readonly<Record<string, ComponentToken>> | undefined,
  type: string,
): string[] {
  if (!tokens) return [];
  return Object.values(tokens)
    .filter((token) => token.type === type)
    .map((token) => `{${token.path}}`)
    .sort((left, right) => left.localeCompare(right));
}

function mergeTokenRefLists(...lists: readonly string[][]): string[] {
  return [...new Set(lists.flat())].sort((left, right) => left.localeCompare(right));
}

/** Global design tokens plus local component tokens for the open document. */
export function colorTokenRefsForDocument(designTree: unknown, doc: FlatDocument): string[] {
  return mergeTokenRefLists(
    colorTokenRefs(designTree),
    componentTokenRefsByType(readComponentTokens(doc), 'color'),
  );
}

export function shadowTokenRefsForDocument(designTree: unknown, doc: FlatDocument): string[] {
  return mergeTokenRefLists(
    shadowTokenRefs(designTree),
    componentTokenRefsByType(readComponentTokens(doc), 'shadow'),
  );
}

export function typographyTokenRefsForDocument(designTree: unknown, doc: FlatDocument): string[] {
  return mergeTokenRefLists(
    typographyTokenRefs(designTree),
    componentTokenRefsByType(readComponentTokens(doc), 'typography'),
  );
}

export function dimensionTokenRefsForDocument(designTree: unknown, doc: FlatDocument): string[] {
  return mergeTokenRefLists(
    dimensionTokenRefs(designTree),
    componentTokenRefsByType(readComponentTokens(doc), 'dimension'),
  );
}

export function radiusTokenRefsForDocument(designTree: unknown, doc: FlatDocument): string[] {
  const globalRadius = radiusTokenRefs(designTree);
  const localDimension = componentTokenRefsByType(readComponentTokens(doc), 'dimension').filter(
    (ref) => ref.startsWith('{radius.'),
  );
  const merged = mergeTokenRefLists(globalRadius, localDimension);
  return merged.length ? merged : dimensionTokenRefsForDocument(designTree, doc);
}

export function fontFamilyTokenRefsForDocument(designTree: unknown, doc: FlatDocument): string[] {
  return mergeTokenRefLists(
    fontFamilyTokenRefs(designTree),
    componentTokenRefsByType(readComponentTokens(doc), 'fontFamily'),
  );
}

export function fontWeightTokenRefsForDocument(designTree: unknown, doc: FlatDocument): string[] {
  return mergeTokenRefLists(
    fontWeightTokenRefs(designTree),
    componentTokenRefsByType(readComponentTokens(doc), 'fontWeight'),
  );
}

export function numberTokenRefsForDocument(designTree: unknown, doc: FlatDocument): string[] {
  return mergeTokenRefLists(
    numberTokenRefs(designTree),
    componentTokenRefsByType(readComponentTokens(doc), 'number'),
  );
}
