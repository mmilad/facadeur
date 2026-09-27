import { describe, expect, it, vi } from 'vitest';
import { createUndoHistory } from '../src/domain/session/undo-history.js';

function mockStore(label: string) {
  let undoAvailable = false;
  let redoAvailable = false;
  return {
    label,
    canUndo: vi.fn(() => undoAvailable),
    canRedo: vi.fn(() => redoAvailable),
    undo: vi.fn(() => {
      undoAvailable = false;
      redoAvailable = true;
    }),
    redo: vi.fn(() => {
      redoAvailable = false;
      undoAvailable = true;
    }),
    markUndoable() {
      undoAvailable = true;
      redoAvailable = false;
    },
  };
}

describe('undo history', () => {
  it('undoes across two stores in command order', () => {
    const history = createUndoHistory();
    const doc = mockStore('doc');
    const design = mockStore('design');
    doc.markUndoable();
    history.noteCommand(doc as never);
    design.markUndoable();
    history.noteCommand(design as never);

    expect(history.canUndo()).toBe(true);
    history.undo();
    expect(design.undo).toHaveBeenCalledOnce();
    expect(doc.undo).not.toHaveBeenCalled();

    history.undo();
    expect(doc.undo).toHaveBeenCalledOnce();
    expect(history.canUndo()).toBe(false);
  });

  it('redoes the last undone store', () => {
    const history = createUndoHistory();
    const doc = mockStore('doc');
    doc.markUndoable();
    history.noteCommand(doc as never);

    history.undo();
    expect(history.canRedo()).toBe(true);
    history.redo();
    expect(doc.redo).toHaveBeenCalledOnce();
  });

  it('clears redo after a new command', () => {
    const history = createUndoHistory();
    const doc = mockStore('doc');
    const design = mockStore('design');
    doc.markUndoable();
    history.noteCommand(doc as never);
    history.undo();
    expect(history.canRedo()).toBe(true);

    design.markUndoable();
    history.noteCommand(design as never);
    expect(history.canRedo()).toBe(false);
    history.redo();
    expect(doc.redo).not.toHaveBeenCalled();
  });
});
