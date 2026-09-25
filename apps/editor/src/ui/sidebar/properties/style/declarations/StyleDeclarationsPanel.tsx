import type { EditorSession, EditorSnapshot } from '../../../../../domain/session.js';
import { DeclarationEditor } from './declaration-editor.js';

export function StyleDeclarationsPanel({
  session,
  snap,
  nodeId,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  nodeId: string;
}) {
  return (
    <div className="stack">
      <h3>Style</h3>
      <p className="meta">
        Base has no media query. A viewport override writes only that breakpoint.
      </p>
      <DeclarationEditor session={session} snap={snap} target={{ nodeId }} />
    </div>
  );
}
