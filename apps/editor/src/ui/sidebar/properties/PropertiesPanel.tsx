'use client';

import type { AppService } from '../../../app-service';
import type { EditorSnapshot } from '../../../domain/session';
import { CatalogNodeInspector } from './CatalogNodeInspector';

/** Schema-driven properties for the selected Catalog node. */
export function PropertiesPanel({ app, snap }: { app: AppService; snap: EditorSnapshot }) {
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
        <strong className="inspector-context-title">Design</strong>
        <span className="inspector-context-meta">
          Open a catalog asset to edit schema-backed fields.
        </span>
      </div>
      <p className="inspector-empty">No property editor for this selection.</p>
    </div>
  );
}
