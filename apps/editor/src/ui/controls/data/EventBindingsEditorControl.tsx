import type { EventBinding, EventDefinition } from '@facadeur/core';
import { Field, Select, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';

export function EventBindingsEditorControl({
  bindings,
  events,
  onChangeBindings,
  onInvalid,
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
          onInvalid={onInvalid}
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
  onInvalid,
}: {
  binding: EventBinding;
  index: number;
  bindings: EventBinding[];
  events: EventDefinition[];
  onChangeBindings: (bindings: EventBinding[]) => void;
  onInvalid?: (message: string) => void;
}) {
  function commit(next: EventBinding | null) {
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
          onCommit={(event) => commit({ ...binding, event })}
        />
      </Field>
      <Field label="Native event">
        <TextInput
          name={`event-binding-name-${index}`}
          value={binding.name}
          onCommit={(name) => {
            const next = name.trim();
            if (!next) {
              onInvalid?.('A native event name is required');
              return;
            }
            commit({ event: binding.event, name: next });
          }}
        />
      </Field>
      <button type="button" className="text-button" onClick={() => commit(null)}>
        Remove event binding
      </button>
    </Stack>
  );
}
