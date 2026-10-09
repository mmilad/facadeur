import {
  EDITOR_VIEW_ITEMS,
  isSettingsTokenDomain,
  type EditorSurface,
} from '../../design/design-domain';

export function EditorSubnav({
  surface,
  onSelectSurface,
}: {
  surface: EditorSurface;
  onSelectSurface: (surface: EditorSurface) => void;
}) {
  const settingsActive =
    isSettingsTokenDomain(surface) || surface === 'schemas' || surface === 'props';

  return (
    <nav className="editor-subnav" aria-label="Editor views" data-testid="editor-subnav">
      <button
        type="button"
        className={settingsActive ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
        aria-current={settingsActive ? 'page' : undefined}
        data-subnav="settings"
        onClick={() => onSelectSurface(settingsActive ? surface : 'colors')}
      >
        Settings
      </button>
      <button
        type="button"
        data-surface="icons"
        className={surface === 'icons' ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
        aria-current={surface === 'icons' ? 'page' : undefined}
        onClick={() => onSelectSurface('icons')}
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
          onClick={() => onSelectSurface(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
