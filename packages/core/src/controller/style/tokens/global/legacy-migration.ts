import type {
  Breakpoint,
  DesignTokenFamily,
  DesignTokenRecord,
  DesignTokenSet,
  DesignTokenUuid,
} from '@facadeur/domain';
import { DocumentError } from '../../../../document/errors';
import { UUID_PATTERN } from '../../../../document/ids';
import { canonicalizeJson, isJsonValue, isPlainObject } from '../../../../utils';
import { defaultBreakpoints } from '../../../../schema/document';
import { tokenReferenceValue } from '../syntax';
import { emptyTokenTree, readTokenTree } from './tree';

const FAMILIES = new Set<DesignTokenFamily>(['color', 'space', 'radius', 'shadow', 'type', 'font']);
const TOKEN_TYPES = new Set([
  'color',
  'dimension',
  'number',
  'fontFamily',
  'fontWeight',
  'shadow',
  'typography',
]);
const UUID = new RegExp(UUID_PATTERN.source, 'i');
const LEGACY_REFERENCE = /\{([a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)+)\}/gi;

interface LegacyTokenEntry {
  family: DesignTokenFamily;
  path: string;
  group: string;
  label: string;
  uuid: DesignTokenUuid;
  valueType: DesignTokenRecord['valueType'];
  value: unknown;
  breakpoints: Record<string, unknown>;
  extensions?: DesignTokenRecord['extensions'];
}

export interface LegacyDesignLibraryMigration {
  tokens?: DesignTokenSet;
  breakpoints?: Breakpoint[];
  tokenIds: ReadonlyMap<string, string>;
  breakpointIds: ReadonlyMap<string, string>;
}

/** Convert legacy DTCG trees, font arrays, and breakpoint ids once at their read boundary. */
export function migrateLegacyDesignLibraries(input: {
  tokens?: unknown;
  fonts?: unknown;
  breakpoints?: unknown;
}): LegacyDesignLibraryMigration {
  const legacyTokens = isDtcgTree(input.tokens);
  const legacyFonts = Array.isArray(input.fonts);
  const legacyBreakpoints = isLegacyBreakpoints(input.breakpoints);
  const breakpoints = legacyBreakpoints ? migrateBreakpoints(input.breakpoints) : undefined;
  const breakpointIds = breakpointIdMap(input.breakpoints, breakpoints ?? defaultBreakpoints);
  const tokenIds = new Map<string, string>();

  if (!legacyTokens && !legacyFonts && !legacyBreakpoints) {
    if (input.tokens !== undefined) tokenIdsFromCanonical(input.tokens, tokenIds);
    return {
      ...(input.tokens !== undefined ? { tokens: input.tokens as DesignTokenSet } : {}),
      ...(input.breakpoints !== undefined
        ? { breakpoints: input.breakpoints as Breakpoint[] }
        : {}),
      tokenIds,
      breakpointIds,
    };
  }

  let tokens: DesignTokenSet | undefined;
  if (legacyTokens) {
    tokens = migrateDtcgTokens(input.tokens, input.fonts, breakpointIds, tokenIds);
  } else if (legacyFonts) {
    tokens = migrateCanonicalTokensWithFonts(input.tokens, input.fonts, tokenIds);
  } else if (input.tokens !== undefined) {
    tokens = input.tokens as DesignTokenSet;
    tokenIdsFromCanonical(tokens, tokenIds);
  }

  return {
    ...(tokens ? { tokens } : {}),
    ...(breakpoints ? { breakpoints } : {}),
    tokenIds,
    breakpointIds,
  };
}

/** Rewrite references and breakpoint-layer keys throughout a document/catalog object. */
export function migrateLegacyReferenceLocations<T>(
  value: T,
  tokenIds: ReadonlyMap<string, string>,
  breakpointIds: ReadonlyMap<string, string>,
): T {
  return migrateNested(value, tokenIds, breakpointIds) as T;
}

