import {
  ID_PATTERN,
  fieldTypes,
  type EventDefinition,
  type FieldType,
} from '@facadeur/core';

/** Convert the compact editor notation `value:text, valid:boolean` to a payload map. */
export function eventDefinitionFromDraft(name: string, payloadText: string): EventDefinition {
  const eventName = name.trim();
  if (!ID_PATTERN.test(eventName)) {
    throw new Error('Event names start with a letter and use letters, numbers, _ or -');
  }
  const payload = parseEventPayload(payloadText);
  return { name: eventName, ...(payload ? { payload } : {}) };
}

export function parseEventPayload(text: string): Record<string, FieldType> | undefined {
  const entries = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!entries.length) return undefined;
  const payload: Record<string, FieldType> = {};
  for (const entry of entries) {
    const separator = entry.indexOf(':');
    if (separator === -1) {
      throw new Error('Payload entries use name:type, for example value:text');
    }
    const name = entry.slice(0, separator).trim();
    const type = entry.slice(separator + 1).trim() as FieldType;
    if (!ID_PATTERN.test(name)) throw new Error(`Invalid payload name "${name}"`);
    if (!fieldTypes.includes(type)) throw new Error(`Unknown payload type "${type}"`);
    if (payload[name]) throw new Error(`Payload name "${name}" is duplicated`);
    payload[name] = type;
  }
  return payload;
}

export function eventPayloadText(event: EventDefinition): string {
  return Object.entries(event.payload ?? {})
    .map(([name, type]) => `${name}:${type}`)
    .join(', ');
}
