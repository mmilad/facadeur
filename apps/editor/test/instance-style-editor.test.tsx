// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useSyncExternalStore } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { StyleInspector } from '../src/ui/sidebar/properties/style/StyleInspector.js';

afterEach(cleanup);
function setup() {
  const session = createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      {
        version: 1,
        id: 'input',
        name: 'Input',
        kind: 'atom',
        styles: { declarations: { opacity: '0.8' } },
        root: { id: 'root', type: 'text', tag: 'input' },
      },
      {
        version: 1,
        id: 'owner',
        name: 'Owner',
        kind: 'component',
        variants: [{ name: 'compact' }],
        root: {
          id: 'root',
          type: 'frame',
          children: [
            { id: 'control', type: 'instance', component: 'input' },
            { id: 'other', type: 'instance', component: 'input' },
          ],
        },
      },
    ],
  });
  session.openAsset('owner');
  session.selectNode('control');
  render(<Harness session={session} />);
  return session;
}
function Harness({ session }: { session: EditorSession }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return snap.selectedNode ? (
    <StyleInspector session={session} snap={snap} node={snap.selectedNode} />
  ) : null;
}
function editOpacity(value: string) {
  const input = screen.getByRole('textbox', { name: 'Opacity' });
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}
describe('instance appearance editor', () => {
  it('inherits the master and resets a sparse local value without editing the master or sibling', () => {
    const session = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Manual CSS properties' }));
    expect(screen.getByRole('textbox', { name: 'Opacity' })).toHaveValue('0.8');
    editOpacity('0.5');
    expect(session.getSnapshot().document.styles?.children?.control?.declarations?.opacity).toBe(
      '0.5',
    );
    expect(session.getSnapshot().componentTarget?.styles?.declarations?.opacity).toBe('0.8');
    expect(session.getSnapshot().document.styles?.children?.other).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(session.getSnapshot().document.styles?.children?.control).toBeUndefined();
    expect(screen.getByRole('textbox', { name: 'Opacity' })).toHaveValue('0.8');
  });
  it('writes into the containing variant, supports state/breakpoint edits and undo', () => {
    const session = setup();
    act(() => session.setActiveVariant('compact'));
    fireEvent.click(screen.getByRole('button', { name: 'Manual CSS properties' }));
    editOpacity('0.4');
    expect(session.getSnapshot().document.styles).toBeUndefined();
    expect(
      session.getSnapshot().document.variantPresets?.[0]?.overrides?.styles?.children?.control
        ?.declarations?.opacity,
    ).toBe('0.4');
    act(() => session.undo());
    expect(screen.getByRole('textbox', { name: 'Opacity' })).toHaveValue('0.8');
    fireEvent.change(screen.getByRole('combobox', { name: 'State' }), {
      target: { value: 'hover' },
    });
    act(() => {
      session.setFocusViewport('sm');
      session.setEditTarget('viewport');
    });
    editOpacity('0.2');
    expect(
      session.getSnapshot().document.variantPresets?.[0]?.overrides?.styles?.children?.control
        ?.breakpoints?.sm?.states?.hover?.opacity,
    ).toBe('0.2');
  });
});
