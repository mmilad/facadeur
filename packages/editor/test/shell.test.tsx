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
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createEditorSession, type EditorSession } from '../src/session.js';
import { App } from '../src/ui/App.js';

const documents = validateCatalog([button, input, card, signIn, specimenSection, specimenPage]);

describe('editor shell', () => {
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

  it('follows the store from the panels and undoes with Ctrl+Z', async () => {
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

    expect(host.textContent).toContain('Specimen');
    expect(host.textContent).toContain('specimen-section');

    const atoms = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'Atoms',
    );
    await act(async () => {
      atoms?.click();
    });
    expect(session.getSnapshot().openId).toBe('button');
    const frame = document.querySelector('iframe');
    expect(frame?.contentDocument?.body.textContent).toContain('Button');

    await act(async () => {
      session.selectNode('root');
    });
    const tag = host.querySelector('input[name="tag"]');
    expect(tag).toBeInstanceOf(HTMLInputElement);
    expect((tag as HTMLInputElement).value).toBe('button');
    const direction = host.querySelector('select[name="layout-direction"]');
    expect(direction).toBeInstanceOf(HTMLSelectElement);
    expect((direction as HTMLSelectElement).value).toBe('row');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    });
    expect(session.getSnapshot().tool).toBe('frame');
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(session.getSnapshot().tool).toBe('select');

    await act(async () => {
      session.execute({
        type: 'defineField',
        field: { name: 'label', type: 'text', default: 'Go' },
      });
    });
    expect(frame?.contentDocument?.body.textContent).toContain('Go');
    const label = host.querySelector('input[name="default-label"]');
    expect((label as HTMLInputElement).value).toBe('Go');

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
      );
    });
    expect(frame?.contentDocument?.body.textContent).toContain('Button');
    expect((host.querySelector('input[name="default-label"]') as HTMLInputElement).value).toBe(
      'Button',
    );
  });
});
