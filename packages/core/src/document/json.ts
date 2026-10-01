export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-clone JSON and sort object keys so Yjs read-back matches the command result. */
export function canonicalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map((item) => canonicalizeJson(item));
  if (value !== null && typeof value === 'object') {
    const next: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item !== undefined) next[key] = canonicalizeJson(item);
    }
    return next;
  }
  return value;
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item));
  if (isPlainObject(value)) {
    return Object.values(value).every((item) => isJsonValue(item));
  }
  return false;
}
