import { DocumentError } from '../../../../document/errors';
import { canonicalizeJson, isJsonValue, isPlainObject, type JsonValue } from '../../../../utils';
import { tokenTypes, type TokenType } from '../../../../schema/design-tokens';
import { fontFamilySchema } from '../../../../schema/fonts';
import { assertFont } from '../../fonts';
import { UUID_PATTERN } from '../../../../document/ids';
import type {
  DesignTokenFamily,
  DesignTokenRecord,
  DesignTokenSet,
  DesignTokenUuid,
  FontFamilyDefinition,
} from '@facadeur/domain';
import { Value } from '@sinclair/typebox/value';
import { assertBreakpointValue, assertTokenValue } from './values';
import { tokenCssPropertyName } from './selector';
import type {
  TokenTier,
  TokenTree,
  TokenDefinition,
  IndexedToken,
  IndexedGroup,
  TokenIndex,
} from '../types';

const FAMILIES: readonly DesignTokenFamily[] = ['color', 'space', 'radius', 'shadow', 'type', 'font'];
const TIERS = new Set(['primitive', 'semantic', 'component']);
const UUID_KEY = new RegExp(UUID_PATTERN.source, 'i');

export { assertTokenValue } from './values';

export {
  type TokenTier,
  type TokenTree,
  type TokenDefinition,
  type IndexedToken,
  type IndexedGroup,
  type TokenIndex,
} from '../types';

export function emptyTokenTree(): TokenTree {
  return { color: {}, space: {}, radius: {}, shadow: {}, type: {}, font: {} };
}

export function canonicalizeTokenTree(tree: unknown): TokenTree {
  if (tree === undefined) return emptyTokenTree();
  const index = readTokenTree(tree);
  const next = emptyTokenTree() as Record<DesignTokenFamily, Record<string, DesignTokenRecord>>;
  for (const token of index.tokens.values()) {
    next[token.family] = { ...next[token.family], [token.uuid]: canonicalToken(token) };
  }
  return next as TokenTree;
}

export function readTokenTree(tree: unknown): TokenIndex {
  if (!isPlainObject(tree)) {
    throw new DocumentError('token-schema', 'Tokens must be a UUID-keyed family record');
  }
  for (const family of Object.keys(tree)) {
    if (!FAMILIES.includes(family as DesignTokenFamily)) {
      throw new DocumentError('token-schema', `Unknown token family "${family}"`);
    }
  }

  const index: TokenIndex = { tokens: new Map(), groups: new Map() };
  const selectors = new Map<string, string>();
  for (const family of FAMILIES) {
    const familyTokens = tree[family] ?? {};
    if (!isPlainObject(familyTokens)) {
      throw new DocumentError('token-schema', `Token family "${family}" must be an object`);
    }
    for (const [key, raw] of Object.entries(familyTokens)) {
      const token = parseToken(family, key, raw);
      if (index.tokens.has(token.uuid)) {
        throw new DocumentError('token-schema', `Duplicate token UUID "${token.uuid}"`);
      }
      const selector = tokenCssPropertyName(token.path);
      const duplicate = selectors.get(selector);
      if (duplicate) {
        throw new DocumentError(
          'token-schema',
          `Token "${token.uuid}" collides with "${duplicate}" at generated CSS property "${selector}"`,
        );
      }
      selectors.set(selector, token.uuid);
      index.tokens.set(token.uuid, token);
      if (token.group) {
        const groupKey = `${family}\u0000${token.group}`;
        if (!index.groups.has(groupKey)) {
          index.groups.set(groupKey, {
            family,
            group: token.group,
            path: `${family}.${token.group}`,
            ...(token.tier ? { tier: token.tier } : {}),
          });
        }
      }
    }
  }
  return index;
}

export function setTokenInTree(tree: TokenTree, family: DesignTokenFamily, token: TokenDefinition) {
  const next = structuredClone(tree) as Record<DesignTokenFamily, Record<string, DesignTokenRecord>>;
  next[family][token.uuid] = canonicalToken(parseToken(family, token.uuid, token));
  readTokenTree(next);
  return next as TokenTree;
}

export function removeTokenFromTree(tree: TokenTree, family: DesignTokenFamily, uuid: string) {
  const next = structuredClone(tree) as Record<DesignTokenFamily, Record<string, DesignTokenRecord>>;
  const existing = next[family][uuid];
  if (!existing) throw new DocumentError('token-missing', `Token "${uuid}" does not exist`);
  delete next[family][uuid];
  return next as TokenTree;
}

export function setGroupInTree(
  tree: TokenTree,
  family: DesignTokenFamily,
  from: string,
  group: string,
): TokenTree {
  const next = structuredClone(tree) as Record<DesignTokenFamily, Record<string, DesignTokenRecord>>;
  for (const [uuid, token] of Object.entries(next[family])) {
    if (token.group === from) next[family][uuid] = { ...token, group };
  }
  readTokenTree(next);
  return next as TokenTree;
}

