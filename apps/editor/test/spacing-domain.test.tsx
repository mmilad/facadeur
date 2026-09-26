/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readTokenTree } from '@facadeur/core';
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

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('spacing domain panel', () => {
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

  async function openSpacing(session: EditorSession) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      (host!.querySelector('[data-design-domain="spacing"]') as HTMLButtonElement).click();
    });
  }

  it('adds a spacing token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openSpacing(session);

    const pathInput = host!.querySelector('input[name="new-spacing-path"]') as HTMLInputElement;
    setInput(pathInput, 'space.stack.xl');
    await act(async () => {
      (host!.querySelector('button[name="add-spacing"]') as HTMLButtonElement).click();
    });

    const indexed = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexed.tokens.get('space.stack.xl')).toMatchObject({
      type: 'dimension',
      value: '0',
    });
    expect(host!.textContent).toContain('space.stack.xl');
  });

  it('blocks removing a spacing token that other tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openSpacing(session);

    await act(async () => {
      (host!.querySelector('button[name="remove-spacing-space.4"]') as HTMLButtonElement).click();
    });

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('space.4')).toBe(true);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/\{space\.4\}/);
  });

  it('rejects an invalid spacing path on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openSpacing(session);

    const pathInput = host!.querySelector('input[name="new-spacing-path"]') as HTMLInputElement;
    setInput(pathInput, 'gap.only');
    await act(async () => {
      (host!.querySelector('button[name="add-spacing"]') as HTMLButtonElement).click();
    });

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('gap.only')).toBe(false);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/space\./i);
  });

  it('rejects duplicate spacing paths on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openSpacing(session);

    const pathInput = host!.querySelector('input[name="new-spacing-path"]') as HTMLInputElement;
    setInput(pathInput, 'space.gap.md');
    await act(async () => {
      (host!.querySelector('button[name="add-spacing"]') as HTMLButtonElement).click();
    });

    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/already exists/i);
  });
});