/** Avoid cloning canonical data unless it contains a path reference or breakpoint key to migrate. */
export function hasLegacyReferenceLocations(
  value: unknown,
  tokenIds: ReadonlyMap<string, string>,
  breakpointIds: ReadonlyMap<string, string>,
): boolean {
  if (typeof value === 'string') {
    return [...value.matchAll(LEGACY_REFERENCE)].some(([, path]) => {
      if (!path) return false;
      const uuid = tokenIds.get(path) ?? tokenIds.get(path.toLowerCase());
      return uuid !== undefined;
    });
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasLegacyReferenceLocations(item, tokenIds, breakpointIds));
  }
  if (!isPlainObject(value)) return false;
  for (const [property, item] of Object.entries(value)) {
    if (
      property === 'tokenInterface' &&
      isPlainObject(item) &&
      isPlainObject(item.sets) &&
      Object.keys(item.sets).some((path) => tokenIds.has(path) || tokenIds.has(path.toLowerCase()))
    ) {
      return true;
    }
    if (
      property === 'reads' &&
      Array.isArray(item) &&
      item.some(
        (path) =>
          typeof path === 'string' && (tokenIds.has(path) || tokenIds.has(path.toLowerCase())),
      )
    ) {
      return true;
    }
    if (property === 'breakpoints' && isPlainObject(item)) {
      for (const uuid of Object.keys(item)) {
        const migrated = breakpointIds.get(uuid) ?? legacyBreakpointUuid(uuid);
        if (migrated !== uuid) return true;
      }
    }
    if (hasLegacyReferenceLocations(item, tokenIds, breakpointIds)) return true;
  }
  return false;
}

export function isDtcgTree(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  return Object.values(value).some(
    (entry) => isPlainObject(entry) && ('$value' in entry || hasDtcgNode(entry)),
  );
}

export function legacyTokenUuid(path: string): DesignTokenUuid {
  return stableUuid(`token:${path}`);
}

export function legacyFontUuid(id: string): DesignTokenUuid {
  return UUID.test(id) ? (id as DesignTokenUuid) : stableUuid(`font:${id}`);
}

export function legacyBreakpointUuid(id: string): string {
  return UUID.test(id) ? id : stableUuid(`breakpoint:${id}`);
}

function migrateBreakpoints(value: unknown): Breakpoint[] {
  const source = Array.isArray(value) && value.length ? value : defaultBreakpoints;
  return source.map((item, index) => {
    if (!isPlainObject(item))
      throw new DocumentError('schema', `Breakpoint ${index} must be an object`);
    const oldId = typeof item.id === 'string' ? item.id : undefined;
    const uuid =
      typeof item.uuid === 'string' && UUID.test(item.uuid)
        ? item.uuid
        : oldId
          ? legacyBreakpointUuid(oldId)
          : legacyBreakpointUuid(`position-${index}-${String(item.minWidth)}`);
    const label =
      typeof item.label === 'string' && item.label.trim()
        ? item.label.trim()
        : oldId
          ? displayName(oldId)
          : `Viewport ${index + 1}`;
    if (typeof item.minWidth !== 'number') {
      throw new DocumentError('schema', `Breakpoint "${oldId ?? uuid}" needs a min-width`);
    }
    return {
      uuid,
      label,
      minWidth: item.minWidth,
      ...(item.enabled === false ? { enabled: false } : {}),
    };
  });
}

