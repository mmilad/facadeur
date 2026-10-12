import type { InspectorSidebarModel } from '../../../domain/sidebar/types';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { PropertiesPanel } from './PropertiesPanel';

export function RightRail({
  model,
  onEvent,
}: {
  model: InspectorSidebarModel | null;
  onEvent: (event: EditorEvent) => void;
}) {
  return (
    <section className="side-block side-block-grow inspector eu-form" aria-label="Inspector">
      <div className="side-scroll">
        <PropertiesPanel model={model} onEvent={onEvent} />
      </div>
    </section>
  );
}
