import { describe, expect, it } from 'vitest';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import {
  createDefaultFont,
  editedFont,
  parseFontFallbacks,
  parseFontWeights,
  suggestFontId,
  tokenPathsReferencingFont,
} from '../src/domain/font-edit.js';

describe('font-edit', () => {
  it('creates a google font with a generic fallback', () => {
    const font = createDefaultFont('display');
    expect(font).toMatchObject({
      id: 'display',
      family: 'display',
      weights: [400, 600],
      source: { type: 'google', family: 'display' },
      fallbacks: ['sans-serif'],
    });
  });

  it('suggests unused font ids', () => {
    expect(suggestFontId(['sans'])).toBe('font');
    expect(suggestFontId(['sans', 'font'])).toBe('font2');
  });

  it('parses weights and fallbacks', () => {
    expect(parseFontWeights('400, 600')).toEqual([400, 600]);
    expect(parseFontFallbacks('system-ui, sans-serif')).toEqual(['system-ui', 'sans-serif']);
    expect(() => parseFontFallbacks('Helvetica')).toThrow(/generic family/i);
    expect(() => parseFontWeights('')).toThrow(/at least one weight/i);
  });

  it('finds token paths that reference a font family', () => {
    const design = createProjectTemplateDocument();
    const refs = tokenPathsReferencingFont(design.tokens, 'sans');
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((path) => path.startsWith('type.'))).toBe(true);
    expect(tokenPathsReferencingFont(design.tokens, 'missing')).toEqual([]);
  });

  it('updates google families and weights through editedFont', () => {
    const design = createProjectTemplateDocument();
    const sans = design.fonts?.[0];
    if (!sans) throw new Error('expected template font');
    const next = editedFont(sans, {
      family: 'Source Sans 3',
      googleFamily: 'Source Sans 3',
      weights: [400, 700],
    });
    expect(next.family).toBe('Source Sans 3');
    expect(next.source).toEqual({ type: 'google', family: 'Source Sans 3' });
    expect(next.weights).toEqual([400, 700]);
  });
});
