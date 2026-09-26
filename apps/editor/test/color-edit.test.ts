import { describe, expect, it } from 'vitest';
import { readTokenTree } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import {
  assertColorTokenPath,
  createDefaultColorToken,
  isValidColorTokenPath,
  suggestColorPath,
  tokenPathsReferencingColor,
} from '../src/domain/color-edit.js';
import { tokenMatchesDomain } from '../src/ui/sidebar/design/design-domain.js';

describe('color-edit', () => {
  it('creates a default color token', () => {
    expect(createDefaultColorToken()).toEqual({ $type: 'color', $value: '#000000' });
  });

  it('validates color paths with TOKEN_SEGMENT segments under color.*', () => {
    expect(isValidColorTokenPath('color.accent.default')).toBe(true);
    expect(isValidColorTokenPath('color.custom2')).toBe(true);
    expect(isValidColorTokenPath('space.4')).toBe(false);
    expect(isValidColorTokenPath('color.Bad')).toBe(false);
    expect(isValidColorTokenPath('accent')).toBe(false);
    expect(() => assertColorTokenPath('not-a-color')).toThrow(/color\./i);
  });

  it('suggests unused color paths', () => {
    expect(suggestColorPath(['color.accent.default'])).toBe('color.custom');
    expect(suggestColorPath(['color.custom'])).toBe('color.custom2');
  });

  it('finds token paths that reference a color', () => {
    const design = createProjectTemplateDocument();
    const refs = tokenPathsReferencingColor(design.tokens, 'color.blue.500');
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((path) => path.startsWith('color.'))).toBe(true);
    expect(tokenPathsReferencingColor(design.tokens, 'color.missing')).toEqual([]);
  });

  it('new color paths match the colors design domain', () => {
    const design = createProjectTemplateDocument();
    const path = 'color.custom';
    assertColorTokenPath(path);
    const token = createDefaultColorToken();
    expect(tokenMatchesDomain(path, token.$type ?? 'color', 'colors')).toBe(true);
    const indexed = readTokenTree(design.tokens);
    expect(indexed.tokens.has(path)).toBe(false);
  });
});
