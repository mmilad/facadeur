import type { EditorSession } from '../../domain/session.js';

/**
 * Title hints for the shortcuts already handled in EditorShell:
 * Ctrl or Cmd+Z undoes; Shift with that chord redoes. No other redo chord is wired.
 */
const UNDO_SHORTCUT = 'Ctrl+Z';
const REDO_SHORTCUT = 'Ctrl+Shift+Z';

export function HistoryButtons({
  session,
  canUndo,
  canRedo,
}: {
  session: Pick<EditorSession, 'undo' | 'redo'>;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <>
      <HistoryButton
        label="Undo"
        enabled={canUndo}
        emptyLabel="Nothing to undo"
        shortcut={UNDO_SHORTCUT}
        onClick={() => session.undo()}
      />
      <HistoryButton
        label="Redo"
        enabled={canRedo}
        emptyLabel="Nothing to redo"
        shortcut={REDO_SHORTCUT}
        onClick={() => session.redo()}
      />
    </>
  );
}

function HistoryButton({
  label,
  enabled,
  emptyLabel,
  shortcut,
  onClick,
}: {
  label: string;
  enabled: boolean;
  emptyLabel: string;
  shortcut: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="text-button"
      disabled={!enabled}
      title={enabled ? `${label} (${shortcut})` : emptyLabel}
      aria-label={enabled ? label : emptyLabel}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
