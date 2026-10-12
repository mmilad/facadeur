import type { IconDefinition } from '@facadeur/core';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';
import { refusalMessage, toolAllowed } from '../../domain/editing';
import type { EditorTool } from '../../domain/session';

const TOOLS = [
  ['select', 'Select', 'V'],
  ['frame', 'Layer', 'L'],
] as const;

export function ToolBar({
  onEvent,
  tool,
  kind,
  icons,
}: {
  onEvent: (event: EditorEvent) => void;
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
            onClick={() => onEvent({ type: EditorEventType.ToolSet, data: { tool: id } })}
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
    </svg>
  );
}
