'use client';

import type { InspectorSidebarModel } from '../../../domain/sidebar/types';
import type { EditorEvent } from '../../../domain/sidebar/events';
import type { NodeDefinition } from '@facadeur/domain';
import { CatalogNodeInspector } from './components/CatalogNodeInspector';

/** Schema-driven properties for the selected Catalog node. */
export function PropertiesPanel({
  model,
  definition,
  onEvent,
}: {
  model: InspectorSidebarModel | null;
  definition: NodeDefinition | null;
  onEvent: (event: EditorEvent) => void;
}) {
  if (model)
    return <CatalogNodeInspector model={model} definition={definition} onEvent={onEvent} />;
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
