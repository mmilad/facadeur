import { describe, expect, it } from 'vitest';
import { readTokenTree } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import {
  assertSpacingTokenPath,
  createDefaultSpacingToken,
  isValidSpacingTokenPath,
  suggestSpacingPath,
  tokenPathsReferencingSpacing,
} from '../src/domain/spacing-edit.js';
import { tokenMatchesDomain } from '../src/ui/sidebar/design/design-domain.js';

describe('spacing-edit', () => {
  it('creates a default spacing token', () => {
    expect(createDefaultSpacingToken()).toEqual({ $type: 'dimension', $value: '0' });
  });

  it('validates spacing paths with TOKEN_SEGMENT segments under space.*', () => {
    expect(isValidSpacingTokenPath('space.gap.md')).toBe(true);
    expect(isValidSpacingTokenPath('space.custom2')).toBe(true);
    expect(isValidSpacingTokenPath('color.accent.default')).toBe(false);
    expect(isValidSpacingTokenPath('space.Bad')).toBe(false);
    expect(isValidSpacingTokenPath('gap')).toBe(false);
    expect(() => assertSpacingTokenPath('not-spacing')).toThrow(/space\./i);
  });

  it('suggests unused spacing paths', () => {
    expect(suggestSpacingPath(['space.gap.md'])).toBe('space.custom');
    expect(suggestSpacingPath(['space.custom'])).toBe('space.custom2');
  });

  it('finds token paths that reference a spacing token', () => {
    const design = createProjectTemplateDocument();
    const refs = tokenPathsReferencingSpacing(design.tokens, 'space.4');
    expect(refs.length).toBeGreaterThan(0);
    expect(refs).toContain('space.gap.md');
    expect(tokenPathsReferencingSpacing(design.tokens, 'space.missing')).toEqual([]);
  });

  it('new spacing paths match the spacing design domain', () => {
    const design = createProjectTemplateDocument();
    const path = 'space.custom';
    assertSpacingTokenPath(path);
    const token = createDefaultSpacingToken();
    expect(tokenMatchesDomain(path, token.$type ?? 'dimension', 'spacing')).toBe(true);
    const indexed = readTokenTree(design.tokens);
    expect(indexed.tokens.has(path)).toBe(false);
  });
});
