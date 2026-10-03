import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import {
  migratePreviewData,
  parsePreviewFieldValue,
  patchPreviewData,
  previewValueSource,
} from '../src/domain/preview-data';

const legacyDocument = (): DocumentFile => ({
  version: 1,
  id: 'preview-data',
  name: 'Preview data',
  kind: 'component',
  fields: [
    { name: 'label', type: 'text', default: 'Legacy label' },
    { name: 'count', type: 'number', required: true },
  ],
  variants: [
    { name: 'default' },
    {
      name: 'compact',
      overrides: {
        fields: { label: 'Compact label' },
        unsetFields: ['count'],
      },
    },
  ],
  root: { id: 'root', type: 'frame', children: [] },
});

describe('preview data', () => {
  it('migrates field and named variant defaults without mutating the source', () => {
    const source = legacyDocument();
    const migrated = migratePreviewData(source);

    expect(source.fields?.[0]).toHaveProperty('default', 'Legacy label');
    expect(migrated.fields?.[0]).not.toHaveProperty('default');
    expect(migrated.previewData).toEqual({
      fields: { label: 'Legacy label' },
      variants: { compact: { label: 'Compact label' } },
    });
    expect(migrated.variants?.[1]).toMatchObject({
      name: 'compact',
      overrides: { unsetFields: ['count'] },
    });
  });

  it('keeps preview overrides sparse and clears empty layers', () => {
    const base = patchPreviewData(undefined, null, 'label', 'Base');
    expect(base).toEqual({ fields: { label: 'Base' } });
    const variant = patchPreviewData(base ?? undefined, 'compact', 'label', 'Compact');
    expect(variant).toEqual({
      fields: { label: 'Base' },
      variants: { compact: { label: 'Compact' } },
    });
    expect(patchPreviewData(variant ?? undefined, 'compact', 'label', undefined)).toEqual({
      fields: { label: 'Base' },
    });
  });

  it('reports the effective layer and parses typed values', () => {
    const document = {
      ...legacyDocument(),
      previewData: { fields: { label: 'Base' }, variants: { compact: { label: 'Compact' } } },
    };
    const field = document.fields?.[0];
    if (!field) throw new Error('Missing fixture field');
    expect(previewValueSource(document, field, 'compact')).toBe('variant');
    expect(previewValueSource(document, field, null)).toBe('base');
    expect(parsePreviewFieldValue({ name: 'count', type: 'number' }, '4')).toBe(4);
    expect(parsePreviewFieldValue({ name: 'tags', type: 'array' }, '["a"]')).toEqual(['a']);
    expect(parsePreviewFieldValue({ name: 'label', type: 'text' }, '')).toBe('');
    expect(patchPreviewData({ fields: { label: 'Base' } }, 'compact', 'label', '')).toEqual({
      fields: { label: 'Base' },
      variants: { compact: { label: '' } },
    });
    expect(() => parsePreviewFieldValue({ name: 'count', type: 'number' }, 'nope')).toThrow();
  });
});
