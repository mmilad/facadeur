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

describe('border control value', () => {
  it('parses border shorthand', () => {
    expect(parseBorderShorthand('1px solid transparent')).toEqual({
      width: '1px',
      style: 'solid',
      color: 'transparent',
    });
  });

  it('reads border from shorthand declarations', () => {
    expect(readBorder({ border: '1px solid {color.border.default}' })).toEqual({
      width: '1px',
      style: 'solid',
      color: '{color.border.default}',
    });
  });

  it('merges longhands with a shorthand without dropping shorthand fields', () => {
    expect(readBorder({ border: '1px solid red', borderColor: '{color.border.default}' })).toEqual({
      width: '1px',
      style: 'solid',
      color: '{color.border.default}',
    });
  });

  it('serializes border to longhands when width and color are set', () => {
    expect(
      serializeBorder({ width: '1px', style: 'solid', color: '{color.border.default}' }),
    ).toEqual({
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '{color.border.default}',
    });
  });

  it('reads uniform border radius', () => {
    expect(readBorderRadius({ borderRadius: '{radius.full}' })).toEqual({
      mode: 'uniform',
      value: '{radius.full}',
    });
  });

  it('reads kebab-case border radius shorthand', () => {
    expect(readBorderRadius({ 'border-radius': '{radius.full}' })).toEqual({
      mode: 'uniform',
      value: '{radius.full}',
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
      topLeft: '{radius.sm}',
      topRight: '{radius.md}',
      bottomRight: '{radius.md}',
      bottomLeft: '{radius.sm}',
    };
    expect(serializeBorderRadius(corners)).toEqual({
      borderTopLeftRadius: '{radius.sm}',
      borderTopRightRadius: '{radius.md}',
      borderBottomRightRadius: '{radius.md}',
      borderBottomLeftRadius: '{radius.sm}',
    });
    expect(readBorderRadius(serializeBorderRadius(corners))).toEqual(corners);
  });

  it('only combines corners when all values match', () => {
    expect(
      uniformRadiusValue({
        mode: 'corners',
        topLeft: '{radius.sm}',
        topRight: '{radius.sm}',
        bottomRight: '{radius.sm}',
        bottomLeft: '{radius.sm}',
      }),
    ).toBe('{radius.sm}');
    expect(
      uniformRadiusValue({
        mode: 'corners',
        topLeft: '{radius.sm}',
        topRight: '{radius.md}',
        bottomRight: '{radius.sm}',
        bottomLeft: '{radius.sm}',
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
        topLeft: '{radius.lg}',
        topRight: '{radius.md}',
        bottomRight: '{radius.md}',
        bottomLeft: '{radius.md}',
      }),
    ).toEqual({
      borderRadius: '{radius.md}',
      borderTopLeftRadius: '{radius.lg}',
    });
  });
});
