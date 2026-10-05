import { describe, expect, it } from 'vitest';
import { eventDataSelection } from '../src/domain/events.js';

describe('event editor helpers', () => {
  it('adapts a legacy payload declaration to the shared field contract shape', () => {
    expect(
      eventDataSelection({ name: 'commit', payload: { value: 'text', valid: 'boolean' } }),
    ).toEqual({
      fields: [
        { name: 'value', type: { kind: 'type', type: 'string' } },
        { name: 'valid', type: { kind: 'type', type: 'boolean' } },
      ],
    });
  });

  it('leaves events with no contract unconfigured', () => {
    expect(eventDataSelection({ name: 'close' })).toBeNull();
  });
});
