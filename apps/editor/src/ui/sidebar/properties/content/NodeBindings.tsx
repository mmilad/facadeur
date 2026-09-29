import { type Binding, type FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import {
  BindingsEditorControl,
  DataDirectivesEditorControl,
  EventBindingsEditorControl,
  dataFieldsForNode,
} from '../../../controls/data/index.js';
import { ownsComponentFeatures } from './owns-component-features.js';

export function NodeBindings({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Exclude<FlatNode, { type: 'instance' }>;
}) {
  const bindings = node.bindings ?? [];
  const ownsDefinitions = ownsComponentFeatures(snap.document.kind);
  const directiveFields = dataFieldsForNode(snap.document, node.id);
  return (
    <div className="stack">
      <DataDirectivesEditorControl
        node={node}
        fields={directiveFields}
        onChangeDisplayOn={(value) =>
          session.execute({ type: 'setProp', nodeId: node.id, prop: 'displayOn', value })
        }
        onChangeRepeat={(value) =>
          session.execute({ type: 'setProp', nodeId: node.id, prop: 'repeat', value })
        }
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
      {ownsDefinitions ? (
        <>
          <h3>Bindings</h3>
          <BindingsEditorControl
            bindings={bindings}
            fields={snap.document.fields}
            onChangeBindings={(next) => writeBindings(session, node, next)}
            onInvalid={(message) => session.setNotice(message, 'error')}
          />
          <h3>Event bindings</h3>
          <EventBindingsEditorControl
            bindings={node.eventBindings ?? []}
            events={snap.document.events ?? []}
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
        </>
      ) : null}
    </div>
  );
}

function writeBindings(
  session: EditorSession,
  node: Exclude<FlatNode, { type: 'instance' }>,
  bindings: Binding[],
) {
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'bindings',
    value: bindings.length ? bindings : null,
  });
}
