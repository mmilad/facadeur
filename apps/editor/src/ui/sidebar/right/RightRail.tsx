import type { InspectorSidebarModel } from '../../../domain/sidebar/types';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { PropertiesPanel } from './PropertiesPanel';
import type { NodeDefinition } from '@facadeur/domain';

export function RightRail({
  model,
  definition,
  onEvent,
}: {
  model: InspectorSidebarModel | null;
  definition: NodeDefinition | null;
  onEvent: (event: EditorEvent) => void;
}) {
  return (
    <section className="side-block side-block-grow inspector eu-form" aria-label="Inspector">
      <div className="side-scroll">
        <PropertiesPanel model={model} definition={definition} onEvent={onEvent} />
      </div>
    </section>
  );
}
