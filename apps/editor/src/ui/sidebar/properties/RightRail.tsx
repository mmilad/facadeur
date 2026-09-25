import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import type { EditorSurface } from '../design/design-domain.js';
import { ViewportOptionsPanel } from '../layers/ViewportPanel.js';
import { PropertiesPanel } from './PropertiesPanel.js';
import { ViewportEditBar } from './ViewportEditBar.js';

export function RightRail({
  session,
  snap,
  surface,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  surface: EditorSurface;
}) {
  const showViewportBar = !snap.selectedViewportId && surface === 'properties';
  return (
    <section className="side-block side-block-grow inspector" aria-label="Inspector">
      {showViewportBar ? <ViewportEditBar session={session} snap={snap} /> : null}
      <div className="side-scroll">
        {snap.selectedViewportId ? (
          <ViewportOptionsPanel session={session} snap={snap} />
        ) : (
          <PropertiesPanel session={session} snap={snap} />
        )}
      </div>
    </section>
  );
}
