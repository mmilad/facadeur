// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session.js';
import { PropertiesPanel } from '../src/ui/sidebar/properties/PropertiesPanel.js';

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
    fireEvent.click(screen.getByText('.Primary-action'));
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
    fireEvent.click(screen.getByText('.Primary-action'));
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

  it('renames a local class while selector bindings continue to point to the same node', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    const { session, update } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    update();
    const rule = session.getSnapshot().document.styles?.rules?.[0];
    expect(rule).toBeDefined();
    fireEvent.click(screen.getAllByText('.root').at(-1)!);
    const selector = screen.getByRole('textbox', { name: `Selector ${rule!.id}` });
    fireEvent.change(selector, { target: { value: '.Primary-action' } });
    fireEvent.blur(selector);
    update();
    fireEvent.click(screen.getByRole('tab', { name: 'Content' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Styles' }));
    const className = screen.getByRole('textbox', { name: 'CSS class for Primary action' });
    fireEvent.change(className, { target: { value: 'primary-action' } });
    fireEvent.blur(className);
    update();
    expect(
      (session.getSnapshot().document.nodes.button as { styleName?: string } | undefined)
        ?.styleName,
    ).toBe('primary-action');
    expect(session.getSnapshot().document.styles?.rules?.[0]).toMatchObject({
      selector: '.Primary-action',
      bindings: { 'Primary-action': 'button' },
    });
    expect(screen.getAllByText('.primary-action').length).toBeGreaterThan(0);
  });
});
