import type { AppService } from '../../app-service';
import type { EditorSnapshot } from '../../domain/session';
import { catalogDefinitionDisplayName } from '../../domain/catalog/display-name';

export function DocumentTitle({ app, snap }: { app: AppService; snap: EditorSnapshot }) {
  const definition = snap.openDefinition;
  const title = definition
    ? catalogDefinitionDisplayName(app.getCoreSnapshot().catalog, definition)
    : 'Design';
  return <div className="topbar-name">{title}</div>;
}
