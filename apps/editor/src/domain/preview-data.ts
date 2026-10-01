import {
  type DocumentFile,
  type FieldDefinition,
  type FieldValue,
  type FlatDocument,
  type PreviewData,
} from '@facadeur/core';

export type PreviewValueSource = 'variant' | 'base' | 'legacy' | 'missing';

/** Copy legacy defaults and named-preset field defaults into editor preview data. */
export function migratePreviewData(document: DocumentFile): DocumentFile {
  const next = structuredClone(document);
  const preview: PreviewData = structuredClone(next.previewData ?? {});
  const fields = { ...(preview.fields ?? {}) };

  for (const field of next.fields ?? []) {
    if (field.default === undefined) continue;
    if (!Object.prototype.hasOwnProperty.call(fields, field.name)) {
      fields[field.name] = structuredClone(field.default);
    }
    delete field.default;
  }

  const variants = { ...(preview.variants ?? {}) };
  for (const variant of next.variants ?? []) {
    if (!('overrides' in variant) || !variant.overrides?.fields) continue;
    const values = { ...(variants[variant.name] ?? {}) };
    for (const [name, value] of Object.entries(variant.overrides.fields)) {
      if (!Object.prototype.hasOwnProperty.call(values, name))
        values[name] = structuredClone(value);
    }
    if (Object.keys(values).length) variants[variant.name] = values;

    // Keep unsetFields in the legacy preset. The new sparse preview format has
    // no explicit unset marker yet, so dropping it would lose old semantics.
    const overrides = { ...variant.overrides };
    delete overrides.fields;
    variant.overrides = Object.keys(overrides).length ? overrides : undefined;
  }

  if (Object.keys(fields).length) preview.fields = fields;
  else delete preview.fields;
  if (Object.keys(variants).length) preview.variants = variants;
  else delete preview.variants;
  if (preview.fields || preview.variants) next.previewData = preview;
  else delete next.previewData;
  return next;
}

/** Update one sparse preview value without changing any other variant values. */
export function patchPreviewData(
  current: PreviewData | undefined,
  variantName: string | null | undefined,
  fieldName: string,
  value: FieldValue | undefined,
): PreviewData | null {
  const next: PreviewData = structuredClone(current ?? {});
  if (variantName) {
    const values = { ...(next.variants?.[variantName] ?? {}) };
    if (value === undefined) delete values[fieldName];
    else values[fieldName] = structuredClone(value);
    const variants = { ...(next.variants ?? {}) };
    if (Object.keys(values).length) variants[variantName] = values;
    else delete variants[variantName];
    if (Object.keys(variants).length) next.variants = variants;
    else delete next.variants;
  } else {
    const values = { ...(next.fields ?? {}) };
    if (value === undefined) delete values[fieldName];
    else values[fieldName] = structuredClone(value);
    if (Object.keys(values).length) next.fields = values;
    else delete next.fields;
  }
  return next.fields || next.variants ? next : null;
}

export function previewValueSource(
  document: FlatDocument | DocumentFile,
  field: FieldDefinition,
  variantName: string | null | undefined,
): PreviewValueSource {
  if (
    variantName &&
    Object.prototype.hasOwnProperty.call(
      document.previewData?.variants?.[variantName] ?? {},
      field.name,
    )
  ) {
    return 'variant';
  }
  if (Object.prototype.hasOwnProperty.call(document.previewData?.fields ?? {}, field.name)) {
    return 'base';
  }
  if (field.default !== undefined) return 'legacy';
  return 'missing';
}

export function parsePreviewFieldValue(
  field: FieldDefinition,
  raw: string,
): FieldValue | undefined {
  if (['text', 'richText', 'image', 'link', 'token'].includes(field.type)) return raw;
  if (raw.trim() === '') return undefined;
  if (field.type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${field.name} must be a number`);
    return value;
  }
  if (field.type === 'boolean') return raw === 'true';
  if (field.type === 'array' || field.type === 'object') {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(`${field.name} must be valid JSON`);
    }
    if (!isFieldValue(value)) throw new Error(`${field.name} contains an unsupported JSON value`);
    if (field.type === 'array' && !Array.isArray(value))
      throw new Error(`${field.name} must be a JSON array`);
    if (field.type === 'object' && (!isRecord(value) || Array.isArray(value))) {
      throw new Error(`${field.name} must be a JSON object`);
    }
    assertTypedValue(field, value);
    return value;
  }
  if (field.type === 'enum' && !field.options?.includes(raw)) {
    throw new Error(`${field.name} must be one of ${field.options?.join(', ')}`);
  }
  return raw;
}

function assertTypedValue(field: FieldDefinition, value: FieldValue): void {
  if (field.type === 'array') {
    if (!Array.isArray(value)) throw new Error(`${field.name} must be a JSON array`);
    if (field.items) {
      for (const item of value) {
        assertTypedValue(
          {
            name: `${field.name}[]`,
            type: field.items.type,
            ...(field.items.options ? { options: field.items.options } : {}),
            ...(field.items.fields
              ? { items: { type: field.items.type, fields: field.items.fields } }
              : {}),
          },
          item,
        );
      }
    }
    return;
  }
  if (field.type === 'object') {
    if (!isRecord(value)) throw new Error(`${field.name} must be a JSON object`);
    for (const nested of field.items?.fields ?? []) {
      const nestedValue = value[nested.name];
      if (nestedValue === undefined) {
        if (nested.required) throw new Error(`${field.name} is missing "${nested.name}"`);
      } else {
        assertTypedValue(nested, nestedValue);
      }
    }
    return;
  }
  if (field.type === 'boolean' && typeof value !== 'boolean') {
    throw new Error(`${field.name} must be a boolean`);
  }
  if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error(`${field.name} must be a number`);
  }
  if (field.type === 'enum' && (typeof value !== 'string' || !field.options?.includes(value))) {
    throw new Error(`${field.name} must be one of ${field.options?.join(', ')}`);
  }
  if (
    field.type !== 'boolean' &&
    field.type !== 'number' &&
    field.type !== 'enum' &&
    typeof value !== 'string'
  ) {
    throw new Error(`${field.name} must be a string`);
  }
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
