import { describe, expect, it } from 'vitest';
import { boxWith } from '../../src/ui/controls/spacing/index';
import { isTokenReference } from '../../src/ui/controls/fields/TokenValueControl';

describe('spacing control boxWith', () => {
  it('drops empty sides to null', () => {
    expect(boxWith({ top: '{space.1}' }, 'top', null)).toBeNull();
    expect(boxWith({ top: '{space.1}', left: '{space.2}' }, 'top', null)).toEqual({
      left: '{space.2}',
    });
  });

  it('preserves an otherwise unknown token reference', () => {
    expect(isTokenReference('{future.spacing.large}')).toBe(true);
    expect(isTokenReference('12px')).toBe(false);
  });
});
