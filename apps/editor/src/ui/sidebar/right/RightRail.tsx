import type { InspectorSidebarModel } from '../../../domain/sidebar/types';
import { PropertiesPanel } from './PropertiesPanel';

export function RightRail({
  model,
  onChange,
}: {
  model: InspectorSidebarModel | null;
  onChange: (nodeId: string, path: string, value: unknown) => void;
}) {
  return (
    <section className="side-block side-block-grow inspector eu-form" aria-label="Inspector">
      <div className="side-scroll">
        <PropertiesPanel model={model} onChange={onChange} />
      </div>
    </section>
  );
}
