import { describe, expect, it } from 'vitest';
import { createProjectTemplate, loadTokens, renderDesignCss } from '@facadeur/tokens';

describe('CSS output', () => {
  it('emits a root rule with stable names and var() for references', () => {
    const css = renderDesignCss({
      tokens: {
        color: {
          $type: 'color',
          blue: { '500': { $value: '#2563eb' } },
          accent: { $value: '{color.blue.500}' },
        },
        space: { $type: 'dimension', '4': { $value: '16px' } },
      },
    });
    expect(css).toBe(`:root {
  --color-accent: var(--color-blue-500);
  --color-blue-500: #2563eb;
  --space-4: 16px;
}
`);
  });

  it('emits media queries for every breakpoint except the smallest', () => {
    const css = renderDesignCss({
      breakpoints: [
        { id: 'desktop', minWidth: 1440 },
        { id: 'mobile', minWidth: 375 },
        { id: 'tablet', minWidth: 768 },
      ],
      tokens: {
        font: {
          size: {
            body: {
              $type: 'dimension',
              $value: '16px',
              $extensions: {
                facadeur: { breakpoints: { tablet: '17px', desktop: '18px' } },
              },
            },
          },
        },
      },
    });
    expect(css).not.toContain('min-width: 375px');
    expect(css).toBe(`:root {
  --font-size-body: 16px;
}

@media (min-width: 768px) {
  :root {
    --font-size-body: 17px;
  }
}

@media (min-width: 1440px) {
  :root {
    --font-size-body: 18px;
  }
}
`);
  });

  it('expands typography and only repeats fields that change per breakpoint', () => {
    const css = renderDesignCss({
      fonts: [
        {
          id: 'sans',
          family: 'Inter',
          weights: [400, 700],
          source: { type: 'google', family: 'Inter' },
          fallbacks: ['system-ui', 'sans-serif'],
        },
      ],
      tokens: {
        type: {
          $type: 'typography',
          body: {
            $value: {
              fontFamily: '{font.sans}',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: 1.5,
              letterSpacing: '0',
            },
            $extensions: {
              facadeur: { breakpoints: { tablet: { fontSize: '17px' } } },
            },
          },
        },
      },
    });
    expect(css).toContain(
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");',
    );
    expect(css).toContain('--font-sans: "Inter", system-ui, sans-serif;');
    expect(css).toContain('--type-body--font-size: 16px;');
    expect(css).toContain('--type-body--line-height: 1.5;');
    expect(css).toContain(`@media (min-width: 768px) {
  :root {
    --type-body--font-size: 17px;
  }
}`);
    expect(css).not.toContain('min-width: 375px');
    const media = css.split('@media')[1] ?? '';
    expect(media).not.toContain('line-height');
  });

  it('emits @font-face for file sources and quotes the family', () => {
    const css = renderDesignCss({
      fonts: [
        {
          id: 'display',
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
      ],
    });
    expect(css).toContain(`@font-face {
  font-family: "Source Serif";
  font-style: italic;
  font-weight: 400;
  src: url("fonts/source-serif-italic.woff2") format("woff2");
}`);
    expect(css).toContain('--font-display: "Source Serif", serif;');
  });

  it('rejects an unknown breakpoint and a repeat of the base breakpoint', () => {
    expect(() =>
      loadTokens({
        tokens: {
          space: {
            $type: 'dimension',
            md: {
              $value: '16px',
              $extensions: { facadeur: { breakpoints: { wide: '18px' } } },
            },
          },
        },
      }),
    ).toThrow(/unknown breakpoint "wide"/);
    expect(() =>
      loadTokens({
        tokens: {
          space: {
            $type: 'dimension',
            md: {
              $value: '16px',
              $extensions: { facadeur: { breakpoints: { mobile: '14px' } } },
            },
          },
        },
      }),
    ).toThrow(/base breakpoint "mobile"/);
  });
});

describe('project template', () => {
  const template = createProjectTemplate();

  it('resolves and publishes the spacing scale, a shadow, and the type scale', () => {
    const design = loadTokens(template);
    const css = renderDesignCss(template);
    expect(css).toBe(`${renderDesignCss(template)}`);
    expect(design.properties.find((property) => property.name === '--space-4')?.value).toBe('16px');
    expect(design.properties.find((property) => property.name === '--space-gap-md')?.value).toBe(
      'var(--space-4)',
    );
    expect(
      design.properties.find((property) => property.name === '--button-padding-x')?.value,
    ).toBe('var(--space-4)');
    expect(design.properties.find((property) => property.name === '--button-gap')?.value).toBe(
      'var(--space-gap-sm)',
    );
    expect(design.properties.find((property) => property.name === '--card-shadow')?.value).toBe(
      'var(--shadow-md)',
    );
    expect(css).toContain('--type-body--font-size: 16px;');
    expect(css).toContain('--type-body--font-size: 17px;');
    expect(css).toContain('--type-body--font-size: 18px;');
    expect(css).not.toContain('min-width: 375px');
    expect(css.startsWith('@import url("https://fonts.googleapis.com/css2?family=Inter:')).toBe(
      true,
    );
  });

  it('keeps component spacing on token references and primitive steps on the 4px grid', () => {
    const design = loadTokens(template);
    for (const token of design.tokens) {
      if (token.tier !== 'component' || token.type !== 'dimension') continue;
      expect(token.value, token.path).toMatch(/^\{.+\}$/);
    }
    for (const token of design.tokens) {
      if (!token.path.startsWith('space.') || token.path.split('.').length !== 2) continue;
      if (token.path.startsWith('space.gap') || token.path.startsWith('space.inset')) continue;
      if (token.path.startsWith('space.stack')) continue;
      expect(token.value, token.path).toMatch(/^(?:0|\d+px)$/);
      if (typeof token.value === 'string' && token.value.endsWith('px')) {
        expect(Number(token.value.replace('px', '')) % 4, token.path).toBe(0);
      }
    }
    expect(design.tokens.find((token) => token.path === 'button.padding.x')?.tier).toBe(
      'component',
    );
    expect(design.tokens.find((token) => token.path === 'color.bg.canvas')?.tier).toBe('semantic');
    expect(design.tokens.find((token) => token.path === 'color.blue.500')?.tier).toBe('primitive');
  });
});
