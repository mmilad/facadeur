import type { AppService } from '../../app-service';
import type { EditorSnapshot } from '../../domain/session';

export function DocumentTitle({ app, snap }: { app: AppService; snap: EditorSnapshot }) {
  const definition = snap.openDefinition;
  const title = definition
    ? (app.getDefinitionDisplayName(definition.uuid) ?? definition.name)
    : 'Design';
  return <div className="topbar-name">{title}</div>;
}
