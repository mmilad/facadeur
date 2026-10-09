import { describe, expect, it } from 'vitest';
import { tokenDisplayLabel, tokenTitle } from '../src/ui/controls/token-presentation';
import { catalogTokenOptions } from '../src/ui/controls/token-options';
import { matchesSearch } from '../src/ui/form/types/options';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('unified token presentation', () => {
  it('prefers saved labels and falls back to a stable UUID hint for global tokens', () => {
    expect(tokenTitle('color.red')).toBe('Red');
    expect(tokenTitle('color.neutral')).toBe('Neutral');
    expect(tokenDisplayLabel(fixtureTokenRef(fixtureIds.tokens.color.red._500))).toBe(
      'Token 550e8400',
    );
    expect(tokenDisplayLabel(fixtureTokenRef(fixtureIds.tokens.color.red._500), 'Warm')).toBe(
      'Warm',
    );
    expect(tokenDisplayLabel(fixtureTokenRef(fixtureIds.tokens.color.red._500), '  ')).toBe(
      'Token 550e8400',
    );
    expect(
      tokenDisplayLabel(fixtureTokenRef(fixtureIds.tokens.color.text.primary), 'Primary'),
    ).toBe('Primary');
    expect(tokenDisplayLabel(fixtureTokenRef(testUuid32), 'Brand highlight')).toBe(
      'Brand highlight',
    );
    expect(tokenDisplayLabel(fixtureTokenRef(fixtureIds.tokens.space.gap.md))).toBe(
      'Token 550e8400',
    );
  });

  it('searches terms across label, technical path and value regardless of case or order', () => {
    expect(matchesSearch('warm RED', 'Warm', 'color.red.500', '#ff0000')).toBe(true);
    expect(matchesSearch('500 #ff', 'Warm', 'color.red.500', '#ff0000')).toBe(true);
    expect(matchesSearch('blue warm', 'Warm', 'color.red.500')).toBe(false);
    expect(matchesSearch('   ', 'Red')).toBe(true);
  });

  it('keeps ids and unknown refs intact and disambiguates duplicate names with paths', () => {
    const options = catalogTokenOptions(
      [fixtureTokenRef(fixtureIds.tokens.color.red._500), fixtureTokenRef(testUuid33)],
      fixtureTokenRef(testUuid34),
      'None',
      (ref) => tokenDisplayLabel(ref, ref.endsWith('412}') ? 'Warm' : undefined),
    );
    expect(options[1]?.value).toBe(fixtureTokenRef(testUuid34));
    expect(options[2]?.label).toBe('Warm');
    expect(options[3]?.label).toBe('Warm');
    expect(options[2]?.description).toBe('');
    expect(options[3]?.description).toBe('');
  });
});
