import type { IconDefinition } from '@facadeur/core';
import { refusalMessage, toolAllowed } from '../../domain/editing';
import type { EditorSession, EditorTool } from '../../domain/session';

const TOOLS = [
  ['select', 'Select', 'V'],
  ['frame', 'Frame', 'F'],
  ['text', 'Text', 'T'],
  ['image', 'Image', 'I'],
] as const;

export function ToolBar({
  session,
  tool,
  kind,
  icons,
}: {
  session: EditorSession;
  tool: EditorTool;
  kind: string;
  icons?: readonly IconDefinition[];
}) {
  return (
    <div className="topbar-tools" role="toolbar" aria-label="Tools">
      {TOOLS.map(([id, label, key]) => {
        const allowed = id === 'select' || toolAllowed(kind, id);
        return (
          <button
            key={id}
            type="button"
            className={tool === id ? 'tool tool-compact is-active' : 'tool tool-compact'}
            aria-pressed={tool === id}
            aria-label={label}
            disabled={!allowed}
            title={allowed ? `${label} (${key})` : refusalMessage(kind, id)}
            onClick={() => session.setTool(id)}
          >
            <ToolGlyph tool={id} src={icons?.find((icon) => icon.id === id)?.src} />
            <span className="tool-key">{key}</span>
          </button>
        );
      })}
    </div>
  );
}

function ToolGlyph({ tool, src }: { tool: (typeof TOOLS)[number][0]; src?: string }) {
  if (src) return <img className="tool-icon" src={src} alt="" aria-hidden="true" />;

  return (
    <svg className="tool-icon" viewBox="0 0 24 24" aria-hidden="true">
      {tool === 'select' ? <path d="m5 3 13 11-5.6.7L9.3 20 5 3Z" /> : null}
      {tool === 'frame' ? <rect x="4" y="4" width="16" height="16" rx="2" /> : null}
      {tool === 'text' ? <path d="M5 5h14M12 5v14M8.5 19h7" /> : null}
      {tool === 'image' ? (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m5 17 4-4 3 3 2-2 5 4" />
        </>
      ) : null}
    </svg>
  );
}
