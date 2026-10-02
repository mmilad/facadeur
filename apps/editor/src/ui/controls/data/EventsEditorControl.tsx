import type { EventDefinition } from '@facadeur/core';
import { useState } from 'react';
import { eventDefinitionFromDraft, eventPayloadText } from '../../../domain/events.js';
import { Field, Section, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';

export function EventsEditorControl({
  events,
  onDefineEvent,
  onRemoveEvent,
  onInvalid,
}: {
  events: EventDefinition[];
  onDefineEvent: (event: EventDefinition) => void;
  onRemoveEvent: (name: string) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Stack gap={12}>
      {events.length === 0 ? (
        <p className="meta">No events yet. Events can be bound to native events on child nodes.</p>
      ) : null}
      {events.map((event) => (
        <EventDefinitionCard
          key={event.name}
          event={event}
          onDefineEvent={onDefineEvent}
          onRemoveEvent={onRemoveEvent}
          onInvalid={onInvalid}
        />
      ))}
      <AddEventForm onDefineEvent={onDefineEvent} onInvalid={onInvalid} />
    </Stack>
  );
}

function EventDefinitionCard({
  event,
  onDefineEvent,
  onRemoveEvent,
  onInvalid,
}: {
  event: EventDefinition;
  onDefineEvent: (event: EventDefinition) => void;
  onRemoveEvent: (name: string) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Section title={event.name} collapsible defaultOpen={false}>
      <Stack gap={8}>
        <Field label="Name">
          <TextInput
            name={`event-name-${event.name}`}
            value={event.name}
            onCommit={(name) => {
              try {
                const next = eventDefinitionFromDraft(name, eventPayloadText(event));
                if (next.name !== event.name) {
                  onDefineEvent(next);
                  onRemoveEvent(event.name);
                }
              } catch (error) {
                onInvalid?.(error instanceof Error ? error.message : 'Invalid event');
              }
            }}
          />
        </Field>
        <Field label="Payload">
          <TextInput
            name={`event-payload-${event.name}`}
            value={eventPayloadText(event)}
            placeholder="value:text, valid:boolean"
            onCommit={(payload) => {
              try {
                onDefineEvent(eventDefinitionFromDraft(event.name, payload));
              } catch (error) {
                onInvalid?.(error instanceof Error ? error.message : 'Invalid payload');
              }
            }}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          name={`remove-event-${event.name}`}
          onClick={() => onRemoveEvent(event.name)}
        >
          Remove event
        </button>
      </Stack>
    </Section>
  );
}

function AddEventForm({
  onDefineEvent,
  onInvalid,
}: {
  onDefineEvent: (event: EventDefinition) => void;
  onInvalid?: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [payload, setPayload] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="text-button"
        name="open-add-event"
        onClick={() => setOpen(true)}
      >
        Add event
      </button>
    );
  }

  return (
    <Section
      title="Add event"
      action={
        <button type="button" className="text-button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      }
    >
      <Stack gap={8}>
        <Field label="Name">
          <TextInput name="new-event-name" value={name} placeholder="commit" onChange={setName} />
        </Field>
        <Field label="Payload">
          <TextInput
            name="new-event-payload"
            value={payload}
            placeholder="value:text, valid:boolean"
            onChange={setPayload}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          name="add-event"
          onClick={() => {
            try {
              onDefineEvent(eventDefinitionFromDraft(name, payload));
              setName('');
              setPayload('');
              setOpen(false);
            } catch (error) {
              onInvalid?.(error instanceof Error ? error.message : 'Invalid event');
            }
          }}
        >
          Add event
        </button>
      </Stack>
    </Section>
  );
}
