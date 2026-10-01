import { describe, expect, it } from 'vitest';
import type { FlatDocument } from '@facadeur/core';
import {
  nextVariantIdentity,
  variantLabel,
  variantLabelMap,
  variantSummaries,
} from '../src/domain/variant-edit.js';

const document = {
  variantPresets: [{ name: 'compact' }, { name: 'variant-1' }],
  variantLabels: { default: 'Base', compact: 'Compact' },
} as unknown as Pick<FlatDocument, 'variantPresets'> & {
  variantLabels: Record<string, string>;
};

describe('variant display metadata', () => {
  it('keeps stable preset names separate from editable labels', () => {
    expect(variantSummaries(document)).toEqual([
      { name: 'default', label: 'Base', isDefault: true },
      { name: 'compact', label: 'Compact', isDefault: false },
      { name: 'variant-1', label: 'variant-1', isDefault: false },
    ]);
    expect(variantLabel(document, 'default')).toBe('Base');
    expect(variantLabel(document, 'missing')).toBe('missing');
  });

  it('creates the next stable id and a localized initial label', () => {
    expect(nextVariantIdentity(document)).toEqual({
      name: 'variant-2',
      label: 'Variante 2',
      preset: { name: 'variant-2' },
    });
  });

  it('removes a blank label without changing other labels', () => {
    expect(variantLabelMap(document, 'compact', '  ')).toEqual({ default: 'Base' });
  });
});
