import {
  EDITOR_VIEW_ITEMS,
  isSettingsTokenDomain,
  type EditorSurface,
} from '../../design/design-domain';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';

export function EditorSubnav({
  surface,
  onEvent,
}: {
  surface: EditorSurface;
  onEvent: (event: EditorEvent) => void;
}) {
  const open = (surfaceId: EditorSurface) =>
    onEvent({ type: EditorEventType.SurfaceNavigate, data: { surfaceId } });
  const settingsActive =
    isSettingsTokenDomain(surface) || surface === 'schemas' || surface === 'props';

  return (
    <nav className="editor-subnav" aria-label="Editor views" data-testid="editor-subnav">
      <button
        type="button"
        className={settingsActive ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
        aria-current={settingsActive ? 'page' : undefined}
        data-subnav="settings"
        onClick={() => open(settingsActive ? surface : 'colors')}
      >
        Settings
      </button>
      <button
        type="button"
        data-surface="icons"
        className={surface === 'icons' ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
        aria-current={surface === 'icons' ? 'page' : undefined}
        onClick={() => open('icons')}
      >
        Icons
      </button>
      {EDITOR_VIEW_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={surface === item.id ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
          aria-current={surface === item.id ? 'page' : undefined}
          data-surface={item.id}
          onClick={() => open(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
