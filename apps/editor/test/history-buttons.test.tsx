/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it, vi } from 'vitest';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import textarea from '../../../examples/textarea.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createEditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';
import { HistoryButtons } from '../src/ui/shell/HistoryButtons.js';

const documents = validateCatalog([
  button,
  link,
  input,
  textarea,
  card,
  signIn,
  specimenSection,
  specimenPage,
]);

describe('undo and redo affordances', () => {
  afterEach(() => cleanup());

  it('names a disabled undo or redo as empty history', () => {
    render(
      <HistoryButtons
        session={{ undo: vi.fn(), redo: vi.fn() }}
        canUndo={false}
        canRedo={false}
      />,
    );

    const undo = screen.getByRole('button', { name: 'Nothing to undo' });
    expect(undo).toBeDisabled();
    expect(undo).toHaveAttribute('title', 'Nothing to undo');
    expect(undo).toHaveAccessibleName('Nothing to undo');
    expect(undo).toHaveTextContent('Undo');

    const redo = screen.getByRole('button', { name: 'Nothing to redo' });
    expect(redo).toBeDisabled();
    expect(redo).toHaveAttribute('title', 'Nothing to redo');
    expect(redo).toHaveAccessibleName('Nothing to redo');
    expect(redo).toHaveTextContent('Redo');
  });

  it('hints the wired Ctrl+Z chords when undo or redo is available', async () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const user = userEvent.setup();
    render(<HistoryButtons session={{ undo, redo }} canUndo canRedo />);

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    expect(undoButton).toBeEnabled();
    expect(undoButton).toHaveAttribute('title', 'Undo (Ctrl+Z)');
    expect(undoButton).toHaveAccessibleName('Undo');
    await user.click(undoButton);
    expect(undo).toHaveBeenCalledOnce();

    const redoButton = screen.getByRole('button', { name: 'Redo' });
    expect(redoButton).toBeEnabled();
    expect(redoButton).toHaveAttribute('title', 'Redo (Ctrl+Shift+Z)');
    expect(redoButton).toHaveAccessibleName('Redo');
    await user.click(redoButton);
    expect(redo).toHaveBeenCalledOnce();
  });

  it('follows session history on the top bar', () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    render(<App session={session} />);

    expect(screen.getByRole('button', { name: 'Nothing to undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nothing to redo' })).toBeDisabled();

    act(() => {
      session.openAsset('specimen-section');
      session.execute({ type: 'setProp', nodeId: 'heading', prop: 'text', value: 'After' });
    });

    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toBeEnabled();
    expect(undo).toHaveAttribute('title', 'Undo (Ctrl+Z)');
    expect(screen.getByRole('button', { name: 'Nothing to redo' })).toHaveAttribute(
      'title',
      'Nothing to redo',
    );

    act(() => {
      session.undo();
    });
    expect(session.getSnapshot().document.nodes.heading).toMatchObject({ text: 'Specimen' });
    expect(screen.getByRole('button', { name: 'Nothing to undo' })).toBeDisabled();
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(redo).toBeEnabled();
    expect(redo).toHaveAttribute('title', 'Redo (Ctrl+Shift+Z)');

    act(() => {
      session.redo();
    });
    expect(session.getSnapshot().document.nodes.heading).toMatchObject({ text: 'After' });
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute('title', 'Undo (Ctrl+Z)');
  });
});
