import type { DocumentFile, FieldValue, PreviewData } from '@facadeur/core';
import { getComponentSchemaUse } from './schema-library.js';

/**
 * Schema-library defaults for fields this document actually declares.
 * Explicit preview data wins over these defaults.
 */
export function schemaFieldDefaultsFor(document: {
  id: string;
  fields?: readonly { name: string }[];
}): Record<string, FieldValue> {
  const raw = getComponentSchemaUse(document.id)?.defaults;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const names = new Set((document.fields ?? []).map((field) => field.name));
  const fields: Record<string, FieldValue> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (!names.has(name) || !isFieldValue(value)) continue;
    fields[name] = value;
  }
  return fields;
}

/** Copy schema-library defaults onto a render clone. Stored fields stay untouched. */
export function overlaySchemaDefaults(document: DocumentFile): DocumentFile {
  const defaults = schemaFieldDefaultsFor(document);
  if (Object.keys(defaults).length === 0) return document;
  const next = structuredClone(document);
  const preview: PreviewData = structuredClone(next.previewData ?? {});
  preview.fields = { ...defaults, ...preview.fields };
  next.previewData = preview;
  return next;
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isFieldValue);
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every(isFieldValue);
}
