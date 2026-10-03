import type { EventBinding } from '@facadeur/core';
import { CodegenError } from '../../names';
import type { Attr, CatalogEntry } from '../types';

export function eventAttributes(
  bindings: EventBinding[] | undefined,
  owner: CatalogEntry,
  usedProps: Set<string>,
): Attr[] {
  const attrs: Attr[] = [];
  for (const binding of bindings ?? []) {
    const event = owner.events.get(binding.event);
    if (!event) {
      throw new CodegenError(`Unknown event "${binding.event}" on "${owner.document.id}"`);
    }
    usedProps.add(event.name);
    const nativeName = binding.name.startsWith('on')
      ? binding.name
      : `on${binding.name.charAt(0).toUpperCase()}${binding.name.slice(1)}`;
    const payload = event.eventPayload ?? {};
    const explicitPayload = (binding as EventBindingWithPayload).payload;
    for (const key of Object.keys(explicitPayload ?? {})) {
      if (!(key in payload)) {
        throw new CodegenError(
          `Event binding for "${binding.event}" maps unknown payload key "${key}"`,
        );
      }
    }
    const structured = Object.entries(payload).find(
      ([, type]) => type === 'array' || type === 'object',
    );
    if (structured) {
      throw new CodegenError(
        `Event "${binding.event}" has a structured payload field "${structured[0]}" and cannot be mapped from native event "${binding.name}"`,
      );
    }
    if (!Object.keys(payload).length) {
      attrs.push({
        name: nativeName,
        value: { kind: 'expr', code: `() => ${event.name}?.()` },
      });
      continue;
    }
    const entries = Object.entries(payload).map(([key, type]) => {
      const source =
        explicitPayload?.[key] ??
        (type === 'boolean' ? 'checked' : type === 'number' ? 'valueAsNumber' : 'value');
      assertPayloadSource(source, type, binding.event, key);
      const value = explicitPayload?.[key]
        ? payloadSourceExpression(source)
        : defaultPayloadExpression(type);
      return `${key}: ${value}`;
    });
    attrs.push({
      name: nativeName,
      value: {
        kind: 'expr',
        code: `(event) => ${event.name}?.({ ${entries.join(', ')} })`,
      },
    });
  }
  return attrs;
}

type EventPayloadSource = 'value' | 'checked' | 'valueAsNumber';
type EventBindingWithPayload = EventBinding & {
  payload?: Record<string, EventPayloadSource>;
};

function assertPayloadSource(
  source: EventPayloadSource,
  type: string,
  eventName: string,
  key: string,
): void {
  if (source === 'checked' && type !== 'boolean') {
    throw new CodegenError(
      `Event "${eventName}" payload "${key}" uses checked but its type is ${type}`,
    );
  }
  if (source === 'valueAsNumber' && type !== 'number') {
    throw new CodegenError(
      `Event "${eventName}" payload "${key}" uses valueAsNumber but its type is ${type}`,
    );
  }
}

function payloadSourceExpression(source: EventPayloadSource): string {
  switch (source) {
    case 'checked':
      return 'event.currentTarget.checked';
    case 'valueAsNumber':
      return 'event.currentTarget.valueAsNumber';
    default:
      return 'event.currentTarget.value';
  }
}

function defaultPayloadExpression(type: string): string {
  if (type === 'boolean') return 'event.currentTarget.checked';
  if (type === 'number') return 'Number(event.currentTarget.value)';
  return 'event.currentTarget.value';
}
