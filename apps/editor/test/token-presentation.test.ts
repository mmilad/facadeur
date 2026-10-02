import { describe, expect, it } from 'vitest';
import { tokenDisplayLabel, tokenTitle } from '../src/ui/controls/token-presentation.js';
import { catalogTokenOptions } from '../src/ui/controls/token-options.js';
import { matchesSearch } from '../src/ui/form/types/options.js';

describe('unified token presentation', () => {
  it('removes the namespace from groups and composes group plus leaf labels', () => {
    expect(tokenTitle('color.red')).toBe('Red');
    expect(tokenTitle('color.neutral')).toBe('Neutral');
    expect(tokenDisplayLabel('{color.red.500}')).toBe('Red 500');
    expect(tokenDisplayLabel('{color.red.500}', 'Warm')).toBe('Red Warm');
    expect(tokenDisplayLabel('{color.red.500}', '  ')).toBe('Red 500');
    expect(tokenDisplayLabel('{color.text.primary}', 'Primary')).toBe('Text Primary');
    expect(tokenDisplayLabel('{space.gap.md}')).toBe('Gap Md');
  });

  it('searches terms across label, technical path and value regardless of case or order', () => {
    expect(matchesSearch('warm RED', 'Red Warm', 'color.red.500', '#ff0000')).toBe(true);
    expect(matchesSearch('500 #ff', 'Red Warm', 'color.red.500', '#ff0000')).toBe(true);
    expect(matchesSearch('blue warm', 'Red Warm', 'color.red.500')).toBe(false);
    expect(matchesSearch('   ', 'Red')).toBe(true);
  });

  it('keeps ids and unknown refs intact and disambiguates duplicate names with paths', () => {
    const options = catalogTokenOptions(
      ['{color.red.500}', '{color.red.600}'],
      '{future.color.surface}',
      'None',
      (ref) => tokenDisplayLabel(ref, ref.startsWith('{color') ? 'Warm' : undefined),
    );
    expect(options[1]?.value).toBe('{future.color.surface}');
    expect(options[2]?.label).toBe('Red Warm');
    expect(options[3]?.label).toBe('Red Warm');
    expect(options[2]?.description).toBe('color.red.500');
    expect(options[3]?.description).toBe('color.red.600');
  });
});
