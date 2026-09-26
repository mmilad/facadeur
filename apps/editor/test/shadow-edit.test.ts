import { describe, expect, it } from 'vitest';
import { readTokenTree } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import {
  assertShadowTokenPath,
  createDefaultShadowToken,
  isValidShadowTokenPath,
  suggestShadowPath,
  tokenPathsReferencingShadow,
} from '../src/domain/shadow-edit.js';
import { tokenMatchesDomain } from '../src/ui/sidebar/design/design-domain.js';

describe('shadow-edit', () => {
  it('creates a default shadow token matching shadow.sm', () => {
    expect(createDefaultShadowToken()).toEqual({
      $type: 'shadow',
      $value: {
        offsetX: '0px',
        offsetY: '1px',
        blur: '2px',
        spread: '0px',
        color: '#0f172a14',
      },
    });
  });

  it('validates shadow paths with TOKEN_SEGMENT segments under shadow.*', () => {
    expect(isValidShadowTokenPath('shadow.elevated.md')).toBe(true);
    expect(isValidShadowTokenPath('shadow.custom2')).toBe(true);
    expect(isValidShadowTokenPath('color.accent.default')).toBe(false);
    expect(isValidShadowTokenPath('shadow.Bad')).toBe(false);
    expect(isValidShadowTokenPath('elevated')).toBe(false);
    expect(() => assertShadowTokenPath('not-shadow')).toThrow(/shadow\./i);
  });

  it('suggests unused shadow paths', () => {
    expect(suggestShadowPath(['shadow.md'])).toBe('shadow.custom');
    expect(suggestShadowPath(['shadow.custom'])).toBe('shadow.custom2');
  });

  it('finds token paths that reference a shadow token', () => {
    const design = createProjectTemplateDocument();
    const refs = tokenPathsReferencingShadow(design.tokens, 'shadow.md');
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.includes('shadow.md')).toBe(false);
    expect(refs).toContain('card.shadow');
    expect(tokenPathsReferencingShadow(design.tokens, 'shadow.missing')).toEqual([]);
  });

  it('new shadow paths match the shadow design domain', () => {
    const design = createProjectTemplateDocument();
    const path = 'shadow.custom';
    assertShadowTokenPath(path);
    const token = createDefaultShadowToken();
    expect(tokenMatchesDomain(path, token.$type ?? 'shadow', 'shadow')).toBe(true);
    const indexed = readTokenTree(design.tokens);
    expect(indexed.tokens.has(path)).toBe(false);
  });
});
