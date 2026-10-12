import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';
import { SETTINGS_TOKEN_DOMAIN_ITEMS, type EditorSurface } from '../design/design-domain';

export function SettingsSections({
  surface,
  onEvent,
}: {
  surface: EditorSurface;
  onEvent: (event: EditorEvent) => void;
}) {
  return (
    <nav className="design-settings-tabs" aria-label="Settings sections">
      {[
        ...SETTINGS_TOKEN_DOMAIN_ITEMS.filter(
          (item) => item.id === 'viewports' || item.id === 'fonts',
        ),
        { id: 'schemas' as const, label: 'Schemas' },
        ...SETTINGS_TOKEN_DOMAIN_ITEMS.filter(
          (item) => item.id !== 'viewports' && item.id !== 'fonts',
        ),
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          className={surface === item.id ? 'design-settings-tab is-active' : 'design-settings-tab'}
          data-settings-tab={item.id}
          aria-current={surface === item.id ? 'page' : undefined}
          onClick={() =>
            onEvent({ type: EditorEventType.SurfaceNavigate, data: { surfaceId: item.id } })
          }
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
