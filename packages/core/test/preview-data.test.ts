import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  resolvePreviewData,
  toFlat,
  withPreviewData,
  type DocumentFile,
} from '../src/index.js';

const document: DocumentFile = {
  version: 1,
  id: 'preview-helper',
  name: 'Preview helper',
  kind: 'component',
  fields: [
    { name: 'label', type: 'text', default: 'legacy' },
    { name: 'count', type: 'number' },
  ],
  variants: [
    { name: 'default' },
    { name: 'compact', overrides: { fields: { label: 'preset' }, unsetFields: ['count'] } },
  ],
  previewData: { fields: { label: 'base' }, variants: { compact: { count: 2 } } },
  root: { id: 'root', type: 'frame', children: [] },
};

describe('preview data helper', () => {
  it('resolves canonical values after legacy compatibility layers', () => {
    expect(resolvePreviewData(document, 'compact')).toEqual({ label: 'base', count: 2 });
    expect(resolvePreviewData(document, null)).toEqual({ label: 'base' });
  });

  it('creates an ephemeral document without mutating stored defaults', () => {
    const resolved = withPreviewData(document, 'compact');
    expect(resolved.fields).toEqual([
      { name: 'label', type: 'text', default: 'base' },
      { name: 'count', type: 'number', default: 2 },
    ]);
    expect(document.fields?.[0]).toHaveProperty('default', 'legacy');
  });

  it('drops incompatible preview values when a field type changes', () => {
    const flat = toFlat({
      ...document,
      previewData: { fields: { label: 'base' }, variants: { compact: { label: 'small' } } },
    });
    const next = applyCommand(flat, {
      type: 'defineField',
      field: { name: 'label', type: 'number' },
    });
    expect(next.previewData).toBeUndefined();
  });
});
