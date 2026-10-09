'use client';

import type { AppService } from '../../../app-service';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import type { EditorSurface } from '../../design/design-domain';
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

  const definition = snap.openDefinition;
  if (definition) {
    const nodeUuid = snap.selectedCatalogNodeUuid ?? definition.root.uuid;

    return (
      <CatalogNodeInspector
        key={`${snap.openId}:${nodeUuid}`}
        app={app}
        nodeUuid={nodeUuid}
        formKey={`${snap.openId}:${nodeUuid}`}
      />
    );
  }

  return (
    <div className="properties">
      <div className="inspector-context" data-testid="inspector-context">
        <span className="inspector-context-kicker">Inspector</span>
        <strong className="inspector-context-title">{snap.document.name}</strong>
        <span className="inspector-context-meta">
          Open a catalog asset to edit schema-backed fields.
        </span>
      </div>
      <p className="inspector-empty">No property editor for this selection.</p>
    </div>
  );
}
