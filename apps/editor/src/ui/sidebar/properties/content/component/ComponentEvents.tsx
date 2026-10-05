import {
  applyCommand,
  eventDataMappings,
  eventDataSchema,
  type EventBinding,
  type EventDefinition,
  type JsonSchema,
  type SchemaCatalog,
} from '@facadeur/core';
import { useEffect, useState } from 'react';
import type { EditorSession, EditorSnapshot } from '../../../../../domain/session.js';
import {
  EventBindingsEditorControl,
  EventsEditorControl,
} from '../../../../controls/data/index.js';
import { ownsComponentFeatures } from './owns-component-features.js';

interface PendingEventEdit {
  event: EventDefinition;
  previousName?: string;
  bindings: Record<string, EventBinding[]>;
}

export function ComponentEvents({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const [pending, setPending] = useState<PendingEventEdit | null>(null);
  const definitions = snap.document.events ?? [];
  const schemaCatalog = snap.design.schemaCatalog as SchemaCatalog | undefined;

  useEffect(() => {
    if (!pending) return;
    const stored = (snap.document.events ?? []).find((event) => event.name === pending.event.name);
    if (!stored || JSON.stringify(stored) !== JSON.stringify(pending.event)) return;
    const committed = Object.entries(pending.bindings).every(([nodeId, bindings]) => {
      const node = snap.document.nodes[nodeId];
      const storedBindings = node && 'eventBindings' in node ? (node.eventBindings ?? []) : [];
      return JSON.stringify(storedBindings) === JSON.stringify(bindings);
    });
    if (committed) setPending(null);
  }, [pending, snap.document]);

  if (!ownsComponentFeatures(snap.document.kind)) return null;

  const visibleEvents = pending
    ? [
        ...definitions.filter(
          (event) => event.name !== pending.previousName && event.name !== pending.event.name,
        ),
        pending.event,
      ]
    : definitions;
  const eventOrigins = pending?.previousName ? { [pending.event.name]: pending.previousName } : {};
  const reviewEvents = pending
    ? definitions
        .filter((event) => event.name !== pending.previousName && event.name !== pending.event.name)
        .concat(pending.event)
    : [];
  const validationError = pending ? eventEditError(pending, snap, session) : null;

  function defineEvent(event: EventDefinition, previousName?: string) {
    if (pending && previousName === undefined && event.name === pending.event.name) {
      stageEventEdit(event, pending.previousName);
      return;
    }
    stageEventEdit(event, previousName);
  }

  function stageEventEdit(event: EventDefinition, previousName?: string) {
    const oldName = previousName ?? event.name;
    const previous = definitions.find((item) => item.name === oldName);
    if (oldName !== event.name) {
      const exposed = Object.entries(snap.document.expose?.events ?? {}).find(
        ([, path]) => path === oldName || path.endsWith(`.${oldName}`),
      );
      if (exposed) {
        session.setNotice(
          `Event "${oldName}" is exposed through "${exposed[0]}". Update the exposed path before renaming it.`,
          'error',
        );
        return;
      }
    }
    if (!previous) {
      session.execute({ type: 'defineEvent', event });
      return;
    }
    const affected = Object.entries(snap.document.nodes).flatMap(([nodeId, node]) => {
      if (node.type !== 'frame' && node.type !== 'text' && node.type !== 'image') return [];
      if (!node.eventBindings?.some((binding) => binding.event === oldName)) return [];
      return [
        [
          nodeId,
          updateBindingsForEvent(node.eventBindings, previous, event, schemaCatalog),
        ] as const,
      ];
    });
    if (!affected.length) {
      session.execute({
        type: 'defineEvent',
        event,
        ...(oldName !== event.name ? { previousName: oldName } : {}),
      });
      return;
    }
    const bindings = Object.fromEntries(affected);
    const command = {
      type: 'defineEvent',
      event,
      ...(oldName !== event.name ? { previousName: oldName } : {}),
      bindings,
    } as const;
    if (eventCommandError(command, snap, session)) {
      setPending({
        event,
        ...(oldName !== event.name ? { previousName: oldName } : {}),
        bindings,
      });
      return;
    }
    session.execute(command);
  }

  function removeEvent(name: string) {
    if (pending && pending.event.name === name) {
      session.execute({ type: 'removeEvent', name: pending.previousName ?? name });
      setPending(null);
      return;
    }
    session.execute({ type: 'removeEvent', name });
  }

  function updateReviewBindings(nodeId: string, bindings: EventBinding[]) {
    setPending((current) =>
      current ? { ...current, bindings: { ...current.bindings, [nodeId]: bindings } } : current,
    );
  }

  function saveReview() {
    if (!pending) return;
    if (validationError) {
      session.setNotice(validationError, 'error');
      return;
    }
    session.execute({
      type: 'defineEvent',
      event: pending.event,
      ...(pending.previousName ? { previousName: pending.previousName } : {}),
      bindings: pending.bindings,
    });
  }

  return (
    <div className="stack">
      <h3>Component events</h3>
      <EventsEditorControl
        events={visibleEvents}
        eventOrigins={eventOrigins}
        schemas={snap.design.schemaCatalog?.schemas ?? []}
        schemaCatalog={schemaCatalog}
        onDefineEvent={defineEvent}
        onRemoveEvent={removeEvent}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
      {pending ? (
        <section className="stack event-data-review" aria-label="Review event data bindings">
          <h4>Review node mappings before saving</h4>
          <p className="meta">
            This event is used by native nodes. Map every required data path before applying the
            contract.
          </p>
          {Object.entries(pending.bindings).map(([nodeId, bindings]) => (
            <div className="stack" key={nodeId}>
              <h5>{snap.document.nodes[nodeId]?.name ?? nodeId}</h5>
              <EventBindingsEditorControl
                bindings={bindings}
                events={reviewEvents}
                fields={snap.documentScopeFields}
                schemaCatalog={schemaCatalog}
                allowIncomplete
                validateBindings={(next) =>
                  eventCommandError(
                    {
                      type: 'defineEvent',
                      event: pending.event,
                      ...(pending.previousName ? { previousName: pending.previousName } : {}),
                      bindings: { ...pending.bindings, [nodeId]: next },
                    },
                    snap,
                    session,
                  )
                }
                onChangeBindings={(next) => updateReviewBindings(nodeId, next)}
                onInvalid={(message) => session.setNotice(message, 'error')}
              />
            </div>
          ))}
          {validationError ? (
            <p className="meta" role="status">
              {validationError}
            </p>
          ) : null}
          <button
            type="button"
            className="text-button"
            name="cancel-event-contract"
            onClick={() => setPending(null)}
          >
            Cancel changes
          </button>
          <button
            type="button"
            className="text-button"
            name="save-event-contract"
            disabled={validationError !== null}
            onClick={saveReview}
          >
            Save event contract
          </button>
        </section>
      ) : null}
    </div>
  );
}

function updateBindingsForEvent(
  bindings: EventBinding[],
  previous: EventDefinition,
  next: EventDefinition,
  catalog?: SchemaCatalog,
): EventBinding[] {
  const nextSchema = eventDataSchema(next, catalog);
  return bindings.map((binding) => {
    if (binding.event !== previous.name) return binding;
    const mappings = eventDataMappings(previous, binding) ?? [];
    const validMappings = nextSchema
      ? mappings.filter((mapping) => schemaAtPath(nextSchema, mapping.path))
      : [];
    const { payload: _legacyPayload, ...canonical } = binding as EventBinding & {
      payload?: unknown;
    };
    return {
      ...canonical,
      event: next.name,
      ...(validMappings.length ? { data: validMappings } : { data: undefined }),
    };
  });
}

function eventEditError(pending: PendingEventEdit, snap: EditorSnapshot, session: EditorSession) {
  return eventCommandError(
    {
      type: 'defineEvent',
      event: pending.event,
      ...(pending.previousName ? { previousName: pending.previousName } : {}),
      bindings: pending.bindings,
    },
    snap,
    session,
  );
}

function eventCommandError(
  command: Extract<import('@facadeur/core').Command, { type: 'defineEvent' }>,
  snap: EditorSnapshot,
  session: EditorSession,
) {
  try {
    applyCommand(snap.document, command, session.project.commandContext);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid event contract';
  }
}

function schemaAtPath(schema: JsonSchema, path: string) {
  let current: JsonSchema | undefined = schema;
  for (const segment of path.split('.').filter(Boolean)) current = current?.properties?.[segment];
  return current;
}
