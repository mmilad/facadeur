/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import textarea from '../../../examples/textarea.json';
import { createEditorSession, type EditorSession } from '../src/session.js';
import { App } from '../src/ui/App.js';

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

describe('properties inspector tabs', () => {
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

  it('shows primary tabs and hides layout until the Layout tab is selected', async () => {
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
      session.openAsset('button', 'root');
    });

    expect(host.querySelector('button[name="property-tab-content"]')).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(host.querySelector('input[name="tag"]')).toBeInstanceOf(HTMLInputElement);
    expect(host.querySelector('select[name="layout-direction"]')).toBeNull();

    await act(async () => {
      host!
        .querySelector('button[name="property-tab-layout"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.querySelector('select[name="layout-direction"]')).toBeInstanceOf(HTMLSelectElement);
    expect(host.querySelector('input[name="tag"]')).toBeNull();
  });

  it('resets to Content when selection changes', async () => {
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
      session.openAsset('textarea', 'root');
      session.selectNode('control');
    });
    await act(async () => {
      host!
        .querySelector('button[name="property-tab-data"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.querySelector('input[name="tag"]')).toBeNull();

    await act(async () => {
      session.selectNode('root');
    });
    expect(host.querySelector('input[name="tag"]')).toBeInstanceOf(HTMLInputElement);
  });

  it('does not show property tabs when a viewport is selected', async () => {
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

    const viewportRow = [...host.querySelectorAll('button.viewport-layer')].find((button) =>
      button.textContent?.includes('mobile'),
    );
    await act(async () => {
      viewportRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.querySelector('button[name="property-tab-content"]')).toBeNull();
    expect(host.querySelector('input[name="viewport-inner-padding"]')).toBeInstanceOf(
      HTMLInputElement,
    );
  });
});
