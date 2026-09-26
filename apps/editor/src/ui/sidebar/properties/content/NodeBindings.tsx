import { type Binding, type FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { BindingsEditorControl } from '../../../controls/data/index.js';
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
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  const bindings = node.bindings ?? [];
  return (
    <div className="stack">
      <h3>Bindings</h3>
      <BindingsEditorControl
        bindings={bindings}
        fields={snap.document.fields}
        onChangeBindings={(next) => writeBindings(session, node, next)}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
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
