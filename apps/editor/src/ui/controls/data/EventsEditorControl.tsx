import { eventDataSchema, type EventDefinition, type SchemaCatalog } from '@facadeur/core';
import { useState } from 'react';
import { eventDataSelection } from '../../../domain/events.js';
import type { LibrarySchema } from '../../../domain/schema/schema-library.js';
import type { SchemaTypeSelection } from '../../../domain/schema/schema-use.js';
import { Field, Section, Stack, TextInput } from '../../form/index.js';
import { SchemaTypeSelector } from './SchemaTypeSelector.js';
import '../../form/form.css';

export function EventsEditorControl({
  events,
  eventOrigins = {},
  schemas = [],
  schemaCatalog,
  onDefineEvent,
  onRemoveEvent,
  onInvalid,
}: {
  events: EventDefinition[];
  eventOrigins?: Record<string, string>;
  schemas?: LibrarySchema[];
  schemaCatalog?: SchemaCatalog;
  onDefineEvent: (event: EventDefinition, previousName?: string) => void;
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
          originalName={eventOrigins[event.name] ?? event.name}
          schemas={schemas}
          schemaCatalog={schemaCatalog}
          onDefineEvent={onDefineEvent}
          onRemoveEvent={onRemoveEvent}
          onInvalid={onInvalid}
        />
      ))}
      <AddEventForm schemas={schemas} onDefineEvent={onDefineEvent} onInvalid={onInvalid} />
    </Stack>
  );
}

function EventDefinitionCard({
  event,
  originalName,
  schemas,
  schemaCatalog,
  onDefineEvent,
  onRemoveEvent,
  onInvalid,
}: {
  event: EventDefinition;
  originalName: string;
  schemas: LibrarySchema[];
  schemaCatalog?: SchemaCatalog;
  onDefineEvent: (event: EventDefinition, previousName?: string) => void;
  onRemoveEvent: (name: string) => void;
  onInvalid?: (message: string) => void;
}) {
  const dataUse = eventDataSelection(event);
  const dataSchema = eventDataSchema(event, schemaCatalog);

  function defineData(data: SchemaTypeSelection | null) {
    const { payload: _legacyPayload, ...current } = event;
    onDefineEvent({ ...current, ...(data ? { data } : { data: undefined }) }, originalName);
  }

  return (
    <Section title={event.name} collapsible defaultOpen={false}>
      <Stack gap={8}>
        <Field label="Name">
          <TextInput
            name={`event-name-${event.name}`}
            value={event.name}
            onCommit={(name) => {
              try {
                const nextName = name.trim();
                if (nextName && nextName !== event.name) {
                  const { payload: _legacyPayload, ...current } = event;
                  onDefineEvent(
                    { ...current, name: nextName, ...(dataUse ? { data: dataUse } : {}) },
                    originalName,
                  );
                }
              } catch (error) {
                onInvalid?.(error instanceof Error ? error.message : 'Invalid event');
              }
            }}
          />
        </Field>
        <SchemaTypeSelector
          name={`event-data-${event.name}`}
          value={dataUse}
          schemas={schemas}
          onChange={defineData}
          helperText="Event data is local to this component and is assembled by each node binding."
        />
        <EventCallbackPreview event={event} schema={dataSchema} />
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

function EventCallbackPreview({ event, schema }: { event: EventDefinition; schema: unknown }) {
  const callback = `on${event.name[0]?.toUpperCase() ?? ''}${event.name.slice(1)}`;
  const dataType = schema
    ? `${event.name[0]?.toUpperCase() ?? ''}${event.name.slice(1)}Data`
    : 'undefined';
  return (
    <section className="stack" aria-label={`${event.name} callback preview`}>
      <h4>Public callback</h4>
      <pre className="schema-json" data-testid={`event-callback-preview-${event.name}`}>
        {`${callback}?: (event: ComponentEvent<${dataType}, '${event.name}'>) => void\n\nComponentEvent fields:\n  eventName: '${event.name}'\n  event: Event\n  native: string\n  data: ${schema ? dataType : 'undefined'}\n\nEvent data schema:\n${schema ? JSON.stringify(schema, null, 2) : 'undefined'}`}
      </pre>
    </section>
  );
}

function AddEventForm({
  schemas,
  onDefineEvent,
  onInvalid,
}: {
  schemas: LibrarySchema[];
  onDefineEvent: (event: EventDefinition, previousName?: string) => void;
  onInvalid?: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [data, setData] = useState<SchemaTypeSelection | null>(null);
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
        <SchemaTypeSelector
          name="new-event-data"
          value={data}
          schemas={schemas}
          onChange={setData}
          helperText="Event data is assembled by node bindings."
        />
        <button
          type="button"
          className="text-button"
          name="add-event"
          onClick={() => {
            try {
              const eventName = name.trim();
              if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(eventName)) {
                throw new Error('Event names start with a letter and use letters, numbers, _ or -');
              }
              onDefineEvent({ name: eventName, ...(data ? { data } : {}) });
              setName('');
              setData(null);
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
