import type { EventBinding, EventDefinition } from '@facadeur/core';
import {
  defaultEventPayloadSource,
  eventPayloadSourceLabel,
  eventPayloadSourceOptions,
  NATIVE_EVENT_NAMES,
  type EventPayloadSource,
} from '../../../domain/events.js';
import { Field, Select, Stack, type SelectOption } from '../../form/index.js';
import '../../form/form.css';

type EditableEventBinding = EventBinding & {
  payload?: Record<string, EventPayloadSource>;
};

export function EventBindingsEditorControl({
  bindings,
  events,
  onChangeBindings,
  onInvalid: _onInvalid,
}: {
  bindings: EventBinding[];
  events: EventDefinition[];
  onChangeBindings: (bindings: EventBinding[]) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Stack gap={12}>
      {events.length === 0 ? (
        <p className="meta">Define a component event before binding it to a native event.</p>
      ) : null}
      {bindings.map((binding, index) => (
        <EventBindingRow
          key={`${binding.event}-${binding.name}-${index}`}
          binding={binding}
          index={index}
          bindings={bindings}
          events={events}
          onChangeBindings={onChangeBindings}
        />
      ))}
      <button
        type="button"
        className="text-button"
        name="add-event-binding"
        disabled={events.length === 0}
        onClick={() => {
          const event = events[0];
          if (event) onChangeBindings([...bindings, { event: event.name, name: 'change' }]);
        }}
      >
        Add event binding
      </button>
    </Stack>
  );
}

function EventBindingRow({
  binding,
  index,
  bindings,
  events,
  onChangeBindings,
}: {
  binding: EventBinding;
  index: number;
  bindings: EventBinding[];
  events: EventDefinition[];
  onChangeBindings: (bindings: EventBinding[]) => void;
  onInvalid?: (message: string) => void;
}) {
  const definition = events.find((event) => event.name === binding.event);
  const editable = binding as EditableEventBinding;

  function commit(next: EditableEventBinding | null) {
    const nextBindings = [...bindings];
    if (next === null) nextBindings.splice(index, 1);
    else nextBindings[index] = next;
    onChangeBindings(nextBindings);
  }

  return (
    <Stack gap={8} className="binding-row">
      <Field label="Event">
        <Select
          name={`event-binding-event-${index}`}
          value={binding.event}
          options={events.map((event) => ({ value: event.name, label: event.name }))}
          onCommit={(event) => commit({ ...editable, event })}
        />
      </Field>
      <Field label="Native event">
        <Select
          name={`event-binding-name-${index}`}
          value={binding.name}
          options={nativeEventOptions(binding.name)}
          onCommit={(name) => commit({ ...editable, name })}
        />
      </Field>
      {definition?.payload
        ? Object.entries(definition.payload).map(([key, type]) => {
            const source = editable.payload?.[key] ?? defaultEventPayloadSource(type);
            const options: SelectOption[] = eventPayloadSourceOptions(type);
            if (!options.some((option) => option.value === source)) {
              options.push({
                value: source,
                label: `${eventPayloadSourceLabel(source)} (invalid)`,
                disabled: true,
              });
            }
            return (
              <Field key={key} label={`Payload: ${key}`}>
                <Select
                  name={`event-binding-payload-${index}-${key}`}
                  value={source}
                  options={options}
                  onCommit={(next) => {
                    const payload = { ...(editable.payload ?? {}) };
                    if (next === defaultEventPayloadSource(type)) delete payload[key];
                    else payload[key] = next as EventPayloadSource;
                    commit({
                      ...editable,
                      ...(Object.keys(payload).length ? { payload } : { payload: undefined }),
                    });
                  }}
                />
              </Field>
            );
          })
        : null}
      <button type="button" className="text-button" onClick={() => commit(null)}>
        Remove event binding
      </button>
    </Stack>
  );
}

function nativeEventOptions(current: string): { value: string; label: string }[] {
  const names = new Set<string>(NATIVE_EVENT_NAMES);
  if (current.trim()) names.add(current);
  return [...names].map((name) => ({
    value: name,
    label: name,
  }));
}
