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
        Use Layout for structure and sizing. CSS layout rules here are advanced overrides. Base
        has no media query; a viewport override writes only that breakpoint.
      </p>
      <DeclarationEditor session={session} snap={snap} target={{ nodeId }} />
    </div>
  );
}
