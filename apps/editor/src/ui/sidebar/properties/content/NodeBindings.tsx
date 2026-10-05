import {
  applyCommand,
  type Binding,
  type EventBinding,
  type FieldDefinition,
  type FlatNode,
  type SchemaCatalog,
} from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { BindingsEditorControl, EventBindingsEditorControl } from '../../../controls/data/index.js';
import { ownsComponentFeatures } from './component/owns-component-features.js';

export function NodeBindings({
  session,
  snap,
  node,
  dataFields,
  schemaCatalog,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>;
  dataFields: FieldDefinition[];
  schemaCatalog?: SchemaCatalog;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) {
    return null;
  }

  const bindings = node.bindings ?? [];
  return (
    <div className="stack node-bindings">
      <h3>Bindings</h3>
      <BindingsEditorControl
        bindings={bindings}
        fields={snap.document.fields}
        nodeType={node.type}
        tag={node.tag ?? undefined}
        onChangeBindings={(next) => writeBindings(session, node, next)}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
      <h3>Event bindings</h3>
      <EventBindingsEditorControl
        bindings={node.eventBindings ?? []}
        events={snap.document.events ?? []}
        fields={dataFields}
        schemaCatalog={schemaCatalog}
        validateBindings={(next) => validateEventBindings(session, snap, node, next)}
        onChangeBindings={(next) =>
          session.execute({
            type: 'setProp',
            nodeId: node.id,
            prop: 'eventBindings',
            value: next.length ? next : null,
          })
        }
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
    </div>
  );
}

function validateEventBindings(
  session: EditorSession,
  snap: EditorSnapshot,
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>,
  bindings: EventBinding[],
) {
  try {
    applyCommand(
      snap.document,
      {
        type: 'setProp',
        nodeId: node.id,
        prop: 'eventBindings',
        value: bindings.length ? bindings : null,
      },
      session.project.commandContext,
    );
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid event bindings';
  }
}

function writeBindings(
  session: EditorSession,
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>,
  bindings: Binding[],
) {
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'bindings',
    value: bindings.length ? bindings : null,
  });
}
