import { describe, expect, it } from 'vitest';
import {
  customShadowDraft,
  inferShadowMode,
  isShadowStyleProperty,
  isShadowTokenRef,
} from '../../src/ui/controls/shadow/value.js';

describe('shadow control value', () => {
  it('detects token references', () => {
    expect(isShadowTokenRef('{shadow.md}')).toBe(true);
    expect(isShadowTokenRef('0 1px 2px #000')).toBe(false);
  });

  it('infers mode from value', () => {
    expect(inferShadowMode('')).toBe('custom');
    expect(inferShadowMode('{shadow.md}')).toBe('token');
    expect(inferShadowMode('0 8px 24px rgba(0,0,0,0.1)')).toBe('custom');
  });

  it('maps shadow style properties', () => {
    expect(isShadowStyleProperty('box-shadow')).toBe(true);
    expect(isShadowStyleProperty('text-shadow')).toBe(true);
    expect(isShadowStyleProperty('color')).toBe(false);
  });

  it('strips token refs from custom draft', () => {
    expect(customShadowDraft('{shadow.md}')).toBe('');
    expect(customShadowDraft('0 1px 2px #000')).toBe('0 1px 2px #000');
  });
});
