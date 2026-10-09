import { describe, expect, it } from 'vitest';
import { DocumentError, tokenReferenceValue } from '@facadeur/core';
import { activeBreakpoints, configuredBreakpoints, loadTokens } from '@facadeur/tokens';
import {
  breakpointIds,
  colorTokens,
  fontToken,
  record,
  space4Token,
  testBreakpoints,
  testTokens,
  tokenIds,
  tokenSet,
} from './fixtures';
const testUuid40 = globalThis.crypto.randomUUID();

describe('UUID-keyed token resolution', () => {
  it('derives CSS paths from family, group, and label while retaining UUID identity', () => {
    const design = loadTokens({ tokens: testTokens, breakpoints: testBreakpoints });

    expect(design.tokens.find((token) => token.path === 'color.blue.500')).toMatchObject({
      name: '--color-blue-500',
      type: 'color',
      value: '#2563eb',
    });
    expect(design.tokens.find((token) => token.path === 'color.accent.Default')?.tier).toBe(
      'semantic',
    );
    expect(design.properties.find((property) => property.name === '--color-accent-default')?.value)
      .toBe('var(--color-blue-500)');
    expect(design.fonts).toEqual([fontToken]);
  });

  it('resolves UUID references inside shadow, typography, and font values', () => {
    const design = loadTokens({ tokens: testTokens, breakpoints: testBreakpoints });

    expect(design.properties.find((property) => property.name === '--shadow-lg')?.value).toBe(
      '0px 16px 40px 0px #0f172a29',
    );
    expect(
      design.properties.find((property) => property.name === '--type-body--font-family')?.value,
    ).toBe('var(--font-inter)');
    expect(
      design.properties.find((property) => property.name === '--type-body--font-size')?.breakpoints[
        breakpointIds.tablet
      ],
    ).toBe('17px');
  });

  it('reports a reference cycle by stable UUID', () => {
    const tokens = tokenSet({
      color: {
        [tokenIds.cycleA]: record(
          tokenIds.cycleA,
          'A',
          'cycle',
          'color',
          tokenReferenceValue(tokenIds.cycleB),
        ),
        [tokenIds.cycleB]: record(
          tokenIds.cycleB,
          'B',
          'cycle',
          'color',
          tokenReferenceValue(tokenIds.cycleA),
        ),
      },
    });

    expect(() => loadTokens({ tokens })).toThrow(DocumentError);
    expect(() => loadTokens({ tokens })).toThrow('Cycle in token references:');
  });

  it('rejects missing and mismatched UUID references', () => {
    const missing = tokenSet({
      color: {
        [tokenIds.accent]: {
          ...colorTokens[tokenIds.accent]!,
          value: tokenReferenceValue(tokenIds.missing),
        },
      },
    });
    expect(() => loadTokens({ tokens: missing })).toThrow(/Missing token/);

    const mismatch = tokenSet({
      color: {
        [tokenIds.accent]: {
          ...colorTokens[tokenIds.accent]!,
          value: tokenReferenceValue(tokenIds.space4),
        },
      },
      space: {
        [tokenIds.space4]: space4Token,
      },
    });
    expect(() => loadTokens({ tokens: mismatch })).toThrow(/expects a color/);
  });

  it('requires UUID keys and complete records instead of interpreting DTCG paths', () => {
    expect(() => loadTokens({ tokens: { color: { 'blue.500': {} } } })).toThrow(/must be a UUID/);
    const { valueType, ...incompleteBlue500 } = colorTokens[tokenIds.blue500]!;
    expect(valueType).toBe('color');
    expect(() =>
      loadTokens({
        tokens: {
          color: {
            [tokenIds.blue500]: incompleteBlue500,
          },
        },
      }),
    ).toThrow(/unknown valueType/);
  });
});

describe('breakpoint UUIDs', () => {
  it('keeps disabled viewports configured but excludes them from active output', () => {
    const configured = configuredBreakpoints([
      testBreakpoints[0]!,
      { ...testBreakpoints[1]!, enabled: false },
      testBreakpoints[2]!,
    ]);

    expect(configured.map((item) => item.uuid)).toEqual([
      breakpointIds.phone,
      breakpointIds.tablet,
      breakpointIds.laptop,
    ]);
    expect(activeBreakpoints(configured).map((item) => item.uuid)).toEqual([
      breakpointIds.phone,
      breakpointIds.laptop,
    ]);
  });

  it('rejects overrides keyed by an unknown UUID and duplicates of the base UUID', () => {
    const unknown = tokenSet({
      space: {
        [tokenIds.space4]: { ...space4Token,
          breakpoints: { [testUuid40]: '20px' },
        },
      },
    });
    expect(() => loadTokens({ tokens: unknown, breakpoints: testBreakpoints })).toThrow(
      /unknown breakpoint/,
    );

    const repeatedBase = tokenSet({
      space: {
        [tokenIds.space4]: { ...space4Token,
          breakpoints: { [breakpointIds.phone]: '12px' },
        },
      },
    });
    expect(() => loadTokens({ tokens: repeatedBase, breakpoints: testBreakpoints })).toThrow(
      /repeats the base breakpoint/,
    );
  });
});
