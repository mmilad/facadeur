import { isPlainObject, type JsonValue } from '@facadeur/core';
import type { Binding, FontStyle } from '@facadeur/core';
import * as Y from 'yjs';

export function ensureMap(parent: Y.Map<unknown>, key: string): Y.Map<unknown> {
  const current = parent.get(key);
  if (current instanceof Y.Map) return current;
  const created = new Y.Map<unknown>();
  parent.set(key, created);
  return created;
}

export function ensureArray<T>(parent: Y.Map<unknown>, key: string): Y.Array<T> {
  const current = parent.get(key);
  if (current instanceof Y.Array) return current as Y.Array<T>;
  const created = new Y.Array<T>();
  parent.set(key, created);
  return created;
}

export function syncScalar(map: Y.Map<unknown>, key: string, value: unknown): void {
  // A map is readable only after it has been inserted into the document.
  const integrated = map.doc !== null;
  if (value === undefined) {
    if (integrated && map.has(key)) map.delete(key);
    return;
  }
  if (!integrated || map.get(key) !== value) map.set(key, value);
}

export function deleteKeys(map: Y.Map<unknown>, keys: string[]): void {
  for (const key of keys) {
    if (map.has(key)) map.delete(key);
  }
}

/** Turn `current` into `desired` with inserts and deletes on the same Y.Array. */
export function reconcile<T>(list: Y.Array<T>, desired: readonly T[]): void {
  const limit = list.length + desired.length + 8;
  for (let guard = 0; guard < limit; guard += 1) {
    const current = list.toArray();
    if (
      current.length === desired.length &&
      current.every((item, index) => item === desired[index])
    ) {
      return;
    }
    let index = 0;
    while (index < current.length && index < desired.length && current[index] === desired[index]) {
      index += 1;
    }
    if (index === current.length) {
      list.insert(index, desired.slice(index));
      return;
    }
    if (index === desired.length) {
      list.delete(index, current.length - index);
      return;
    }
    const wanted = desired[index];
    if (wanted === undefined) return;
    const later = current.indexOf(wanted, index);
    if (later === -1) list.insert(index, [wanted]);
    else list.delete(index, 1);
  }
  throw new Error('Could not reconcile a Y.Array');
}

export function sameList(current: unknown, next: readonly string[]): boolean {
  return (
    Array.isArray(current) &&
    current.length === next.length &&
    current.every((item, index) => item === next[index])
  );
}

export function syncJsonObject(map: Y.Map<unknown>, value: Record<string, JsonValue>): void {
  for (const key of [...map.keys()]) {
    if (!(key in value)) map.delete(key);
  }
  for (const [key, item] of Object.entries(value)) {
    syncJsonValue(map, key, item);
  }
}

export function syncJsonMap(
  parent: Y.Map<unknown>,
  key: string,
  value: Record<string, JsonValue> | undefined,
): void {
  if (!value || Object.keys(value).length === 0) {
    if (parent.has(key)) parent.delete(key);
    return;
  }
  syncJsonObject(ensureMap(parent, key), value);
}

function syncJsonValue(parent: Y.Map<unknown>, key: string, value: JsonValue): void {
  const current = parent.get(key);
  if (isPlainObject(value)) {
    const map = current instanceof Y.Map ? current : new Y.Map<unknown>();
    if (!(current instanceof Y.Map)) parent.set(key, map);
    syncJsonObject(map, value);
    return;
  }
  if (Array.isArray(value)) {
    const list = current instanceof Y.Array ? current : new Y.Array<unknown>();
    if (!(current instanceof Y.Array)) parent.set(key, list);
    syncJsonArray(list, value);
    return;
  }
  if (current instanceof Y.Map || current instanceof Y.Array || current !== value) {
    parent.set(key, value);
  }
}

export function syncJsonArray(list: Y.Array<unknown>, value: readonly JsonValue[]): void {
  if (JSON.stringify(readJsonArray(list)) === JSON.stringify(value)) return;
  if (list.length > 0) list.delete(0, list.length);
  if (value.length > 0) list.insert(0, value.map(embedJson));
}

function embedJson(value: JsonValue): unknown {
  if (isPlainObject(value)) {
    const map = new Y.Map<unknown>();
    for (const [key, item] of Object.entries(value)) map.set(key, embedJson(item));
    return map;
  }
  if (Array.isArray(value)) {
    const list = new Y.Array<unknown>();
    if (value.length > 0) list.insert(0, value.map(embedJson));
    return list;
  }
  return value;
}

export function readJsonObject(map: Y.Map<unknown>): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const [key, value] of map.entries()) result[key] = readJson(value);
  return result;
}

export function readJsonArray(value: unknown): JsonValue[] {
  if (!(value instanceof Y.Array)) return [];
  return value.toArray().map((item) => readJson(item));
}

export function readJson(value: unknown): JsonValue {
  if (value instanceof Y.Map) return readJsonObject(value);
  if (value instanceof Y.Array) return readJsonArray(value);
  if (typeof value === 'string' || typeof value === 'boolean' || value === null) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error('Yjs document contains a value that is not JSON');
}

export function readNumberArray(value: unknown): number[] {
  return readJsonArray(value).filter((item): item is number => typeof item === 'number');
}

export function readStringArray(value: unknown): string[] {
  return readJsonArray(value).filter((item): item is string => typeof item === 'string');
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

export function isFontStyle(value: unknown): value is FontStyle {
  return value === 'normal' || value === 'italic';
}

export function isBindingTarget(value: unknown): value is Binding['target'] {
  return (
    value === 'text' ||
    value === 'attribute' ||
    value === 'style' ||
    value === 'visible' ||
    value === 'src' ||
    value === 'alt'
  );
}

export function isVariantPresetJson(value: JsonValue): boolean {
  return isPlainObject(value) && typeof value.name === 'string';
}
