import { describe, expect, it } from 'vitest';
import { DocumentError } from '@facadeur/core';
import { loadTokens } from '@facadeur/tokens';

const colorGroup = {
  color: {
    $type: 'color',
    blue: {
      '500': { $value: '#2563eb', $description: 'Primary blue' },
    },
    accent: { $value: '{color.blue.500}' },
  },
};

describe('DTCG parser', () => {
  it('inherits $type from the nearest group and lets a token override it', () => {
    const design = loadTokens({
      tokens: {
        space: {
          $type: 'dimension',
          sm: { $value: '8px' },
          paint: { $type: 'color', $value: '#fff' },
        },
      },
    });
    expect(design.tokens.find((token) => token.path === 'space.sm')).toMatchObject({
      type: 'dimension',
      value: '8px',
    });
    expect(design.tokens.find((token) => token.path === 'space.paint')).toMatchObject({
      type: 'color',
    });
  });

  it('inherits tier from a group and lets a nested group override it', () => {
    const design = loadTokens({ tokens: colorGroup });
    expect(design.tokens.find((token) => token.path === 'color.blue.500')?.tier).toBeUndefined();
    const tiered = loadTokens({
      tokens: {
        color: {
          $type: 'color',
          $extensions: { facadeur: { tier: 'primitive' } },
          blue: { '500': { $value: '#2563eb' } },
          bg: {
            $extensions: { facadeur: { tier: 'semantic' } },
            canvas: { $value: '{color.blue.500}' },
          },
        },
      },
    });
    expect(tiered.tokens.find((token) => token.path === 'color.blue.500')?.tier).toBe('primitive');
    expect(tiered.tokens.find((token) => token.path === 'color.bg.canvas')?.tier).toBe('semantic');
  });

  it('resolves a reference chain to var() and keeps the description', () => {
    const design = loadTokens({
      tokens: {
        color: {
          $type: 'color',
          blue: { '500': { $value: '#2563eb' } },
          mid: { $value: '{color.blue.500}' },
          accent: { $value: '{color.mid}' },
        },
      },
    });
    const accent = design.properties.find((property) => property.name === '--color-accent');
    expect(accent?.value).toBe('var(--color-mid)');
    expect(design.tokens.find((token) => token.path === 'color.blue.500')?.description).toBe(
      undefined,
    );
    const described = loadTokens({ tokens: colorGroup });
    expect(described.tokens.find((token) => token.path === 'color.blue.500')?.description).toBe(
      'Primary blue',
    );
  });

  it('resolves references inside shadow and typography composites', () => {
    const design = loadTokens({
      fonts: [
        {
          id: 'sans',
          family: 'Inter',
          weights: [400],
          source: { type: 'google', family: 'Inter' },
          fallbacks: ['sans-serif'],
        },
      ],
      tokens: {
        color: { $type: 'color', ink: { $value: '#111111' } },
        shadow: {
          $type: 'shadow',
          card: {
            $value: {
              color: '{color.ink}',
              offsetX: '0px',
              offsetY: '4px',
              blur: '12px',
              spread: '0px',
            },
          },
        },
        type: {
          $type: 'typography',
          body: {
            $value: {
              fontFamily: '{font.sans}',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: 1.5,
            },
          },
        },
      },
    });
    expect(design.properties.find((property) => property.name === '--shadow-card')?.value).toBe(
      '0px 4px 12px 0px var(--color-ink)',
    );
    expect(
      design.properties.find((property) => property.name === '--type-body--font-family')?.value,
    ).toBe('var(--font-sans)');
  });

  it('reports a reference cycle with the path that closed it', () => {
    expect(() =>
      loadTokens({
        tokens: {
          color: {
            $type: 'color',
            a: { $value: '{color.b}' },
            b: { $value: '{color.a}' },
          },
        },
      }),
    ).toThrow(DocumentError);
    try {
      loadTokens({
        tokens: {
          color: {
            $type: 'color',
            a: { $value: '{color.b}' },
            b: { $value: '{color.a}' },
          },
        },
      });
    } catch (error) {
      expect(error).toMatchObject({ code: 'token-cycle' });
      expect((error as Error).message).toBe(
        'Cycle in token references: color.a → color.b → color.a',
      );
    }
  });

  it('reports a missing reference with the token that asked for it', () => {
    expect(() => loadTokens({ tokens: colorGroup })).not.toThrow();
    expect(() =>
      loadTokens({
        tokens: {
          color: { $type: 'color', accent: { $value: '{color.missing}' } },
        },
      }),
    ).toThrow(/Missing token "\{color\.missing\}" referenced by "color\.accent"/);
  });

  it('rejects a token whose reference has the wrong type', () => {
    expect(() =>
      loadTokens({
        tokens: {
          color: { $type: 'color', ink: { $value: '#111111' } },
          space: { $type: 'dimension', gap: { $value: '{color.ink}' } },
        },
      }),
    ).toThrow(/expects a dimension/);
  });

  it('rejects a token with children, a missing type, and a bad name', () => {
    expect(() =>
      loadTokens({
        tokens: { color: { $type: 'color', $value: '#fff', blue: { $value: '#00f' } } },
      }),
    ).toThrow(/cannot contain child/);
    expect(() => loadTokens({ tokens: { ink: { $value: '#fff' } } })).toThrow(/has no \$type/);
    expect(() =>
      loadTokens({ tokens: { Color: { $type: 'color', ink: { $value: '#fff' } } } }),
    ).toThrow(/invalid segment/);
  });
});
