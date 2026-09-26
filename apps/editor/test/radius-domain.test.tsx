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
import { withTokenBreakpoint } from '../src/domain/token-edit.js';
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

describe('radius domain panel', () => {
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

  async function openRadius(session: EditorSession) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      (host!.querySelector('[data-design-domain="radius"]') as HTMLButtonElement).click();
    });
  }

  it('adds a radius token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openRadius(session);

    const pathInput = host!.querySelector('input[name="new-radius-path"]') as HTMLInputElement;
    setInput(pathInput, 'radius.corner.xl');
    await act(async () => {
      (host!.querySelector('button[name="add-radius"]') as HTMLButtonElement).click();
    });

    const indexed = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexed.tokens.get('radius.corner.xl')).toMatchObject({
      type: 'dimension',
      value: '8px',
    });
    expect(host!.textContent).toContain('radius.corner.xl');
  });

  it('blocks removing a radius token that other tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openRadius(session);

    await act(async () => {
      (host!.querySelector('button[name="remove-radius-radius.md"]') as HTMLButtonElement).click();
    });

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('radius.md')).toBe(true);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/\{radius\.md\}/);
  });

  it('rejects an invalid radius path on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openRadius(session);

    const pathInput = host!.querySelector('input[name="new-radius-path"]') as HTMLInputElement;
    setInput(pathInput, 'corner.only');
    await act(async () => {
      (host!.querySelector('button[name="add-radius"]') as HTMLButtonElement).click();
    });

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('corner.only')).toBe(
      false,
    );
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/radius\./i);
  });

  it('rejects duplicate radius paths on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openRadius(session);

    const pathInput = host!.querySelector('input[name="new-radius-path"]') as HTMLInputElement;
    setInput(pathInput, 'radius.md');
    await act(async () => {
      (host!.querySelector('button[name="add-radius"]') as HTMLButtonElement).click();
    });

    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/already exists/i);
  });

  it('shows viewport override cues and resets a radius token override', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    session.executeDesign({
      type: 'setToken',
      path: 'radius.lg',
      token: withTokenBreakpoint(
        session.getSnapshot().design.tokens,
        'radius.lg',
        'tablet',
        '20px',
      ),
    });

    await openRadius(session);
    await act(async () => {
      session.setFocusViewport('tablet');
      session.setEditTarget('viewport');
    });

    expect(host!.textContent).toContain('Radius overrides at tablet');
    const indexedBefore = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedBefore.tokens.get('radius.lg')?.breakpoints.tablet).toBe('20px');

    const resetButton = host!
      .querySelector('input[name="token-radius.lg"]')
      ?.closest('div')
      ?.parentElement?.querySelector('.override-cue button');
    expect(resetButton).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (resetButton as HTMLButtonElement).click();
    });

    const indexedAfter = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedAfter.tokens.get('radius.lg')?.breakpoints.tablet).toBeUndefined();
    expect(indexedAfter.tokens.get('radius.lg')?.value).toBe('12px');
  });
});
