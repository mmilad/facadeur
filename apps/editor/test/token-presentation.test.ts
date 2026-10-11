import { describe, expect, it } from 'vitest';
import { tokenDisplayLabel, tokenTitle } from '../src/ui/controls/token-presentation';
import { catalogTokenOptions } from '../src/ui/controls/token-options';
import { matchesSearch } from '../src/ui/design/tokens/token-search';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('unified token presentation', () => {
  it('formats path labels and uses a stable UUID hint for unresolved token references', () => {
    expect(tokenTitle('color.red')).toBe('Red');
    expect(tokenTitle('color.neutral')).toBe('Neutral');
    expect(tokenDisplayLabel('color.red.500')).toBe('Colors / Red / 500');
    expect(tokenDisplayLabel('color.red.500', 'Warm')).toBe('Colors / Red / Warm');
    expect(tokenDisplayLabel('color.red.500', '  ')).toBe('Colors / Red / 500');
    expect(tokenDisplayLabel('color.text.primary', 'Primary')).toBe('Colors / Text / Primary');
    expect(tokenDisplayLabel(fixtureTokenRef(fixtureIds.tokens.color.red._500))).toBe(
      'Token 550e8400',
    );
    expect(tokenDisplayLabel('space.gap.md')).toBe('Spacing / Gap / Md');
  });

  it('searches terms across label, technical path and value regardless of case or order', () => {
    expect(matchesSearch('warm RED', 'Warm', 'color.red.500', '#ff0000')).toBe(true);
    expect(matchesSearch('500 #ff', 'Warm', 'color.red.500', '#ff0000')).toBe(true);
    expect(matchesSearch('blue warm', 'Warm', 'color.red.500')).toBe(false);
    expect(matchesSearch('   ', 'Red')).toBe(true);
  });

  it('keeps UUIDs intact and disambiguates duplicate display labels with their paths', () => {
    const options = catalogTokenOptions(
      [
        fixtureTokenRef(fixtureIds.tokens.color.red._500),
        fixtureTokenRef(fixtureIds.tokens.color.blue._500),
      ],
      fixtureTokenRef(fixtureIds.tokens.color.accent.default),
      'None',
      (ref) =>
        ref === fixtureTokenRef(fixtureIds.tokens.color.red._500) ||
        ref === fixtureTokenRef(fixtureIds.tokens.color.blue._500)
          ? 'Warm'
          : tokenDisplayLabel(ref),
    );
    expect(options[1]?.value).toBe(fixtureTokenRef(fixtureIds.tokens.color.accent.default));
    expect(options[2]?.label).toBe('Warm');
    expect(options[3]?.label).toBe('Warm');
    expect(options[2]?.description).toBe('');
    expect(options[3]?.description).toBe('');
  });
});
