// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';

afterEach(cleanup);

describe('variant actions in the project tree', () => {
  it('renames through a context menu and preserves the base name when creating again', async () => {
    const user = userEvent.setup();
    const file: DocumentFile = {
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'atom',
      root: { id: 'root', type: 'text', text: 'Input' },
    };
    const session = createEditorSession({
      documents: [file],
      design: createProjectTemplateDocument(),
    });
    render(<App session={session} />);
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Input input' }));
    await user.click(screen.getByRole('menuitem', { name: 'Create variant' }));
    const tree = within(screen.getByRole('list', { name: 'Input variants' }));
    expect(tree.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.contextMenu(tree.getByRole('button', { name: 'Default' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const baseName = screen.getByRole('textbox', { name: 'Variant name' });
    await user.clear(baseName);
    await user.type(baseName, 'Text Input');
    expect(session.getSnapshot().document.variantLabels?.default).toBe('Default');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(session.getSnapshot().document.variantLabels?.default).toBe('Text Input');
    expect(tree.getByRole('button', { name: 'Text Input' })).toBeVisible();
    act(() => session.undo());
    expect(session.getSnapshot().document.variantLabels?.default).toBe('Default');
    act(() => session.redo());
    const tabs = within(screen.getByRole('tablist', { name: 'Component variants' }));
    expect(tabs.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.keyDown(tabs.getByRole('tab', { name: 'Variante 1' }), {
      key: 'F10',
      shiftKey: true,
    });
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    await user.clear(screen.getByRole('textbox', { name: 'Variant name' }));
    await user.type(screen.getByRole('textbox', { name: 'Variant name' }), 'Cancelled name');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(session.getSnapshot().document.variantLabels?.['variant-1']).toBe('Variante 1');
    fireEvent.contextMenu(tabs.getByRole('tab', { name: 'Variante 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    await user.clear(screen.getByRole('textbox', { name: 'Variant name' }));
    await user.type(screen.getByRole('textbox', { name: 'Variant name' }), 'Compact Input{Enter}');
    expect(session.getSnapshot().document.variantLabels?.['variant-1']).toBe('Compact Input');
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Input input' }));
    await user.click(screen.getByRole('menuitem', { name: 'Create variant' }));
    expect(session.getSnapshot().document.variantLabels?.default).toBe('Text Input');
    expect(session.getSnapshot().activeVariantName).toBe('variant-2');
    act(() => session.undo());
    expect(session.getSnapshot().document.variantPresets?.map((preset) => preset.name)).toEqual([
      'variant-1',
    ]);
    expect(session.getSnapshot().document.variantLabels?.['variant-2']).toBeUndefined();
  });
});