function migrateDtcgTokens(
  value: unknown,
  fontsValue: unknown,
  breakpointIds: ReadonlyMap<string, string>,
  tokenIds: Map<string, string>,
): DesignTokenSet {
  if (!isPlainObject(value)) return emptyTokenTree();
  const entries: LegacyTokenEntry[] = [];
  for (const [familyName, node] of Object.entries(value)) {
    if (!FAMILIES.has(familyName as DesignTokenFamily) || !isPlainObject(node)) {
      throw new DocumentError('token-schema', `Unknown legacy token family "${familyName}"`);
    }
    walkDtcg(node, [familyName], undefined, entries);
  }

  const fontRecords = readLegacyFontRecords(fontsValue);
  for (const entry of entries) setTokenPathId(tokenIds, entry.path, entry.uuid);
  for (const font of fontRecords)
    setTokenPathId(tokenIds, `font.${font.id}`, legacyFontUuid(font.id));

  const next = emptyTokenTree() as Record<DesignTokenFamily, Record<string, DesignTokenRecord>>;
  for (const entry of entries) {
    const record: DesignTokenRecord = {
      uuid: entry.uuid,
      label: entry.label,
      group: entry.group,
      valueType: entry.valueType,
      value: migrateNested(entry.value, tokenIds, breakpointIds) as DesignTokenRecord['value'],
      ...(Object.keys(entry.breakpoints).length
        ? {
            breakpoints: mapBreakpointOverrides(
              entry.breakpoints,
              breakpointIds,
              entry.path,
              tokenIds,
            ),
          }
        : {}),
      ...(entry.extensions ? { extensions: entry.extensions } : {}),
    };
    next[entry.family][record.uuid] = record;
  }
  for (const font of fontRecords) {
    const uuid = tokenIds.get(`font.${font.id}`);
    if (!uuid) continue;
    next.font[uuid] = {
      uuid: uuid as DesignTokenUuid,
      label: font.label,
      group: '',
      valueType: 'fontFamily',
      value: font.value as DesignTokenRecord['value'],
    };
  }
  readTokenTree(next);
  return next as unknown as DesignTokenSet;
}

function migrateCanonicalTokensWithFonts(
  value: unknown,
  fontsValue: unknown,
  tokenIds: Map<string, string>,
): DesignTokenSet {
  const tokens = value === undefined ? emptyTokenTree() : structuredClone(value as DesignTokenSet);
  const next = tokens as Record<DesignTokenFamily, Record<string, DesignTokenRecord>>;
  tokenIdsFromCanonical(tokens, tokenIds);
  for (const font of readLegacyFontRecords(fontsValue)) {
    const uuid = legacyFontUuid(font.id);
    setTokenPathId(tokenIds, `font.${font.id}`, uuid);
    next.font[uuid] = {
      uuid,
      label: font.label,
      group: '',
      valueType: 'fontFamily',
      value: font.value as DesignTokenRecord['value'],
    };
  }
  readTokenTree(next);
  return next as unknown as DesignTokenSet;
}

function walkDtcg(
  node: Record<string, unknown>,
  parts: string[],
  inheritedType: string | undefined,
  entries: LegacyTokenEntry[],
): void {
  const type = typeof node.$type === 'string' ? node.$type : inheritedType;
  const extensions = isPlainObject(node.$extensions) ? node.$extensions : undefined;
  const facadeur =
    extensions && isPlainObject(extensions.facadeur) ? extensions.facadeur : undefined;
  if (!('$value' in node)) {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      if (!isPlainObject(child))
        throw new DocumentError(
          'token-schema',
          `Legacy token group "${parts.join('.')}" is invalid`,
        );
      walkDtcg(child, [...parts, key], type, entries);
    }
    return;
  }
  const [familyName, ...pathParts] = parts;
  const leaf = pathParts.pop();
  if (!familyName || !FAMILIES.has(familyName as DesignTokenFamily) || !leaf) {
    throw new DocumentError('token-schema', `Legacy token path "${parts.join('.')}" is invalid`);
  }
  if (!type || !TOKEN_TYPES.has(type)) {
    throw new DocumentError('token-type', `Legacy token "${parts.join('.')}" has no known $type`);
  }
  if (!isJsonValue(node.$value)) {
    throw new DocumentError('token-type', `Legacy token "${parts.join('.')}" value must be JSON`);
  }
  const path = parts.join('.');
  const uuid =
    typeof facadeur?.uuid === 'string' && UUID.test(facadeur.uuid)
      ? (facadeur.uuid as DesignTokenUuid)
      : legacyTokenUuid(path);
  const group = pathParts.join('.');
  const label =
    typeof facadeur?.label === 'string' && facadeur.label.trim()
      ? facadeur.label.trim()
      : displayName(leaf);
  const breakpoints = isPlainObject(facadeur?.breakpoints) ? facadeur.breakpoints : {};
  const customExtensions = extensions ? structuredClone(extensions) : undefined;
  if (customExtensions && isPlainObject(customExtensions.facadeur)) {
    const remaining = Object.fromEntries(
      Object.entries(customExtensions.facadeur).filter(
        ([key]) => !['uuid', 'label', 'breakpoints'].includes(key),
      ),
    );
    if (Object.keys(remaining).length) customExtensions.facadeur = remaining;
    else delete customExtensions.facadeur;
  }
  const cleanExtensions =
    customExtensions && Object.keys(customExtensions).length
      ? (customExtensions as DesignTokenRecord['extensions'])
      : undefined;
  entries.push({
    family: familyName as DesignTokenFamily,
    path,
    group,
    label,
    uuid,
    valueType: type as DesignTokenRecord['valueType'],
    value: canonicalizeJson(node.$value),
    breakpoints,
    ...(cleanExtensions ? { extensions: cleanExtensions } : {}),
  });
}

