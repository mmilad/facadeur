// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session';
import { PropertiesPanel } from '../src/ui/sidebar/properties/PropertiesPanel';

const document: DocumentFile = {
  version: 1,
  id: 'section',
  name: 'Section',
  kind: 'section',
  styles: {
    children: { button: { declarations: { color: 'red' } } },
  },
  root: {
    id: 'root',
    type: 'frame',
    children: [
      {
        id: 'button',
        type: 'text',
        name: 'Primary action',
        text: 'Save',
        style: { letterSpacing: '2px' },
      },
      { id: 'label', type: 'text', name: 'Label', text: 'Ready' },
    ],
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup() {
  const session = createEditorSession({
    documents: [structuredClone(document)],
    design: createProjectTemplateDocument(),
  });
  session.openAsset('section');
  session.selectRendered('root/button');
  const view = render(<PropertiesPanel session={session} snap={session.getSnapshot()} />);
  const update = () =>
    view.rerender(<PropertiesPanel session={session} snap={session.getSnapshot()} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Styles' }));
  return { session, update };
}

describe('Styles inspector', () => {
  it('edits ordinary class CSS through the same inline and style-block sources', () => {
    const { session, update } = setup();
    fireEvent.click(screen.getAllByText('.Primary-action').at(-1)!);
    const css = screen.getByRole('textbox', { name: 'CSS button' });
    expect(css).toHaveValue('color: red;\nletter-spacing: 2px;');
    fireEvent.change(css, { target: { value: 'color: blue;\nletter-spacing: 3px;' } });
    fireEvent.blur(css);
    update();
    expect(session.getSnapshot().document.styles?.children?.button?.declarations).toMatchObject({
      color: 'blue',
    });
    const button = session.getSnapshot().document.nodes.button;
    expect(button?.type === 'text' ? button.style : undefined).toMatchObject({
      letterSpacing: '3px',
    });
  });

  it('keeps invalid declaration drafts visible without writing them, then supports Undo', () => {
    const { session, update } = setup();
    fireEvent.click(screen.getAllByText('.Primary-action').at(-1)!);
    const css = screen.getByRole('textbox', { name: 'CSS button' });
    fireEvent.change(css, { target: { value: 'color blue;' } });
    fireEvent.blur(css);
    update();
    expect(screen.getByRole('alert')).toHaveTextContent('Expected a property');
    expect(session.getSnapshot().document.styles?.children?.button?.declarations?.color).toBe(
      'red',
    );

    fireEvent.change(css, { target: { value: 'color: blue;' } });
    fireEvent.blur(css);
    update();
    expect(session.getSnapshot().document.styles?.children?.button?.declarations?.color).toBe(
      'blue',
    );
    act(() => session.undo());
    update();
    expect(session.getSnapshot().document.styles?.children?.button?.declarations?.color).toBe(
      'red',
    );
  });

  it('binds, validates, edits, and removes ordered selector rules', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    const { session, update } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    update();
    fireEvent.click(screen.getAllByText('.root').at(-1)!);
    const selector = screen.getByRole('textbox', { name: /Selector/ });
    const ruleId = session.getSnapshot().document.styles?.rules?.[0]?.id;
    expect(selector).toHaveValue('.root');

    fireEvent.change(selector, { target: { value: '.missing:checked + .root' } });
    fireEvent.blur(selector);
    update();
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown selector class');
    expect(session.getSnapshot().document.styles?.rules?.[0]?.selector).toBe('.root');

    fireEvent.change(selector, { target: { value: '.Primary-action' } });
    fireEvent.blur(selector);
    update();
    expect(screen.queryByRole('alert')).toBeNull();
    const updatedCss = screen.getByRole('textbox', { name: `CSS ${ruleId}` });
    fireEvent.change(updatedCss, { target: { value: 'outline: 2px solid red;' } });
    fireEvent.blur(updatedCss);
    update();
    const rule = session.getSnapshot().document.styles?.rules?.[0];
    expect(rule).toMatchObject({
      selector: '.Primary-action',
      bindings: { 'Primary-action': 'button' },
      declarations: { outline: '2px solid red' },
    });

    fireEvent.click(screen.getByRole('button', { name: `Delete rule ${rule!.id}` }));
    update();
    expect(session.getSnapshot().document.styles?.rules).toHaveLength(0);
  });

  it('adds utility badges without changing selector bindings and supports removal and Undo', () => {
    const { session, update } = setup();
    const input = screen.getByRole('combobox', { name: 'CSS classes for Primary action' });
    fireEvent.change(input, {
      target: { value: 'flex hover:bg-blue-600 w-[calc(100%-2rem)] flex' },
    });
    fireEvent.keyDown(input, { key: 'Enter' });
    update();
    expect(session.getSnapshot().document.nodes.button?.classes).toEqual([
      'flex',
      'hover:bg-blue-600',
      'w-[calc(100%-2rem)]',
    ]);
    expect(session.getSnapshot().document.nodes.button?.styleName).toBeUndefined();
    expect(screen.getAllByText('.Primary-action').length).toBeGreaterThan(0);
    expect(globalThis.document.querySelector('datalist option[value="grid"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove class flex' }));
    update();
    expect(session.getSnapshot().document.nodes.button?.classes).not.toContain('flex');
    act(() => session.undo());
    update();
    expect(screen.getByRole('button', { name: 'Remove class flex' })).toBeInTheDocument();
  });
});
