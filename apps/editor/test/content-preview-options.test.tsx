/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { fireEvent } from '@testing-library/react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import input from '../../../examples/input.json';
import textarea from '../../../examples/textarea.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const documents = validateCatalog([button, input, textarea]);

describe('Content tab preview options disclosure', () => {
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

  async function renderInputControl(session: EditorSession) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      session.openAsset('input', 'root');
      session.selectNode('control');
    });
  }

  it('keeps non-preview attributes above the disclosure', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await renderInputControl(session);

    const inspector = host!.querySelector('.inspector') ?? host!;
    expect(inspector.querySelector('select[name="attr-type"]')).toBeInstanceOf(HTMLSelectElement);
    expect(inspector.querySelector('input[name="attr-autocomplete"]')).toBeInstanceOf(
      HTMLInputElement,
    );
    const disclosure = inspector.querySelector('[data-testid="preview-options-disclosure"]');
    const readonlyOutside = [...inspector.querySelectorAll('input[name="attr-readonly"]')].filter(
      (element) => !disclosure?.contains(element),
    );
    const tabindexOutside = [...inspector.querySelectorAll('input[name="attr-tabindex"]')].filter(
      (element) => !disclosure?.contains(element),
    );
    expect(readonlyOutside).toHaveLength(0);
    expect(tabindexOutside).toHaveLength(0);
  });

  it('renders allowlist attributes inside a collapsed Preview options disclosure', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await renderInputControl(session);

    const disclosure = host!.querySelector('[data-testid="preview-options-disclosure"]');
    expect(disclosure).toBeInstanceOf(HTMLDetailsElement);
    expect(disclosure?.querySelector('summary')?.textContent).toBe('Preview options');
    expect((disclosure as HTMLDetailsElement).open).toBe(false);
    expect(disclosure?.querySelector('input[name="attr-readonly"]')).toBeInstanceOf(
      HTMLInputElement,
    );
    expect(disclosure?.querySelector('input[name="attr-tabindex"]')).toBeInstanceOf(
      HTMLInputElement,
    );
  });

  it('omits the disclosure when the node has no preview attributes', async () => {
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

    expect(host!.querySelector('[data-testid="preview-options-disclosure"]')).toBeNull();
    expect(host!.querySelector('select[name="attr-type"]')).toBeInstanceOf(HTMLSelectElement);
  });

  it('still commits attribute edits from inside the disclosure', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await renderInputControl(session);

    const disclosure = host!.querySelector(
      '[data-testid="preview-options-disclosure"]',
    ) as HTMLDetailsElement;
    disclosure.open = true;
    const tabindex = disclosure.querySelector('input[name="attr-tabindex"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(tabindex, { target: { value: '0' } });
      fireEvent.blur(tabindex);
    });

    const node = session.getSnapshot().document.nodes.control;
    expect(node).toMatchObject({ attributes: { tabindex: '0' } });
  });
});
