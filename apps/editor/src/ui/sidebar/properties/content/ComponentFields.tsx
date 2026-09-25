import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { FieldsEditorControl } from '../../../controls/data/index.js';
import { ownsComponentFeatures } from './owns-component-features.js';

export function ComponentFields({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  return (
    <div className="stack">
      <h3>Fields</h3>
      <FieldsEditorControl
        fields={snap.document.fields}
        onDefineField={(field) => session.execute({ type: 'defineField', field })}
        onRemoveField={(name) => session.execute({ type: 'removeField', name })}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
    </div>
  );
}
