import { describe, expect, it } from 'vitest';
import {
  customColorDraft,
  inferColorMode,
  isColorStyleProperty,
  isColorTokenRef,
} from '../../src/ui/controls/color/value';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('color control value', () => {
  it('detects token references', () => {
    expect(isColorTokenRef(fixtureTokenRef(fixtureIds.tokens.color.accent.default))).toBe(true);
    expect(isColorTokenRef('#AABBCC')).toBe(false);
    expect(isColorTokenRef(' red ')).toBe(false);
  });

  it('infers mode from value', () => {
    expect(inferColorMode('')).toBe('custom');
    expect(inferColorMode(fixtureTokenRef(testUuid4))).toBe('token');
    expect(inferColorMode('#112233')).toBe('custom');
  });

  it('maps known and heuristic color style properties', () => {
    expect(isColorStyleProperty('color')).toBe(true);
    expect(isColorStyleProperty('background-color')).toBe(true);
    expect(isColorStyleProperty('border-top-color')).toBe(true);
    expect(isColorStyleProperty('margin')).toBe(false);
  });

  it('strips token refs from custom color draft', () => {
    expect(customColorDraft(fixtureTokenRef(testUuid4))).toBe('');
    expect(customColorDraft('#AABBCCFF')).toBe('#AABBCCFF');
  });
});
