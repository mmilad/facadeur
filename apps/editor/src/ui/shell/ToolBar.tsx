import { refusalMessage, toolAllowed } from '../../domain/editing.js';
import type { EditorSession, EditorTool } from '../../domain/session.js';

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
}: {
  session: EditorSession;
  tool: EditorTool;
  kind: string;
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
            {key}
          </button>
        );
      })}
    </div>
  );
}
