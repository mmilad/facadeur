/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import textarea from '../../../examples/textarea.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';
import { redoChromeLabel, undoChromeLabel } from '../src/ui/shell/UndoRedoButtons.js';

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

describe('undo/redo topbar chrome', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  it('labels disabled undo and redo with nothing-to messages', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });

    const undo = topbarHistoryButton(host, 'Undo');
    const redo = topbarHistoryButton(host, 'Redo');
    expect(undo.disabled).toBe(true);
    expect(redo.disabled).toBe(true);
    expect(undo.getAttribute('title')).toBe('Nothing to undo');
    expect(undo.getAttribute('aria-label')).toBe('Nothing to undo');
    expect(redo.getAttribute('title')).toBe('Nothing to redo');
    expect(redo.getAttribute('aria-label')).toBe('Nothing to redo');
  });

  it('keeps Undo and Redo labels when history is available', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });

    await act(async () => {
      session.openAsset('button');
      session.execute({
        type: 'defineField',
        field: { name: 'label', type: 'text', default: 'Go' },
      });
    });

    const undo = topbarHistoryButton(host, 'Undo');
    const redo = topbarHistoryButton(host, 'Redo');
    expect(undo.disabled).toBe(false);
    expect(redo.disabled).toBe(true);
    expect(undo.getAttribute('title')).toBe('Undo');
    expect(undo.getAttribute('aria-label')).toBe('Undo');
    expect(redo.getAttribute('title')).toBe('Nothing to redo');
    expect(redo.getAttribute('aria-label')).toBe('Nothing to redo');

    await act(async () => {
      session.undo();
    });

    const redoAfterUndo = topbarHistoryButton(host, 'Redo');
    expect(redoAfterUndo.disabled).toBe(false);
    expect(redoAfterUndo.getAttribute('title')).toBe('Redo');
    expect(redoAfterUndo.getAttribute('aria-label')).toBe('Redo');
  });

  it('exposes stable chrome label helpers', () => {
    expect(undoChromeLabel(false)).toBe('Nothing to undo');
    expect(undoChromeLabel(true)).toBe('Undo');
    expect(redoChromeLabel(false)).toBe('Nothing to redo');
    expect(redoChromeLabel(true)).toBe('Redo');
  });
});

function topbarHistoryButton(host: HTMLDivElement, text: string): HTMLButtonElement {
  const match = [...host.querySelectorAll('.topbar button.text-button')].find(
    (button) => button.textContent?.trim() === text,
  );
  expect(match).toBeInstanceOf(HTMLButtonElement);
  return match as HTMLButtonElement;
}
