'use client';

import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import type { EditorSurface } from '../../design/design-domain';

export function NestedFieldsPanel({
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  surface?: EditorSurface;
}) {
  const selection = snap.nestedSelection;
  const title = selection?.node.name || selection?.node.id || 'Nested layer';

  return (
    <div className="properties">
      <div className="inspector-context instance-context" data-testid="inspector-context">
        <span className="inspector-context-kicker">Nested selection</span>
        <strong className="inspector-context-title">{title}</strong>
        <span className="inspector-context-meta">v2 nested field editor not wired yet.</span>
      </div>
    </div>
  );
}
