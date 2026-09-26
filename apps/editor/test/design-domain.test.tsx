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
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import textarea from '../../../examples/textarea.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

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

describe('design domain stage', () => {
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

  it('filters color tokens and supports viewport overrides in the stage view', async () => {
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
      (host!.querySelector('[data-design-domain="colors"]') as HTMLButtonElement).click();
    });
    expect(host!.textContent).toContain('Colors ·');
    expect(host!.textContent).toContain('color.accent.default');
    expect(host!.textContent).not.toContain('space.4');

    await act(async () => {
      session.setFocusViewport('tablet');
      session.setEditTarget('viewport');
    });
    expect(host!.textContent).toContain('Colors overrides at tablet');
  });

  it('returns to the asset preview when opening an asset from the tree', async () => {
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
      (host!.querySelector('[data-design-domain="spacing"]') as HTMLButtonElement).click();
    });
    expect(host!.querySelector('.design-domain-stage')).toBeTruthy();

    await act(async () => {
      (host!.querySelector('[data-asset-id="button"]') as HTMLButtonElement).click();
    });
    expect(host!.querySelector('.design-domain-stage')).toBeNull();
    expect(document.querySelector('iframe')).toBeTruthy();
  });
});
