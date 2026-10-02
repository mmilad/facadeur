/**
 * @vitest-environment jsdom
 */
import { createId, listComponentTokens, validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import { readComponentTokens } from '../src/domain/component-tokens.js';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const documents = validateCatalog([button]);

function tokenValueByPath(doc: ReturnType<EditorSession['getSnapshot']>['document'], path: string) {
  return listComponentTokens(readComponentTokens(doc)).find((entry) => entry.path === path)?.value;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('component tokens inspector', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('updates a local token default from a global ref to a literal', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    session.openAsset('button', 'root');
    const id = createId();
    await act(async () => {
      session.execute({
        type: 'setComponentToken',
        id,
        path: 'color.bg',
        token: { type: 'color', value: '{color.accent.default}' },
      });
    });
    expect(tokenValueByPath(session.getSnapshot().document, 'color.bg')).toBe(
      '{color.accent.default}',
    );

    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));

    await act(async () => {
      host!
        .querySelector('button[name="property-tab-tokens"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.querySelector('[data-component-token-path="color.bg"]')).toBeTruthy();

    const tokenRow = host.querySelector('[data-component-token-path="color.bg"]')!;
    const pickerToggle = tokenRow.querySelector('[aria-label^="Choose"]') as HTMLButtonElement;
    await act(async () => {
      pickerToggle.click();
    });
    const tokenId = tokenRow.getAttribute('data-component-token-id');
    const custom = document.querySelector(
      `input[name="component-token-${tokenId}-custom"]`,
    ) as HTMLInputElement;
    await act(async () => {
      setInput(custom, '#336699');
    });
    const useDirect = [...document.querySelectorAll('button')].find(
      (buttonEl) => buttonEl.textContent === 'Use direct value',
    ) as HTMLButtonElement;
    await act(async () => {
      useDirect.click();
    });

    expect(tokenValueByPath(session.getSnapshot().document, 'color.bg')).toBe('#336699');
  });
});