interface LegacyFont {
  id: string;
  label: string;
  value: unknown;
}

function readLegacyFontRecords(value: unknown): LegacyFont[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    if (!isPlainObject(raw))
      throw new DocumentError('schema', `Legacy font ${index} must be an object`);
    const id =
      typeof raw.uuid === 'string' ? raw.uuid : typeof raw.id === 'string' ? raw.id : undefined;
    if (!id || typeof raw.family !== 'string') {
      throw new DocumentError('schema', `Legacy font ${index} needs an id and family`);
    }
    const { id: _id, uuid: _uuid, label: rawLabel, ...valueRecord } = raw;
    const label = typeof rawLabel === 'string' && rawLabel.trim() ? rawLabel.trim() : raw.family;
    if (!isJsonValue(valueRecord))
      throw new DocumentError('schema', `Legacy font ${index} value must be JSON`);
    return { id, label, value: canonicalizeJson(valueRecord) };
  });
}

function mapBreakpointOverrides(
  value: Record<string, unknown>,
  ids: ReadonlyMap<string, string>,
  path: string,
  tokenIds: ReadonlyMap<string, string>,
) {
  const result: Record<string, DesignTokenRecord['value']> = {};
  for (const [id, override] of Object.entries(value)) {
    const uuid = ids.get(id) ?? (UUID.test(id) ? id : undefined);
    if (!uuid)
      throw new DocumentError(
        'token-schema',
        `Token "${path}" references unknown breakpoint "${id}"`,
      );
    if (!isJsonValue(override))
      throw new DocumentError('token-type', `Token "${path}" breakpoint "${id}" is not JSON`);
    result[uuid] = migrateNested(override, tokenIds, ids) as DesignTokenRecord['value'];
  }
  return result;
}

function breakpointIdMap(oldValue: unknown, migrated: readonly Breakpoint[]) {
  const map = new Map<string, string>();
  if (Array.isArray(oldValue)) {
    for (const [index, item] of oldValue.entries()) {
      if (!isPlainObject(item)) continue;
      const oldId = typeof item.id === 'string' ? item.id : undefined;
      const next = migrated[index];
      if (oldId && next) map.set(oldId, next.uuid);
      if (typeof item.uuid === 'string' && next) map.set(item.uuid, next.uuid);
    }
  } else {
    // These are the historical default viewport keys used by the DTCG token tree.
    const aliases = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    for (const [index, alias] of aliases.entries()) {
      const breakpoint = migrated[index];
      if (breakpoint) map.set(alias, breakpoint.uuid);
    }
  }
  for (const breakpoint of migrated) map.set(breakpoint.uuid, breakpoint.uuid);
  return map;
}

function isLegacyBreakpoints(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => isPlainObject(item) && 'id' in item);
}

function tokenIdsFromCanonical(value: unknown, into: Map<string, string>) {
  if (!isPlainObject(value)) return;
  for (const [family, records] of Object.entries(value)) {
    if (!FAMILIES.has(family as DesignTokenFamily) || !isPlainObject(records)) continue;
    for (const [uuid, record] of Object.entries(records)) {
      if (
        isPlainObject(record) &&
        typeof record.group === 'string' &&
        typeof record.label === 'string'
      ) {
        const path = [family, record.group, record.label].filter(Boolean).join('.');
        setTokenPathId(into, path, uuid);
      }
    }
  }
}

