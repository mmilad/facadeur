import { describe, expect, it } from 'vitest';
import { boxWith } from '../../src/ui/controls/spacing/index.js';

describe('spacing control boxWith', () => {
  it('drops empty sides to null', () => {
    expect(boxWith({ top: '{space.1}' }, 'top', null)).toBeNull();
    expect(boxWith({ top: '{space.1}', left: '{space.2}' }, 'top', null)).toEqual({
      left: '{space.2}',
    });
  });
});
