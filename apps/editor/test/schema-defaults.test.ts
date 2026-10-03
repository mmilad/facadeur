/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { overlaySchemaDefaults } from '../src/domain/schema/schema-defaults';
import {
  createLibrarySchema,
  resetSchemaLibrary,
  setComponentSchemaUse,
} from '../src/domain/schema/schema-library';

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
  beforeEach(() => resetSchemaLibrary());

  it('overlays assignment defaults without replacing preview data or the source document', () => {
    const schema = createLibrarySchema('Input');
    setComponentSchemaUse(document.id, {
      direct: { kind: 'schema', schemaId: schema.id },
      defaults: { placeholder: 'Email address', label: 'Hidden', value: 'Replaced' },
    });

    const next = overlaySchemaDefaults(document);

    expect(next.previewData?.fields).toEqual({ placeholder: 'Email address', value: 'Kept' });
    expect(document.previewData?.fields).toEqual({ value: 'Kept' });
    expect(document.fields?.every((field) => field.default === undefined)).toBe(true);
  });

  it('leaves a document unchanged when the assignment has no defaults', () => {
    expect(overlaySchemaDefaults(document)).toBe(document);
  });
});
