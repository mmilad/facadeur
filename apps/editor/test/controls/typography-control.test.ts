import { describe, expect, it } from 'vitest';
import {
  formatTypographyFieldValue,
  inferTypographyFieldMode,
  isTypographyStyleProperty,
  isTypographyValue,
  isTokenRef,
  parseTypographyFieldValue,
  projectFontRefs,
} from '../../src/ui/controls/typography/value';
import {
  styleDeclarationKind,
  stylePropertyLabel,
} from '../../src/ui/controls/style/declaration-kind';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('typography control value', () => {
  it('detects token references', () => {
    expect(isTokenRef(fixtureTokenRef(fixtureIds.tokens.font.inter))).toBe(true);
    expect(isTokenRef('16px')).toBe(false);
  });

  it('builds project font refs', () => {
    expect(projectFontRefs([{ uuid: fixtureIds.tokens.font.inter }, { uuid: testUuid16 }])).toEqual(
      [fixtureTokenRef(fixtureIds.tokens.font.inter), fixtureTokenRef(testUuid16)],
    );
  });

  it('infers field mode', () => {
    expect(
      inferTypographyFieldMode(fixtureTokenRef(fixtureIds.tokens.font.inter), [
        fixtureTokenRef(fixtureIds.tokens.font.inter),
      ]),
    ).toBe('token');
    expect(inferTypographyFieldMode('Inter', [fixtureTokenRef(fixtureIds.tokens.font.inter)])).toBe(
      'custom',
    );
  });

  it('maps typography style properties', () => {
    expect(isTypographyStyleProperty('font-size')).toBe(true);
    expect(isTypographyStyleProperty('font-feature-settings')).toBe(true);
    expect(isTypographyStyleProperty('margin')).toBe(false);
    expect(styleDeclarationKind('fontWeight')).toBe('typography');
    expect(styleDeclarationKind('letterSpacing')).toBe('typography');
    expect(styleDeclarationKind('borderColor')).toBe('color');
    expect(styleDeclarationKind('textTransform')).toBe('enum');
  });

  it('turns internal style keys into readable labels', () => {
    expect(stylePropertyLabel('boxShadow')).toBe('Box shadow');
    expect(stylePropertyLabel('padding-block')).toBe('Padding block');
    expect(stylePropertyLabel('')).toBe('');
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
