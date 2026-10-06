import {
  type DocumentFile,
  type FieldDefinition,
  type FieldValue,
  type FlatDocument,
  type PreviewData,
} from '@facadeur/core';
import { parseFieldValue } from './field-values.js';

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
  return parseFieldValue(field, raw, { trimStrings: false, empty: 'preserve' });
}
