import { isVariantPreset, type DocumentFile, type FieldValue, type PreviewData } from './schema.js';
import type { FlatDocument } from './flat.js';

type PreviewDocument = DocumentFile | FlatDocument;

/**
 * Resolve the values used by an editor preview. Legacy field defaults remain a
 * read compatibility fallback until the document is explicitly migrated.
 */
export function resolvePreviewData(
  document: PreviewDocument,
  variantName: string | null | undefined = null,
): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const field of document.fields ?? []) {
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
): DocumentFile {
  const next = structuredClone(document);
  const values = resolvePreviewData(document, variantName);
  next.fields = (next.fields ?? []).map((field) => {
    const value = values[field.name];
    const copy = structuredClone(field);
    if (value === undefined) delete copy.default;
    else copy.default = structuredClone(value);
    return copy;
  });
  return next;
}

function cloneValues(values: PreviewData['fields'] | undefined): Record<string, FieldValue> {
  if (!values) return {};
  return structuredClone(values);
}
