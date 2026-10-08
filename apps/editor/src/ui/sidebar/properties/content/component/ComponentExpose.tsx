import type { EditorSession, EditorSnapshot } from '../../../../../domain/session';
import { ExposeEditorControl } from '../../../../controls/data/index';
import { ownsComponentFeatures } from './owns-component-features';

export function ComponentExpose({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;

  return (
    <ExposeEditorControl
      expose={snap.document.expose}
      onChange={(expose) => session.execute({ type: 'setExpose', expose })}
      onInvalid={(message) => session.setNotice(message, 'error')}
    />
  );
}
