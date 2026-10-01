/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

afterEach(cleanup);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderProject(documents: DocumentFile[]) {
  const session = createEditorSession({
    documents,
    design: createProjectTemplateDocument(),
  });
  render(<App session={session} />);
  return session;
}

function openContextMenu(name: string) {
  fireEvent.contextMenu(screen.getByRole('button', { name }));
  expect(screen.getByRole('menu')).toBeVisible();
}

const input = (): DocumentFile => ({
  version: 1,
  id: 'input',
  name: 'Input',
  kind: 'atom',
  root: { id: 'root', type: 'text', text: 'Input' },
});

describe('project context menu', () => {
  it('dismisses on outside pointer interactions and Escape', async () => {
    const user = userEvent.setup();
    const other: DocumentFile = { ...input(), id: 'other', name: 'Other' };
    const session = renderProject([input(), other]);
    openContextMenu('Input input');

    await user.click(screen.getByRole('button', { name: 'Other other' }));
    expect(session.getSnapshot().openId).toBe('other');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    openContextMenu('Other other');
    await user.click(screen.getByRole('button', { name: 'Schema' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    openContextMenu('Other other');
    await user.click(screen.getByRole('heading', { name: 'Project' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    openContextMenu('Other other');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    openContextMenu('Other other');
    fireEvent.blur(window);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps menu actions working and supports Shift+F10', async () => {
    const user = userEvent.setup();
    const session = renderProject([input()]);
    const row = screen.getByRole('button', { name: 'Input input' });

    fireEvent.keyDown(row, { key: 'F10', shiftKey: true });
    expect(screen.getByRole('menuitem', { name: 'Create variant' })).toBeVisible();
    await user.click(screen.getByRole('menuitem', { name: 'Create variant' }));

    expect(session.getSnapshot().document.variantPresets?.map((variant) => variant.name)).toEqual([
      'variant-1',
    ]);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('dismisses a stale menu when another asset becomes open', () => {
    const other: DocumentFile = { ...input(), id: 'other', name: 'Other' };
    const session = renderProject([input(), other]);
    openContextMenu('Input input');

    act(() => session.openAsset('other'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
