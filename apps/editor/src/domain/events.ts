import type { EventDefinition, FieldType } from '@facadeur/core';
import type { SchemaTypeSelection } from './schema/schema-use';

export type EventPayloadSource = 'value' | 'checked' | 'valueAsNumber';

export const NATIVE_EVENT_NAMES = [
  'blur',
  'change',
  'click',
  'focus',
  'input',
  'keydown',
  'keyup',
  'pointerdown',
  'pointerup',
  'submit',
] as const;

export const EVENT_PAYLOAD_SOURCE_OPTIONS: {
  value: EventPayloadSource;
  label: string;
}[] = [
  { value: 'value', label: 'event.currentTarget.value' },
  { value: 'checked', label: 'event.currentTarget.checked' },
  { value: 'valueAsNumber', label: 'event.currentTarget.valueAsNumber' },
];

export function eventPayloadSourceLabel(source: EventPayloadSource): string {
  return EVENT_PAYLOAD_SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? source;
}

/** Adapt old compact event declarations to the shared contract editor shape. */
export function eventDataSelection(event: EventDefinition): SchemaTypeSelection | null {
  if (event.data) return event.data;
  if (!event.payload) return null;
  return {
    fields: Object.entries(event.payload).map(([name, type]) => ({
      name,
      type: {
        kind: 'type' as const,
        type: legacyFieldSchemaType(type),
      },
    })),
  };
}

function legacyFieldSchemaType(type: FieldType) {
  if (type === 'boolean' || type === 'number') return type;
  if (type === 'object' || type === 'array') return type;
  return 'string';
}