function migrateNested(
  value: unknown,
  tokenIds: ReadonlyMap<string, string>,
  breakpointIds: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === 'string') {
    return value.replace(LEGACY_REFERENCE, (match, path: string) => {
      const uuid = tokenIds.get(path) ?? tokenIds.get(path.toLowerCase());
      return uuid ? tokenReferenceValue(uuid) : match;
    });
  }
  if (Array.isArray(value))
    return value.map((item) => migrateNested(item, tokenIds, breakpointIds));
  if (!isPlainObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [property, item] of Object.entries(value)) {
    if (property === 'tokenInterface' && isPlainObject(item)) {
      result[property] = migrateTokenInterface(item, tokenIds, breakpointIds);
    } else if (property === 'reads' && Array.isArray(item)) {
      result[property] = item.map((path) =>
        typeof path === 'string'
          ? (tokenIds.get(path) ?? tokenIds.get(path.toLowerCase()) ?? path)
          : path,
      );
    } else if (property === 'breakpoints' && isPlainObject(item)) {
      const remapped: Record<string, unknown> = {};
      for (const [id, override] of Object.entries(item)) {
        remapped[breakpointIds.get(id) ?? legacyBreakpointUuid(id)] = migrateNested(
          override,
          tokenIds,
          breakpointIds,
        );
      }
      result[property] = remapped;
    } else {
      result[property] = migrateNested(item, tokenIds, breakpointIds);
    }
  }
  return result;
}

function migrateTokenInterface(
  value: Record<string, unknown>,
  tokenIds: ReadonlyMap<string, string>,
  breakpointIds: ReadonlyMap<string, string>,
) {
  const result: Record<string, unknown> = {};
  for (const [property, item] of Object.entries(value)) {
    if (property === 'reads' && Array.isArray(item)) {
      result[property] = item.map((path) =>
        typeof path === 'string'
          ? (tokenIds.get(path) ?? tokenIds.get(path.toLowerCase()) ?? path)
          : path,
      );
    } else if (property === 'sets' && isPlainObject(item)) {
      const sets: Record<string, unknown> = {};
      for (const [key, setValue] of Object.entries(item)) {
        const uuid = tokenIds.get(key) ?? tokenIds.get(key.toLowerCase());
        if (!uuid) sets[key] = migrateNested(setValue, tokenIds, breakpointIds);
      }
      for (const [key, setValue] of Object.entries(item)) {
        const uuid = tokenIds.get(key) ?? tokenIds.get(key.toLowerCase());
        if (uuid && !Object.hasOwn(sets, uuid)) {
          sets[uuid] = migrateNested(setValue, tokenIds, breakpointIds);
        }
      }
      result[property] = sets;
    } else {
      result[property] = migrateNested(item, tokenIds, breakpointIds);
    }
  }
  return result;
}

function setTokenPathId(into: Map<string, string>, path: string, uuid: string) {
  into.set(path, uuid);
  into.set(path.toLowerCase(), uuid);
}

function hasDtcgNode(value: Record<string, unknown>): boolean {
  return Object.values(value).some(
    (child) => isPlainObject(child) && ('$value' in child || hasDtcgNode(child)),
  );
}

function displayName(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stableUuid(source: string): DesignTokenUuid {
  const hashes = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  for (let index = 0; index < source.length; index += 1) {
    const char = source.charCodeAt(index);
    for (let slot = 0; slot < hashes.length; slot += 1) {
      const mixed = (hashes[slot] ?? 0) ^ (char + slot * 0x9e37);
      hashes[slot] =
        Math.imul(mixed, [0x01000193, 0x45d9f3b, 0x27d4eb2d, 0x165667b1][slot] ?? 0x01000193) >>> 0;
    }
  }
  const bytes = hashes.flatMap((hash) => [
    hash >>> 24,
    (hash >>> 16) & 0xff,
    (hash >>> 8) & 0xff,
    hash & 0xff,
  ]);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
