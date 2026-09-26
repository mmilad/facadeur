import type { EditorSession, EditorSnapshot } from '../../domain/session.js';

export function DocumentBreadcrumb({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const parents = snap.drillParents;
  if (!parents.length) {
    return <div className="topbar-name">{snap.document.name}</div>;
  }
  return (
    <nav className="topbar-breadcrumb" aria-label="Document path">
      {parents.map((parent, index) => (
        <span key={`${parent.documentId}:${index}`} className="topbar-breadcrumb-segment">
          <button
            type="button"
            className="topbar-breadcrumb-parent"
            onClick={() => session.navigateDrillParent(index)}
          >
            {parent.documentName}
          </button>
          <span className="topbar-breadcrumb-sep" aria-hidden="true">
            ›
          </span>
        </span>
      ))}
      <span className="topbar-name topbar-breadcrumb-current">{snap.document.name}</span>
    </nav>
  );
}
