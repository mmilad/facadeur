import { describe, expect, it } from 'vitest';
import {
  editShadowField,
  type DesignShadowValue,
} from '../src/ui/sidebar/design/DesignShadowEditor';
import { editTypographyField } from '../src/ui/sidebar/design/DesignTypographyEditor';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('complex design token editor adapters', () => {
  it('keeps typography breakpoint edits sparse and preserves other overrides', () => {
    const base = {
      fontFamily: fixtureTokenRef(fixtureIds.tokens.font.inter),
      fontSize: '16px',
      fontWeight: fixtureTokenRef(testUuid19),
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
        { fontSize: '20px', fontWeight: fixtureTokenRef(testUuid20) },
        'fontSize',
        null,
        { breakpoint: true, base },
      ),
    ).toEqual({ fontWeight: fixtureTokenRef(testUuid20) });
  });

  it('keeps raw aliases and the array shape when editing structured shadows', () => {
    const shadows: DesignShadowValue[] = [
      {
        color: fixtureTokenRef(testUuid21),
        offsetX: '0px',
        offsetY: '2px',
        blur: fixtureTokenRef(fixtureIds.tokens.space.scale.step4),
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
    expect((next as DesignShadowValue[])[0]?.color).toBe(fixtureTokenRef(testUuid21));
  });

  it('allows resetting an optional inset without rewriting aliases', () => {
    const value: DesignShadowValue = {
      color: fixtureTokenRef(testUuid21),
      offsetX: '0px',
      offsetY: '1px',
      blur: '2px',
      inset: true,
    };
    expect(editShadowField(value, 0, 'inset', false)).toEqual({
      color: fixtureTokenRef(testUuid21),
      offsetX: '0px',
      offsetY: '1px',
      blur: '2px',
    });
  });
});
