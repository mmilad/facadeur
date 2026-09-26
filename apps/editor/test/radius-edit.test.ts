import { describe, expect, it } from 'vitest';
import { readTokenTree } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import {
  assertRadiusTokenPath,
  createDefaultRadiusToken,
  isValidRadiusTokenPath,
  suggestRadiusPath,
  tokenPathsReferencingRadius,
} from '../src/domain/radius-edit.js';
import { tokenMatchesDomain } from '../src/ui/sidebar/design/design-domain.js';

describe('radius-edit', () => {
  it('creates a default radius token', () => {
    expect(createDefaultRadiusToken()).toEqual({ $type: 'dimension', $value: '0' });
  });

  it('validates radius paths with TOKEN_SEGMENT segments under radius.*', () => {
    expect(isValidRadiusTokenPath('radius.corner.md')).toBe(true);
    expect(isValidRadiusTokenPath('radius.custom2')).toBe(true);
    expect(isValidRadiusTokenPath('color.accent.default')).toBe(false);
    expect(isValidRadiusTokenPath('radius.Bad')).toBe(false);
    expect(isValidRadiusTokenPath('corner')).toBe(false);
    expect(() => assertRadiusTokenPath('not-radius')).toThrow(/radius\./i);
  });

  it('suggests unused radius paths', () => {
    expect(suggestRadiusPath(['radius.md'])).toBe('radius.custom');
    expect(suggestRadiusPath(['radius.custom'])).toBe('radius.custom2');
  });

  it('finds token paths that reference a radius token', () => {
    const design = createProjectTemplateDocument();
    const refs = tokenPathsReferencingRadius(design.tokens, 'radius.md');
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.includes('radius.md')).toBe(false);
    expect(tokenPathsReferencingRadius(design.tokens, 'radius.missing')).toEqual([]);
  });

  it('new radius paths match the radius design domain', () => {
    const design = createProjectTemplateDocument();
    const path = 'radius.custom';
    assertRadiusTokenPath(path);
    const token = createDefaultRadiusToken();
    expect(tokenMatchesDomain(path, token.$type ?? 'dimension', 'radius')).toBe(true);
    const indexed = readTokenTree(design.tokens);
    expect(indexed.tokens.has(path)).toBe(false);
  });
});
