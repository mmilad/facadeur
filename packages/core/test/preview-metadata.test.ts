import { describe, expect, it } from 'vitest';
import { applyCommand, toFlat, toNested, validateCatalog, type DocumentFile } from '@facadeur/core';

const file: DocumentFile = {
  version: 1,
  id: 'sample',
  name: 'Sample',
  kind: 'atom',
  fields: [{ name: 'value', type: 'text', required: true }],
  variants: [{ name: 'compact' }],
  root: { id: 'root', type: 'text', text: 'Input' },
};

describe('editor preview metadata', () => {
  it('round-trips samples and labels without adding runtime defaults', () => {
    const doc = {
      ...file,
      previewData: { fields: { value: 'Sample' }, variants: { compact: { value: 'Short' } } },
      variantLabels: { default: 'Text', compact: 'Small' },
    };
    expect(validateCatalog([doc])).toEqual([doc]);
    expect(toNested(toFlat(doc))).toEqual(doc);
    expect(toFlat(doc).fields[0]?.default).toBeUndefined();
  });
  it('validates preview types and known variant identifiers', () => {
    expect(() =>
      applyCommand(toFlat(file), {
        type: 'setPreviewData',
        previewData: { fields: { value: false } },
      }),
    ).toThrow();
    expect(() =>
      applyCommand(toFlat(file), { type: 'setVariantLabels', labels: { missing: 'Unknown' } }),
    ).toThrow();
  });
  it('removes sample values and labels when their definitions are removed', () => {
    const start = toFlat({
      ...file,
      previewData: { fields: { value: 'Base' }, variants: { compact: { value: 'Small' } } },
      variantLabels: { compact: 'Small' },
    });
    const noField = applyCommand(start, { type: 'removeField', name: 'value' });
    expect(noField.previewData?.fields?.value).toBeUndefined();
    const noVariant = applyCommand(start, { type: 'removeVariantPreset', name: 'compact' });
    expect(noVariant.variantLabels?.compact).toBeUndefined();
    expect(noVariant.previewData?.variants?.compact).toBeUndefined();
  });
});
