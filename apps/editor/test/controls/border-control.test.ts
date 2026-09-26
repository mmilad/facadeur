import { describe, expect, it } from 'vitest';
import {
  parseBorderShorthand,
  readBorder,
  readBorderRadius,
  serializeBorder,
  serializeBorderRadius,
} from '../../src/ui/controls/border/value.js';

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
});
