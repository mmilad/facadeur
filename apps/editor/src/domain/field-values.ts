import { assertValueMatches, type FieldDefinition, type FieldValue } from '@facadeur/core';

export type FieldValueParseOptions = {
  /** Trim string-like values before parsing legacy definition defaults. */
  trimStrings?: boolean;
  /** Return `undefined` for an empty string instead of preserving it. */
  empty?: 'undefined' | 'preserve';
};

/** Parse and validate one editor field value, including nested structured values. */
export function parseFieldValue(
  field: FieldDefinition,
  raw: string,
  options: FieldValueParseOptions = {},
): FieldValue | undefined {
  const trimStrings = options.trimStrings ?? false;
  const empty = options.empty ?? 'undefined';
  const normalized = trimStrings ? raw.trim() : raw;

  if (isStringField(field.type)) {
    if (empty === 'undefined' && normalized.length === 0) return undefined;
    assertValueMatches(field, normalized);
    return normalized;
  }
  if (normalized.trim() === '') return undefined;

  switch (field.type) {
    case 'number': {
      const value = Number(normalized);
      if (!Number.isFinite(value)) throw new Error(`${field.name} must be a number`);
      assertValueMatches(field, value);
      return value;
    }
    case 'boolean': {
      if (normalized !== 'true' && normalized !== 'false') {
        throw new Error(`${field.name} must be true or false`);
      }
      const value = normalized === 'true';
      assertValueMatches(field, value);
      return value;
    }
    case 'enum': {
      const value = normalized;
      assertValueMatches(field, value);
      return value;
    }
    case 'array':
    case 'object': {
      let value: unknown;
      try {
        value = JSON.parse(normalized);
      } catch {
        throw new Error(`${field.name} must be valid JSON`);
      }
      if (!isFieldValue(value)) {
        throw new Error(`${field.name} contains an unsupported JSON value`);
      }
      assertValueMatches(field, value);
      return value;
    }
    default:
      return normalized;
  }
}

function isStringField(type: FieldDefinition['type']): boolean {
  return ['text', 'richText', 'image', 'link', 'token'].includes(type);
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFieldValue);
  return isRecord(value) && Object.values(value).every(isFieldValue);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
