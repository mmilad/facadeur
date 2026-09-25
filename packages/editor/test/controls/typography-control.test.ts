import { describe, expect, it } from 'vitest';
import {
  formatTypographyFieldValue,
  inferTypographyFieldMode,
  isTypographyStyleProperty,
  isTypographyValue,
  isTokenRef,
  parseTypographyFieldValue,
  projectFontRefs,
} from '../../src/ui/controls/typography/value.js';

describe('typography control value', () => {
  it('detects token references', () => {
    expect(isTokenRef('{font.sans}')).toBe(true);
    expect(isTokenRef('16px')).toBe(false);
  });

  it('builds project font refs', () => {
    expect(projectFontRefs([{ id: 'sans' }, { id: 'mono' }])).toEqual([
      '{font.mono}',
      '{font.sans}',
    ]);
  });

  it('infers field mode', () => {
    expect(inferTypographyFieldMode('{font.sans}', ['{font.sans}'])).toBe('token');
    expect(inferTypographyFieldMode('Inter', ['{font.sans}'])).toBe('custom');
  });

  it('maps typography style properties', () => {
    expect(isTypographyStyleProperty('font-size')).toBe(true);
    expect(isTypographyStyleProperty('font-feature-settings')).toBe(true);
    expect(isTypographyStyleProperty('margin')).toBe(false);
  });

  it('formats and parses typography fields', () => {
    expect(formatTypographyFieldValue(1.5)).toBe('1.5');
    expect(parseTypographyFieldValue('lineHeight', '1.5')).toBe(1.5);
    expect(parseTypographyFieldValue('fontWeight', '600')).toBe(600);
    expect(parseTypographyFieldValue('fontFamily', 'Inter, sans-serif')).toEqual([
      'Inter',
      'sans-serif',
    ]);
  });

  it('recognizes typography token objects', () => {
    expect(isTypographyValue({ fontSize: '16px' })).toBe(true);
    expect(isTypographyValue('16px')).toBe(false);
  });
});
