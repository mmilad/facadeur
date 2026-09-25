/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, afterEach } from 'vitest';
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

describe('viewport layers UX', () => {
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

  it('selects a viewport from Layers and shows chrome options in the inspector', async () => {
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
      button.textContent?.includes('tablet'),
    );
    expect(viewportRow).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      viewportRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const snap = session.getSnapshot();
    expect(snap.selectedViewportId).toBe('tablet');
    expect(snap.selectedNodeId).toBeNull();
    expect(host.querySelector('input[name="viewport-inner-padding"]')).toBeInstanceOf(
      HTMLInputElement,
    );
    expect(host.querySelector('.viewport-edit')).toBeNull();

    await act(async () => {
      session.setViewportChrome('tablet', { innerPaddingPx: 24, title: 'Tablet preview' });
    });
    const title = document.querySelector(
      '.viewport-frame[data-breakpoint="tablet"] .viewport-chrome-title',
    );
    expect(title?.textContent).toBe('Tablet preview');
  });

  it('keeps node properties and ViewportEditBar when a layer is selected', async () => {
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
    expect(host.querySelector('.viewport-edit')).toBeTruthy();
    expect(host.querySelector('input[name="tag"]')).toBeInstanceOf(HTMLInputElement);
    expect(session.getSnapshot().selectedViewportId).toBeNull();
  });
});
