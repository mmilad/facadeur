import { describe, expect, it } from 'vitest';
import { boxWith } from '../../src/ui/controls/spacing/index';
import { isTokenReference } from '../../src/ui/controls/fields/TokenValueControl';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('spacing control boxWith', () => {
  it('drops empty sides to null', () => {
    expect(
      boxWith({ top: fixtureTokenRef(fixtureIds.tokens.space.scale.step1) }, 'top', null),
    ).toBeNull();
    expect(
      boxWith(
        {
          top: fixtureTokenRef(fixtureIds.tokens.space.scale.step1),
          left: fixtureTokenRef(fixtureIds.tokens.space.scale.step2),
        },
        'top',
        null,
      ),
    ).toEqual({
      left: fixtureTokenRef(fixtureIds.tokens.space.scale.step2),
    });
  });

  it('preserves an otherwise unknown token reference', () => {
    expect(isTokenReference('{future.spacing.large}')).toBe(true);
    expect(isTokenReference('12px')).toBe(false);
  });
});
