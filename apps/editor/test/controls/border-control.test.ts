import { describe, expect, it } from 'vitest';
import {
  parseBorderShorthand,
  expandRadiusValue,
  readBorder,
  readBorderRadius,
  serializeBorder,
  serializeBorderRadius,
  uniformRadiusValue,
} from '../../src/ui/controls/border/value';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('border control value', () => {
  it('parses border shorthand', () => {
    expect(parseBorderShorthand('1px solid transparent')).toEqual({
      width: '1px',
      style: 'solid',
      color: 'transparent',
    });
  });

  it('reads border from shorthand declarations', () => {
    expect(
      readBorder({
        border: '1px solid ' + fixtureTokenRef(fixtureIds.tokens.color.border.default),
      }),
    ).toEqual({
      width: '1px',
      style: 'solid',
      color: fixtureTokenRef(fixtureIds.tokens.color.border.default),
    });
  });

  it('merges longhands with a shorthand without dropping shorthand fields', () => {
    expect(
      readBorder({
        border: '1px solid red',
        borderColor: fixtureTokenRef(fixtureIds.tokens.color.border.default),
      }),
    ).toEqual({
      width: '1px',
      style: 'solid',
      color: fixtureTokenRef(fixtureIds.tokens.color.border.default),
    });
  });

  it('serializes border to longhands when width and color are set', () => {
    expect(
      serializeBorder({
        width: '1px',
        style: 'solid',
        color: fixtureTokenRef(fixtureIds.tokens.color.border.default),
      }),
    ).toEqual({
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: fixtureTokenRef(fixtureIds.tokens.color.border.default),
    });
  });

  it('reads uniform border radius', () => {
    expect(
      readBorderRadius({ borderRadius: fixtureTokenRef(fixtureIds.tokens.radius.full) }),
    ).toEqual({
      mode: 'uniform',
      value: fixtureTokenRef(fixtureIds.tokens.radius.full),
    });
  });

  it('reads kebab-case border radius shorthand', () => {
    expect(
      readBorderRadius({ 'border-radius': fixtureTokenRef(fixtureIds.tokens.radius.full) }),
    ).toEqual({
      mode: 'uniform',
      value: fixtureTokenRef(fixtureIds.tokens.radius.full),
    });
  });

  it('merges radius longhands over the border-radius shorthand', () => {
    expect(
      readBorderRadius({
        'border-radius': '4px',
        'border-top-left-radius': '8px',
      }),
    ).toEqual({
      mode: 'corners',
      topLeft: '8px',
      topRight: '4px',
      bottomRight: '4px',
      bottomLeft: '4px',
    });
  });

  it('round-trips per-corner radius', () => {
    const corners = {
      mode: 'corners' as const,
      topLeft: fixtureTokenRef(fixtureIds.tokens.radius.sm),
      topRight: fixtureTokenRef(fixtureIds.tokens.radius.md),
      bottomRight: fixtureTokenRef(fixtureIds.tokens.radius.md),
      bottomLeft: fixtureTokenRef(fixtureIds.tokens.radius.sm),
    };
    expect(serializeBorderRadius(corners)).toEqual({
      borderTopLeftRadius: fixtureTokenRef(fixtureIds.tokens.radius.sm),
      borderTopRightRadius: fixtureTokenRef(fixtureIds.tokens.radius.md),
      borderBottomRightRadius: fixtureTokenRef(fixtureIds.tokens.radius.md),
      borderBottomLeftRadius: fixtureTokenRef(fixtureIds.tokens.radius.sm),
    });
    expect(readBorderRadius(serializeBorderRadius(corners))).toEqual(corners);
  });

  it('only combines corners when all values match', () => {
    expect(
      uniformRadiusValue({
        mode: 'corners',
        topLeft: fixtureTokenRef(fixtureIds.tokens.radius.sm),
        topRight: fixtureTokenRef(fixtureIds.tokens.radius.sm),
        bottomRight: fixtureTokenRef(fixtureIds.tokens.radius.sm),
        bottomLeft: fixtureTokenRef(fixtureIds.tokens.radius.sm),
      }),
    ).toBe(fixtureTokenRef(fixtureIds.tokens.radius.sm));
    expect(
      uniformRadiusValue({
        mode: 'corners',
        topLeft: fixtureTokenRef(fixtureIds.tokens.radius.sm),
        topRight: fixtureTokenRef(fixtureIds.tokens.radius.md),
        bottomRight: fixtureTokenRef(fixtureIds.tokens.radius.sm),
        bottomLeft: fixtureTokenRef(fixtureIds.tokens.radius.sm),
      }),
    ).toBeNull();
  });

  it('expands a radius shorthand in CSS corner order', () => {
    expect(expandRadiusValue('4px 8px / 2px 6px')).toEqual({
      mode: 'corners',
      topLeft: '4px 2px',
      topRight: '8px 6px',
      bottomRight: '4px 2px',
      bottomLeft: '8px 6px',
    });
    expect(expandRadiusValue('calc(4px + 2px)')).toEqual({
      mode: 'corners',
      topLeft: 'calc(4px + 2px)',
      topRight: 'calc(4px + 2px)',
      bottomRight: 'calc(4px + 2px)',
      bottomLeft: 'calc(4px + 2px)',
    });
  });

  it('keeps a uniform radius as one declaration when one corner changes', () => {
    expect(
      serializeBorderRadius({
        mode: 'corners',
        topLeft: fixtureTokenRef(fixtureIds.tokens.radius.lg),
        topRight: fixtureTokenRef(fixtureIds.tokens.radius.md),
        bottomRight: fixtureTokenRef(fixtureIds.tokens.radius.md),
        bottomLeft: fixtureTokenRef(fixtureIds.tokens.radius.md),
      }),
    ).toEqual({
      borderRadius: fixtureTokenRef(fixtureIds.tokens.radius.md),
      borderTopLeftRadius: fixtureTokenRef(fixtureIds.tokens.radius.lg),
    });
  });
});
