import type { EditorSession, EditorSnapshot } from '../../../../../domain/session.js';
import { EventsEditorControl } from '../../../../controls/data/index.js';
import { ownsComponentFeatures } from './owns-component-features.js';

export function ComponentEvents({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  return (
    <div className="stack">
      <h3>Component events</h3>
      <EventsEditorControl
        events={snap.document.events ?? []}
        onDefineEvent={(event) => session.execute({ type: 'defineEvent', event })}
        onRemoveEvent={(name) => session.execute({ type: 'removeEvent', name })}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
    </div>
  );
}
