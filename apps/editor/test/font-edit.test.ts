import { describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import {
  createDefaultFont,
  editedFont,
  formatFontWeightList,
  parseFontFallbacks,
  parseFontWeights,
} from '../src/domain/edits/font-edit';

describe('font-edit', () => {
  it('creates a system font with a generic fallback', () => {
    const font = createDefaultFont('display');
    expect(font).toMatchObject({
      label: 'display',
      value: {
        family: 'system-ui',
        weights: [400, 600],
        source: { type: 'system' },
        fallbacks: ['sans-serif'],
      },
    });
  });

  it('parses weights and fallbacks', () => {
    expect(parseFontWeights('400, 600')).toEqual([400, 600]);
    expect(formatFontWeightList([400, 500, 600, 700])).toBe(
      'Regular 400, Medium 500, Semibold 600, Bold 700',
    );
    expect(parseFontFallbacks('system-ui, sans-serif')).toEqual(['system-ui', 'sans-serif']);
    expect(() => parseFontFallbacks('Helvetica')).toThrow(/generic family/i);
    expect(() => parseFontWeights('')).toThrow(/at least one weight/i);
  });

  it('updates the Example Catalog font family and weights through editedFont', () => {
    const font = createExampleCatalog().tokens.font[exampleIds.tokens.font.systemUi];
    const next = editedFont(font, {
      family: 'Georgia',
      weights: [400, 700],
    });
    expect(next.value.family).toBe('Georgia');
    expect(next.value.source).toEqual({ type: 'system' });
    expect(next.value.weights).toEqual([400, 700]);
  });
});
