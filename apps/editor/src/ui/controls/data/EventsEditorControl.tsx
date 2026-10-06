import { eventDataSchema, type EventDefinition, type SchemaCatalog } from '@facadeur/core';
import { useState, type ReactNode } from 'react';
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
  renderContent,
}: {
  events: EventDefinition[];
  eventOrigins?: Record<string, string>;
  schemas?: LibrarySchema[];
  schemaCatalog?: SchemaCatalog;
  onDefineEvent: (event: EventDefinition, previousName?: string) => void;
  onRemoveEvent: (name: string) => void;
  onInvalid?: (message: string) => void;
  renderContent?: (event: EventDefinition) => ReactNode;
}) {
  const [addedName, setAddedName] = useState<string | null>(null);
  return (
    <Stack gap={12}>
      {events.length === 0 ? (
        <p className="meta">
          No events yet. Add an event to define its name, data and native target.
        </p>
      ) : null}
      {events.map((event) => (
        <EventDefinitionCard
          key={event.name}
          event={event}
          defaultOpen={event.name === addedName}
          originalName={eventOrigins[event.name] ?? event.name}
          schemas={schemas}
          schemaCatalog={schemaCatalog}
          onDefineEvent={(next, previousName) => {
            if (previousName && next.name !== previousName) setAddedName(next.name);
            onDefineEvent(next, previousName);
          }}
          onRemoveEvent={onRemoveEvent}
          onInvalid={onInvalid}
          content={renderContent?.(event)}
        />
      ))}
      <button
        type="button"
        className="text-button"
        name="open-add-event"
        onClick={() => {
          const names = new Set(events.map((event) => event.name));
          let name = 'event';
          for (let index = 2; names.has(name); index++) name = `event${index}`;
          onDefineEvent({ name });
          setAddedName(name);
        }}
      >
        Add event
      </button>
    </Stack>
  );
}

function EventDefinitionCard({
  event,
  defaultOpen,
  originalName,
  schemas,
  schemaCatalog,
  onDefineEvent,
  onRemoveEvent,
  onInvalid,
  content,
}: {
  event: EventDefinition;
  defaultOpen: boolean;
  originalName: string;
  schemas: LibrarySchema[];
  schemaCatalog?: SchemaCatalog;
  onDefineEvent: (event: EventDefinition, previousName?: string) => void;
  onRemoveEvent: (name: string) => void;
  onInvalid?: (message: string) => void;
  content?: ReactNode;
}) {
  const dataUse = eventDataSelection(event);
  const dataSchema = eventDataSchema(event, schemaCatalog);

  function defineData(data: SchemaTypeSelection | null) {
    const { payload: _legacyPayload, ...current } = event;
    onDefineEvent({ ...current, ...(data ? { data } : { data: undefined }) }, originalName);
  }

  return (
    <Section title={event.name} collapsible defaultOpen={defaultOpen} appearance="accordion">
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
        {content}
        <Section
          title="Callback preview"
          collapsible
          defaultOpen={false}
          appearance="accordion"
          keepMounted
        >
          <EventCallbackPreview event={event} schema={dataSchema} />
        </Section>
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
