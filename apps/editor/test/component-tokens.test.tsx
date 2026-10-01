/**
 * @vitest-environment jsdom
 */
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import { readComponentTokens } from '../src/domain/component-tokens.js';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const documents = validateCatalog([button]);

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
    await act(async () => {
      session.execute({
        type: 'setComponentToken',
        path: 'color.bg',
        token: { type: 'color', value: '{color.accent.default}' },
      });
    });
    const seeded = readComponentTokens(session.getSnapshot().document)?.['color.bg']?.value;
    if (seeded !== '{color.accent.default}') {
      expect.fail('setComponentToken is not available in @facadeur/core yet');
    }

    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));

    expect(host.querySelector('[data-component-token-path="color.bg"]')).toBeTruthy();

    const pickerToggle = host.querySelector(
      '[aria-label^="Choose color.bg"]',
    ) as HTMLButtonElement;
    await act(async () => {
      pickerToggle.click();
    });
    const custom = document.querySelector(
      'input[name="component-token-color.bg-custom"]',
    ) as HTMLInputElement;
    await act(async () => {
      setInput(custom, '#336699');
    });
    const useDirect = [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Use direct value',
    ) as HTMLButtonElement;
    await act(async () => {
      useDirect.click();
    });

    expect(readComponentTokens(session.getSnapshot().document)?.['color.bg']?.value).toBe('#336699');
  });
});
