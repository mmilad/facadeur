import { describe, expect, it } from 'vitest';
import {
  editShadowField,
  type DesignShadowValue,
} from '../src/ui/sidebar/design/DesignShadowEditor.js';
import { editTypographyField } from '../src/ui/sidebar/design/DesignTypographyEditor.js';

describe('complex design token editor adapters', () => {
  it('keeps typography breakpoint edits sparse and preserves other overrides', () => {
    const base = {
      fontFamily: '{font.sans}',
      fontSize: '16px',
      fontWeight: '{font.weight.regular}',
      lineHeight: 1.5,
      letterSpacing: '0',
    };
    const stored = { fontSize: '20px' };
    expect(editTypographyField(stored, 'fontSize', '24px', { breakpoint: true, base })).toEqual({
      fontSize: '24px',
    });
    expect(editTypographyField(stored, 'fontSize', '16px', { breakpoint: true, base })).toBeNull();
    expect(
      editTypographyField(
        { fontSize: '20px', fontWeight: '{font.weight.bold}' },
        'fontSize',
        null,
        { breakpoint: true, base },
      ),
    ).toEqual({ fontWeight: '{font.weight.bold}' });
  });

  it('keeps raw aliases and the array shape when editing structured shadows', () => {
    const shadows: DesignShadowValue[] = [
      {
        color: '{color.shadow}',
        offsetX: '0px',
        offsetY: '2px',
        blur: '{space.4}',
        spread: '0px',
      },
      {
        color: '#00000022',
        offsetX: '0px',
        offsetY: '4px',
        blur: '8px',
      },
    ];
    const next = editShadowField(shadows, 1, 'offsetY', '6px');
    expect(Array.isArray(next)).toBe(true);
    expect(next).toEqual([shadows[0], { ...shadows[1], offsetY: '6px' }]);
    expect((next as DesignShadowValue[])[0]?.color).toBe('{color.shadow}');
  });

  it('allows resetting an optional inset without rewriting aliases', () => {
    const value: DesignShadowValue = {
      color: '{color.shadow}',
      offsetX: '0px',
      offsetY: '1px',
      blur: '2px',
      inset: true,
    };
    expect(editShadowField(value, 0, 'inset', false)).toEqual({
      color: '{color.shadow}',
      offsetX: '0px',
      offsetY: '1px',
      blur: '2px',
    });
  });
});
