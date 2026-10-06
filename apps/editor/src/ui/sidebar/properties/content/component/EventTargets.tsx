import { applyCommand, type EventBinding, type EventDefinition } from '@facadeur/core';
import { useState } from 'react';
import type { EditorSession, EditorSnapshot } from '../../../../../domain/session.js';
import { dataFieldsForNode } from '../../../../controls/data/index.js';
import {
  EventBindingsEditorControl,
  withDefaultMappings,
} from '../../../../controls/data/EventBindingsEditorControl.js';
import { Field, Select } from '../../../../form/index.js';
import { NATIVE_EVENT_NAMES } from '../../../../../domain/events.js';

export function EventTargets({
  event,
  session,
  snap,
}: {
  event: EventDefinition;
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const [adding, setAdding] = useState(false);
  const [newNative, setNewNative] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ nodeId: string; bindings: EventBinding[] } | null>(null);
  const nodes = Object.values(snap.document.nodes).filter(
    (node) => node.type === 'frame' || node.type === 'text' || node.type === 'image',
  );
  const targets = nodes.flatMap((node) =>
    (node.eventBindings ?? []).flatMap((binding, index) =>
      binding.event === event.name ? [{ node, index, binding }] : [],
    ),
  );
  const draftNode = nodes.find((node) => node.id === draft?.nodeId);
  const displayedTargets =
    draft && draftNode
      ? [
          ...targets,
          ...draft.bindings.map((binding) => ({ node: draftNode, index: undefined, binding })),
        ]
      : targets;
  const options = [
    { value: '', label: 'No native target' },
    ...nodes.map((node) => ({
      value: node.id,
      label: `${node.name ?? node.id} (${node.tag ?? node.type})`,
    })),
  ];
  const documents = new Map(
    session.documentStores().map((store) => {
      const document = store.getDocument();
      return [document.id, document] as const;
    }),
  );

  function targetCommand(
    nodeId: string,
    next: EventBinding[],
    oldNodeId?: string,
    oldIndex?: number,
  ) {
    const bindings: Record<string, EventBinding[]> = {};
    if (oldNodeId !== undefined && oldIndex !== undefined) {
      const oldNode = nodes.find((node) => node.id === oldNodeId);
      bindings[oldNodeId] = (oldNode?.eventBindings ?? []).filter((_, index) => index !== oldIndex);
    }
    if (nodeId) {
      const node = nodes.find((candidate) => candidate.id === nodeId);
      bindings[nodeId] = [...(bindings[nodeId] ?? node?.eventBindings ?? []), ...next];
    }
    return { type: 'defineEvent' as const, event, bindings };
  }

  function commit(command: ReturnType<typeof targetCommand>) {
    try {
      applyCommand(snap.document, command, session.project.commandContext);
      session.executeDocument(snap.document.id, command);
      setAdding(false);
      setDraft(null);
    } catch (error) {
      session.setNotice(error instanceof Error ? error.message : 'Invalid event target', 'error');
    }
  }

  return (
    <div className="stack" aria-label={`${event.name} targets`}>
      {displayedTargets.map(({ node, index, binding }, targetIndex) => (
        <div className="stack" key={`${node.id}-${index}`}>
          <Field label="Target element">
            <Select
              name={`event-target-${event.name}-${targetIndex}`}
              value={node.id}
              options={options}
              onCommit={(id) => commit(targetCommand(id, id ? [binding] : [], node.id, index))}
            />
          </Field>
          <EventBindingsEditorControl
            embedded
            bindings={[binding]}
            events={[event]}
            fields={dataFieldsForNode(snap.document, node.id, snap.documentScopeFields, false, {
              documents,
              schemaCatalog: snap.design.schemaCatalog,
            })}
            schemaCatalog={snap.design.schemaCatalog}
            validateBindings={(next) => {
              try {
                applyCommand(
                  snap.document,
                  targetCommand(node.id, next, node.id, index),
                  session.project.commandContext,
                );
                return null;
              } catch (error) {
                return error instanceof Error ? error.message : 'Invalid event target';
              }
            }}
            onChangeBindings={(next) => {
              if (index === undefined && !next.length) {
                setDraft(null);
                return;
              }
              commit(targetCommand(node.id, next, node.id, index));
            }}
            onInvalid={(message) => session.setNotice(message, 'error')}
          />
        </div>
      ))}
      {!draft && (!targets.length || adding) ? (
        <div className="stack">
          <Field label="Target element">
            <Select
              name={`event-target-${event.name}-new`}
              value=""
              options={options}
              onCommit={(id) => {
                if (!id) {
                  setAdding(false);
                  return;
                }
                const node = nodes.find((candidate) => candidate.id === id);
                const native =
                  newNative ??
                  (node?.tag === 'input' || node?.tag === 'textarea' || node?.tag === 'select'
                    ? 'change'
                    : 'click');
                const bindings = [
                  withDefaultMappings(
                    event,
                    { event: event.name, name: native },
                    snap.design.schemaCatalog,
                  ),
                ];
                const command = targetCommand(id, bindings);
                try {
                  applyCommand(snap.document, command, session.project.commandContext);
                } catch {
                  setDraft({ nodeId: id, bindings });
                  return;
                }
                commit(command);
              }}
            />
          </Field>
          <Field label="Native event">
            <Select
              name={`event-native-${event.name}-new`}
              value={newNative ?? 'click'}
              options={NATIVE_EVENT_NAMES.map((name) => ({ value: name, label: name }))}
              onCommit={setNewNative}
            />
          </Field>
        </div>
      ) : !draft ? (
        <button
          type="button"
          className="text-button"
          name={`add-event-target-${event.name}`}
          onClick={() => setAdding(true)}
        >
          Add another target
        </button>
      ) : (
        <p className="meta" role="status">
          Finish the data mappings to save this target.
        </p>
      )}
    </div>
  );
}
