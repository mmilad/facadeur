import {
  isVariantPreset,
  type DocumentFile,
  type FieldValue,
  type FieldDefinition,
  type PreviewData,
} from '../../document/schema.js';
import type { FlatDocument } from '../../document/flat.js';

type PreviewDocument = DocumentFile | FlatDocument;

/**
 * Resolve the values used by an editor preview. Legacy field defaults remain a
 * read compatibility fallback until the document is explicitly migrated.
 */
export function resolvePreviewData(
  document: PreviewDocument,
  variantName: string | null | undefined = null,
  contractFields?: readonly FieldDefinition[] | ReadonlyMap<string, FieldDefinition>,
): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  const fields = normalizeFields(
    contractFields ?? (document.schemaUse ? [] : (document.fields ?? [])),
  );
  for (const field of fields) {
    if (field.default !== undefined) values[field.name] = structuredClone(field.default);
  }

  const variants = 'variantPresets' in document ? document.variantPresets : document.variants;
  const preset = variantName
    ? variants?.find((variant) => isVariantPreset(variant) && variant.name === variantName)
    : undefined;
  const presetValues = preset && isVariantPreset(preset) ? preset.overrides?.fields : undefined;
  if (presetValues) {
    for (const [name, value] of Object.entries(presetValues)) {
      values[name] = structuredClone(value);
    }
  }
  Object.assign(values, validSchemaSamples(document.schemaUse?.defaults, fields));
  const preview = document.previewData;
  Object.assign(values, cloneValues(preview?.fields));
  const presetUnset = preset && isVariantPreset(preset) ? preset.overrides?.unsetFields : undefined;
  for (const name of presetUnset ?? []) delete values[name];
  if (variantName) Object.assign(values, cloneValues(preview?.variants?.[variantName]));
  return values;
}

/**
 * Return an ephemeral document with the effective preview values as field
 * defaults. The source document and its stored defaults are never mutated.
 */
export function withPreviewData(
  document: DocumentFile,
  variantName: string | null | undefined = null,
  contractFields?: readonly FieldDefinition[] | ReadonlyMap<string, FieldDefinition>,
): DocumentFile {
  const next = structuredClone(document);
  const fields = normalizeFields(
    contractFields ?? (document.schemaUse ? [] : (document.fields ?? [])),
  );
  const values = resolvePreviewData(document, variantName, fields);
  next.fields = fields.map((field) => {
    const value = values[field.name];
    const copy = structuredClone(field);
    if (value === undefined) delete copy.default;
    else copy.default = structuredClone(value);
    return copy;
  });
  return next;
}

function normalizeFields(
  fields: readonly FieldDefinition[] | ReadonlyMap<string, FieldDefinition>,
): FieldDefinition[] {
  return Array.isArray(fields)
    ? [...fields]
    : [...(fields as ReadonlyMap<string, FieldDefinition>).values()];
}

function validSchemaSamples(raw: unknown, fields: readonly FieldDefinition[]) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const allowed = new Set(fields.map((field) => field.name));
  const values: Record<string, FieldValue> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (allowed.has(name) && isFieldValue(value)) values[name] = structuredClone(value);
  }
  return values;
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isFieldValue);
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every(isFieldValue);
}

function cloneValues(values: PreviewData['fields'] | undefined): Record<string, FieldValue> {
  if (!values) return {};
  return structuredClone(values);
}
