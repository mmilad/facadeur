import { describe, expect, it } from 'vitest';
import {
  customColorDraft,
  inferColorMode,
  isColorStyleProperty,
  isColorTokenRef,
} from '../../src/ui/controls/color/value.js';

describe('color control value', () => {
  it('detects token references', () => {
    expect(isColorTokenRef('{color.accent.default}')).toBe(true);
    expect(isColorTokenRef('#AABBCC')).toBe(false);
    expect(isColorTokenRef(' red ')).toBe(false);
  });

  it('infers mode from value', () => {
    expect(inferColorMode('')).toBe('custom');
    expect(inferColorMode('{color.ink}')).toBe('token');
    expect(inferColorMode('#112233')).toBe('custom');
  });

  it('maps known and heuristic color style properties', () => {
    expect(isColorStyleProperty('color')).toBe(true);
    expect(isColorStyleProperty('background-color')).toBe(true);
    expect(isColorStyleProperty('border-top-color')).toBe(true);
    expect(isColorStyleProperty('margin')).toBe(false);
  });

  it('strips token refs from custom color draft', () => {
    expect(customColorDraft('{color.ink}')).toBe('');
    expect(customColorDraft('#AABBCCFF')).toBe('#AABBCCFF');
  });
});
