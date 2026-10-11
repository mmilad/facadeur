import type { AppService } from '../../../app-service';
import type { EditorSnapshot } from '../../../domain/session';
import { PropertiesPanel } from './PropertiesPanel';

export function RightRail({ app, snap }: { app: AppService; snap: EditorSnapshot }) {
  return (
    <section className="side-block side-block-grow inspector eu-form" aria-label="Inspector">
      <div className="side-scroll">
        <PropertiesPanel app={app} snap={snap} />
      </div>
    </section>
  );
}
