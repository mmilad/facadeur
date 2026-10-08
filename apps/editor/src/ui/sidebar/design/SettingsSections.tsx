import { SETTINGS_TOKEN_DOMAIN_ITEMS, type EditorSurface } from './design-domain';

export function SettingsSections({
  surface,
  onSelect,
}: {
  surface: EditorSurface;
  onSelect: (surface: EditorSurface) => void;
}) {
  return (
    <nav className="design-settings-tabs" aria-label="Settings sections">
      {[
        ...SETTINGS_TOKEN_DOMAIN_ITEMS,
        { id: 'schemas' as const, label: 'Schemas' },
        { id: 'props' as const, label: 'Props' },
      ].map(
        (item) => (
          <button
            key={item.id}
            type="button"
            className={
              surface === item.id ? 'design-settings-tab is-active' : 'design-settings-tab'
            }
            data-settings-tab={item.id}
            aria-current={surface === item.id ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}
