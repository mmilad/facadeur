import type { AppService } from '../../../app-service';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import type { EditorSurface } from '../../design/design-domain';
import { PropertiesPanel } from './PropertiesPanel';

export function RightRail({
  app,
  session,
  snap,
  surface,
}: {
  app: AppService;
  session: EditorSession;
  snap: EditorSnapshot;
  surface: EditorSurface;
}) {
  return (
    <section className="side-block side-block-grow inspector eu-form" aria-label="Inspector">
      <div className="side-scroll">
        <PropertiesPanel app={app} session={session} snap={snap} surface={surface} />
      </div>
    </section>
  );
}
