import { describe, expect, it } from 'vitest';
import {
  eventDefinitionFromDraft,
  eventPayloadText,
  parseEventPayload,
} from '../src/domain/events.js';

describe('event editor helpers', () => {
  it('parses compact semantic payloads and serializes them again', () => {
    const event = eventDefinitionFromDraft('commit', 'value:text, valid:boolean');
    expect(event).toEqual({
      name: 'commit',
      payload: { value: 'text', valid: 'boolean' },
    });
    expect(eventPayloadText(event)).toBe('value:text, valid:boolean');
  });

  it('allows events without a payload', () => {
    expect(eventDefinitionFromDraft('close', '  ')).toEqual({ name: 'close' });
    expect(parseEventPayload('')).toBeUndefined();
  });

  it('rejects malformed names, types, and duplicate payload keys', () => {
    expect(() => eventDefinitionFromDraft('1commit', '')).toThrow(/Event names/);
    expect(() => parseEventPayload('value')).toThrow(/name:type/);
    expect(() => parseEventPayload('value:date')).toThrow(/Unknown payload type/);
    expect(() => parseEventPayload('value:text, value:boolean')).toThrow(/duplicated/);
  });
});
