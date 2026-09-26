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

describe('shadow domain panel', () => {
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

  async function openShadow(session: EditorSession) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      (host!.querySelector('[data-design-domain="shadow"]') as HTMLButtonElement).click();
    });
  }

  it('adds a shadow token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openShadow(session);

    const pathInput = host!.querySelector('input[name="new-shadow-path"]') as HTMLInputElement;
    setInput(pathInput, 'shadow.elevated.xl');
    await act(async () => {
      (host!.querySelector('button[name="add-shadow"]') as HTMLButtonElement).click();
    });

    const indexed = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexed.tokens.get('shadow.elevated.xl')).toMatchObject({
      type: 'shadow',
      value: {
        offsetX: '0px',
        offsetY: '1px',
        blur: '2px',
        spread: '0px',
        color: '#0f172a14',
      },
    });
    expect(host!.textContent).toContain('shadow.elevated.xl');
  });

  it('blocks removing a shadow token that other tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openShadow(session);

    await act(async () => {
      (host!.querySelector('button[name="remove-shadow-shadow.md"]') as HTMLButtonElement).click();
    });

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('shadow.md')).toBe(true);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/\{shadow\.md\}/);
  });

  it('rejects an invalid shadow path on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openShadow(session);

    const pathInput = host!.querySelector('input[name="new-shadow-path"]') as HTMLInputElement;
    setInput(pathInput, 'elevated.only');
    await act(async () => {
      (host!.querySelector('button[name="add-shadow"]') as HTMLButtonElement).click();
    });

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('elevated.only')).toBe(
      false,
    );
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/shadow\./i);
  });

  it('rejects duplicate shadow paths on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openShadow(session);

    const pathInput = host!.querySelector('input[name="new-shadow-path"]') as HTMLInputElement;
    setInput(pathInput, 'shadow.md');
    await act(async () => {
      (host!.querySelector('button[name="add-shadow"]') as HTMLButtonElement).click();
    });

    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/already exists/i);
  });

  it('shows viewport override cues and resets a shadow token override', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    const tabletOverride = {
      blur: '40px',
      color: '#0f172a29',
      offsetX: '0px',
      offsetY: '20px',
      spread: '0px',
    };
    session.executeDesign({
      type: 'setToken',
      path: 'shadow.lg',
      token: withTokenBreakpoint(
        session.getSnapshot().design.tokens,
        'shadow.lg',
        'tablet',
        tabletOverride,
      ),
    });

    await openShadow(session);
    await act(async () => {
      session.setFocusViewport('tablet');
      session.setEditTarget('viewport');
    });

    expect(host!.textContent).toContain('Shadow overrides at tablet');
    const indexedBefore = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedBefore.tokens.get('shadow.lg')?.breakpoints.tablet).toEqual(tabletOverride);

    const resetButton = host!
      .querySelector('textarea[name="token-shadow.lg"]')
      ?.closest('div')
      ?.parentElement?.querySelector('.override-cue button');
    expect(resetButton).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (resetButton as HTMLButtonElement).click();
    });

    const indexedAfter = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedAfter.tokens.get('shadow.lg')?.breakpoints.tablet).toBeUndefined();
    expect(indexedAfter.tokens.get('shadow.lg')?.value).toMatchObject({
      offsetY: '16px',
    });
  });
});
