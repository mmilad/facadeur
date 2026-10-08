import { type Binding, type FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import { BindingsEditorControl } from '../../../controls/data/index';
import { ComponentEvents } from './component/ComponentEvents';
import { ownsComponentFeatures } from './component/owns-component-features';

export function NodeBindings({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>;
}) {
  const bindings = node.bindings ?? [];
  return (
    <div className="stack node-bindings">
      {ownsComponentFeatures(snap.document.kind) ? (
        <>
          <h3>Bindings</h3>
          <BindingsEditorControl
            bindings={bindings}
            fields={snap.documentScopeFields}
            nodeType={node.type}
            tag={node.tag ?? undefined}
            onChangeBindings={(next) => writeBindings(session, node, next)}
            onInvalid={(message) => session.setNotice(message, 'error')}
          />
        </>
      ) : null}
      <ComponentEvents session={session} snap={snap} />
    </div>
  );
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