function parseToken(family: DesignTokenFamily, key: string, raw: unknown): IndexedToken {
  if (!UUID_KEY.test(key)) {
    throw new DocumentError('token-schema', `Token key "${key}" must be a UUID`);
  }
  if (!isPlainObject(raw)) {
    throw new DocumentError('token-schema', `Token "${key}" must be an object`);
  }
  const uuid = raw.uuid;
  if (uuid !== key) {
    throw new DocumentError('token-schema', `Token key "${key}" does not match its UUID`);
  }
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  if (!label) throw new DocumentError('token-schema', `Token "${key}" needs a label`);
  if (typeof raw.group !== 'string' || raw.group.trim() !== raw.group) {
    throw new DocumentError('token-schema', `Token "${key}" group must be a trimmed string`);
  }
  if (typeof raw.valueType !== 'string' || !tokenTypes.includes(raw.valueType as TokenType)) {
    throw new DocumentError('token-type', `Token "${key}" has an unknown valueType`);
  }
  if (!isJsonValue(raw.value)) {
    throw new DocumentError('token-type', `Token "${key}" value must be JSON`);
  }

  const valueType = raw.valueType as TokenType;
  const value = canonicalizeJson(raw.value);
  if (family === 'font') {
    if (valueType !== 'fontFamily' || !Value.Check(fontFamilySchema, value)) {
      throw new DocumentError('token-type', `Font token "${key}" has an invalid font-family value`);
    }
    if (raw.breakpoints !== undefined) {
      throw new DocumentError('token-schema', `Font token "${key}" cannot have breakpoint values`);
    }
  } else {
    assertTokenValue(valueType, value, tokenPath(family, raw.group, label));
  }

  const breakpoints: Record<string, JsonValue> = {};
  if (raw.breakpoints !== undefined) {
    if (!isPlainObject(raw.breakpoints)) {
      throw new DocumentError('token-schema', `Token "${key}" breakpoints must be an object`);
    }
    for (const [breakpoint, override] of Object.entries(raw.breakpoints)) {
      if (!UUID_KEY.test(breakpoint)) {
        throw new DocumentError('token-schema', `Token "${key}" has an invalid breakpoint UUID`);
      }
      if (!isJsonValue(override) || override === null) {
        throw new DocumentError('token-type', `Token "${key}" breakpoint value must be JSON`);
      }
      const canonical = canonicalizeJson(override);
      assertBreakpointValue(valueType, canonical, tokenPath(family, raw.group, label), breakpoint);
      breakpoints[breakpoint] = canonical;
    }
  }

  const extensions = raw.extensions;
  if (extensions !== undefined && !isJsonValue(extensions)) {
    throw new DocumentError('token-schema', `Token "${key}" extensions must be JSON`);
  }
  if (extensions !== undefined && !isPlainObject(extensions)) {
    throw new DocumentError('token-schema', `Token "${key}" extensions must be an object`);
  }
  const tier = readTier(extensions, key);
  const record: DesignTokenRecord = {
    uuid: key as DesignTokenUuid,
    label,
    group: raw.group,
    valueType,
    value,
    ...(Object.keys(breakpoints).length ? { breakpoints } : {}),
    ...(extensions ? { extensions: extensions as DesignTokenRecord['extensions'] } : {}),
  };
  if (family === 'font') assertFont(record as unknown as FontFamilyDefinition);
  return {
    ...record,
    family,
    path: tokenPath(family, record.group, label),
    type: valueType,
    ...(tier ? { tier } : {}),
    breakpoints,
  };
}

function canonicalToken(token: IndexedToken): DesignTokenRecord {
  return {
    uuid: token.uuid,
    label: token.label,
    group: token.group,
    valueType: token.valueType,
    value: token.value,
    ...(Object.keys(token.breakpoints).length ? { breakpoints: token.breakpoints } : {}),
    ...(token.extensions ? { extensions: token.extensions } : {}),
  };
}

function tokenPath(family: DesignTokenFamily, group: string, label: string) {
  return [family, group, label].filter(Boolean).join('.');
}

function readTier(extensions: unknown, uuid: string): TokenTier | undefined {
  if (!isPlainObject(extensions) || !isPlainObject(extensions.facadeur)) return undefined;
  const tier = extensions.facadeur.tier;
  if (tier === undefined) return undefined;
  if (typeof tier !== 'string' || !TIERS.has(tier)) {
    throw new DocumentError('token-schema', `Token "${uuid}" tier must be primitive, semantic, or component`);
  }
  return tier as TokenTier;
}
