import { describe, expect, it } from 'vitest';
import { createProjectTemplate, loadTokens, renderDesignCss } from '@facadeur/tokens';
import type { FontFamilyDefinition } from '@facadeur/core';
import {
  breakpointIds,
  colorTokens,
  fontToken,
  space4Token,
  testBreakpoints,
  testTokens,
  tokenIds,
  tokenSet,
} from './fixtures';
const testUuid38 = globalThis.crypto.randomUUID();
const testUuid39 = globalThis.crypto.randomUUID();

describe('CSS output from UUID-keyed tokens', () => {
  it('emits derived selectors and resolves UUID references', () => {
    const css = renderDesignCss({
      tokens: tokenSet({
        color: {
          [tokenIds.blue500]: colorTokens[tokenIds.blue500]!,
          [tokenIds.accent]: colorTokens[tokenIds.accent]!,
        },
        space: { [tokenIds.space4]: space4Token },
      }),
      breakpoints: testBreakpoints,
    });

    expect(css).toBe(
      [
        ':root {',
        '  --color-accent-default: var(--color-blue-500);',
        '  --color-blue-500: #2563eb;',
        '  --space-4: 16px;',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('uses breakpoint UUIDs for sparse typography changes', () => {
    const design = loadTokens({ tokens: testTokens, breakpoints: testBreakpoints });
    const css = renderDesignCss({ tokens: testTokens, breakpoints: testBreakpoints });

    expect(css).toContain('--type-body--font-family: var(--font-inter);');
    expect(css).toContain('--type-body--font-size: 16px;');
    expect(css).toContain(
      [
        '@media (min-width: 768px) {',
        '  :root {',
        '    --type-body--font-size: 17px;',
        '  }',
        '}',
      ].join('\n'),
    );
    expect(css).toContain(
      [
        '@media (min-width: 1440px) {',
        '  :root {',
        '    --type-body--font-size: 18px;',
        '  }',
        '}',
      ].join('\n'),
    );
    expect(css).not.toContain('min-width: 375px');
    expect(
      design.properties.find((property) => property.name === '--type-body--font-size')?.breakpoints[
        breakpointIds.tablet
      ],
    ).toBe('17px');
  });

  it('emits file-backed font faces from a font-family token value', () => {
    const fileFont: FontFamilyDefinition = {
      ...fontToken,
      uuid: testUuid38,
      label: 'Source Serif',
      value: {
        family: 'Source Serif',
        weights: [400],
        styles: ['italic'],
        source: {
          type: 'file',
          files: [
            {
              weight: 400,
              style: 'italic',
              url: 'fonts/source-serif-italic.woff2',
              format: 'woff2',
            },
          ],
        },
        fallbacks: ['serif'],
      },
    };
    const css = renderDesignCss({ tokens: tokenSet({ font: { [fileFont.uuid]: fileFont } }) });

    expect(css).toContain(
      [
        '@font-face {',
        '  font-family: "Source Serif";',
        '  font-style: italic;',
        '  font-weight: 400;',
        '  src: url("fonts/source-serif-italic.woff2") format("woff2");',
        '}',
      ].join('\n'),
    );
    expect(css).toContain('--font-source-serif: "Source Serif", serif;');
  });

  it('rejects unknown and base breakpoint UUID overrides', () => {
    const unknown = tokenSet({
      space: {
        [tokenIds.space4]: {
          ...space4Token,
          breakpoints: { [testUuid39]: '20px' },
        },
      },
    });
    expect(() => loadTokens({ tokens: unknown, breakpoints: testBreakpoints })).toThrow(
      /unknown breakpoint/,
    );

    const repeatedBase = tokenSet({
      space: {
        [tokenIds.space4]: {
          ...space4Token,
          breakpoints: { [breakpointIds.phone]: '14px' },
        },
      },
    });
    expect(() => loadTokens({ tokens: repeatedBase, breakpoints: testBreakpoints })).toThrow(
      /repeats the base breakpoint/,
    );
  });
});

describe('project template', () => {
  const template = createProjectTemplate();

  it('resolves shared font, spacing, shadow, and typography tokens', () => {
    const design = loadTokens(template);
    const css = renderDesignCss(template);

    expect(design.properties.find((property) => property.name === '--space-4')?.value).toBe('16px');
    expect(design.properties.find((property) => property.name === '--space-gap-md')?.value).toBe(
      'var(--space-4)',
    );
    expect(design.properties.find((property) => property.name === '--shadow-md')?.value).toBeTruthy();
    expect(design.properties.some((property) => property.name.startsWith('--button-'))).toBe(false);
    expect(css).toContain('--type-body--font-size: 16px;');
    expect(css).toContain('--type-body--font-size: 17px;');
    expect(css).toContain('--type-body--font-size: 18px;');
    expect(css).not.toContain('min-width: 375px');
    expect(css.startsWith('@import url("https://fonts.googleapis.com/css2?family=Inter:')).toBe(true);
  });

  it('keeps component-tier groups out and preserves semantic primitives', () => {
    const design = loadTokens(template);

    expect(design.tokens.some((token) => token.path.startsWith('button.'))).toBe(false);
    expect(design.tokens.some((token) => token.path.startsWith('card.'))).toBe(false);
    expect(design.tokens.some((token) => token.path.startsWith('editor.'))).toBe(false);
    expect(design.tokens.some((token) => token.path.startsWith('input.'))).toBe(false);
    for (const token of design.tokens) {
      if (!token.path.startsWith('space.') || token.path.split('.').length !== 2) continue;
      if (token.path.startsWith('space.gap') || token.path.startsWith('space.inset')) continue;
      if (token.path.startsWith('space.stack')) continue;
      expect(token.value, token.path).toMatch(/^(?:0|\d+px)$/);
      if (typeof token.value === 'string' && token.value.endsWith('px')) {
        expect(Number(token.value.replace('px', '')) % 4, token.path).toBe(0);
      }
    }
    expect(design.tokens.find((token) => token.path === 'color.bg.canvas')?.tier).toBe('semantic');
    expect(design.tokens.find((token) => token.path === 'color.blue.500')?.tier).toBe('primitive');
  });
});
