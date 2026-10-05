import type { DocumentFile, FieldValue } from '@facadeur/core';

/** Add the mounted component's resolved public fields to the local `props` scope. */
export function mountedScope(
  document: DocumentFile,
  fields: Record<string, FieldValue>,
): Record<string, FieldValue> {
  if (document.root.type === 'switch') return fields;
  return { ...fields, props: { ...fields } };
}
