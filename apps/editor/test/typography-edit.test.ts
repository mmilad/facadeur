import { describe, expect, it } from 'vitest';
import { readTokenTree, setTokenInTree, type TokenTree } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import {
  assertTypographyTokenPath,
  createDefaultTypographyToken,
  isValidTypographyTokenPath,
  suggestTypographyPath,
  tokenPathsReferencingTypography,
} from '../src/domain/typography-edit.js';
import { tokenMatchesDomain } from '../src/ui/sidebar/design/design-domain.js';

describe('typography-edit', () => {
  it('creates a default typography token matching type.body', () => {
    expect(createDefaultTypographyToken()).toEqual({
      $type: 'typography',
      $value: {
        fontFamily: '{font.sans}',
        fontSize: '16px',
        fontWeight: '{font.weight.regular}',
        lineHeight: 1.5,
        letterSpacing: '0',
      },
    });
  });

  it('validates typography paths with TOKEN_SEGMENT segments under type.*', () => {
    expect(isValidTypographyTokenPath('type.lead')).toBe(true);
    expect(isValidTypographyTokenPath('type.custom2')).toBe(true);
    expect(isValidTypographyTokenPath('color.accent.default')).toBe(false);
    expect(isValidTypographyTokenPath('type.Bad')).toBe(false);
    expect(isValidTypographyTokenPath('body')).toBe(false);
    expect(() => assertTypographyTokenPath('not-type')).toThrow(/type\./i);
  });

  it('suggests unused typography paths', () => {
    expect(suggestTypographyPath(['type.body'])).toBe('type.custom');
    expect(suggestTypographyPath(['type.custom'])).toBe('type.custom2');
  });

  it('finds token paths that reference a typography token', () => {
    const design = createProjectTemplateDocument();
    const tokens = setTokenInTree((design.tokens ?? {}) as TokenTree, 'type.quote', {
      $type: 'typography',
      $value: '{type.body}',
    });
    const refs = tokenPathsReferencingTypography(tokens, 'type.body');
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.includes('type.body')).toBe(false);
    expect(refs).toContain('type.quote');
    expect(tokenPathsReferencingTypography(tokens, 'type.missing')).toEqual([]);
  });

  it('new typography paths match the typography design domain', () => {
    const design = createProjectTemplateDocument();
    const path = 'type.custom';
    assertTypographyTokenPath(path);
    const token = createDefaultTypographyToken();
    expect(tokenMatchesDomain(path, token.$type ?? 'typography', 'typography')).toBe(true);
    const indexed = readTokenTree(design.tokens);
    expect(indexed.tokens.has(path)).toBe(false);
  });
});
