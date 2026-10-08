'use client';

import type { AppService } from '../../../app-service';
import { catalogDefinitionDisplayName } from '../../../domain/catalog/display-name';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import type { EditorSurface } from '../design/design-domain';
import { CatalogNodeInspector } from './CatalogNodeInspector';
import { NestedFieldsPanel } from './content/NestedFieldsPanel';

/** Catalog definition properties (schema-driven) plus nested instance fields on legacy docs. */
export function PropertiesPanel({
  app,
  session,
  snap,
  surface,
}: {
  app: AppService;
  session: EditorSession;
  snap: EditorSnapshot;
  surface?: EditorSurface;
}) {
  if (snap.nestedSelection) {
    return <NestedFieldsPanel session={session} snap={snap} surface={surface} />;
  }

  const coreSnap = app.getCoreSnapshot();
  const definition = coreSnap.openDefinition;
  if (definition) {
    const catalog = coreSnap.catalog;
    const title = catalogDefinitionDisplayName(catalog, definition);
    const nodeUuid = coreSnap.selectedNodeUuid ?? definition.root.uuid;

    return (
      <div className="properties">
        <div className="inspector-context" data-testid="inspector-context">
          <span className="inspector-context-kicker">Inspector</span>
          <strong className="inspector-context-title">{title}</strong>
          <span className="inspector-context-meta">Selected node · save catalog to persist</span>
        </div>
        <CatalogNodeInspector
          app={app}
          session={session}
          nodeUuid={nodeUuid}
          formKey={`${nodeUuid}:${snap.generation}`}
        />
      </div>
    );
  }

  return (
    <div className="properties">
      <div className="inspector-context" data-testid="inspector-context">
        <span className="inspector-context-kicker">Inspector</span>
        <strong className="inspector-context-title">{snap.document.name}</strong>
        <span className="inspector-context-meta">Open a catalog asset to edit schema-backed fields.</span>
      </div>
      <p className="inspector-empty">No property editor for this selection.</p>
    </div>
  );
}
