/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { overlaySchemaDefaults } from '../src/domain/schema/schema-defaults';

const document: DocumentFile = {
  version: 1,
  id: 'form-input',
  name: 'Input',
  kind: 'atom',
  fields: [
    { name: 'value', type: 'text' },
    { name: 'placeholder', type: 'text' },
  ],
  previewData: { fields: { value: 'Kept' } },
  root: { id: 'root', type: 'frame' },
};

describe('schema defaults', () => {
  it('overlays assignment defaults without replacing preview data or the source document', () => {
    const source = {
      ...document,
      schemaUse: { defaults: { placeholder: 'Email address', label: 'Hidden', value: 'Replaced' } },
    };

    const next = overlaySchemaDefaults(source);

    expect(next.previewData?.fields).toEqual({ placeholder: 'Email address', value: 'Kept' });
    expect(source.previewData?.fields).toEqual({ value: 'Kept' });
    expect(source.fields?.every((field) => field.default === undefined)).toBe(true);
  });

  it('leaves a document unchanged when the assignment has no defaults', () => {
    expect(overlaySchemaDefaults(document)).toBe(document);
  });
});
