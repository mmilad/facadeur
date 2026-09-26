type UndoRedoButtonsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

function undoChromeLabel(canUndo: boolean): string {
  return canUndo ? 'Undo' : 'Nothing to undo';
}

function redoChromeLabel(canRedo: boolean): string {
  return canRedo ? 'Redo' : 'Nothing to redo';
}

export function UndoRedoButtons({ canUndo, canRedo, onUndo, onRedo }: UndoRedoButtonsProps) {
  const undoLabel = undoChromeLabel(canUndo);
  const redoLabel = redoChromeLabel(canRedo);
  return (
    <>
      <button
        type="button"
        className="text-button"
        disabled={!canUndo}
        onClick={onUndo}
        title={undoLabel}
        aria-label={undoLabel}
      >
        Undo
      </button>
      <button
        type="button"
        className="text-button"
        disabled={!canRedo}
        onClick={onRedo}
        title={redoLabel}
        aria-label={redoLabel}
      >
        Redo
      </button>
    </>
  );
}

export { undoChromeLabel, redoChromeLabel };
