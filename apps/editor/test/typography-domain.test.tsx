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

describe('typography domain panel', () => {
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

  async function openTypography(session: EditorSession) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      (host!.querySelector('[data-design-domain="typography"]') as HTMLButtonElement).click();
    });
  }

  it('adds a typography token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openTypography(session);

    const pathInput = host!.querySelector('input[name="new-typography-path"]') as HTMLInputElement;
    setInput(pathInput, 'type.lead');
    await act(async () => {
      (host!.querySelector('button[name="add-typography"]') as HTMLButtonElement).click();
    });

    const indexed = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexed.tokens.get('type.lead')).toMatchObject({
      type: 'typography',
      value: {
        fontFamily: '{font.sans}',
        fontSize: '16px',
        fontWeight: '{font.weight.regular}',
        lineHeight: 1.5,
        letterSpacing: '0',
      },
    });
    expect(host!.textContent).toContain('type.lead');
  });

  it('blocks removing a typography token that other tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    session.executeDesign({
      type: 'setToken',
      path: 'type.quote',
      token: { $type: 'typography', $value: '{type.body}' },
    });
    await openTypography(session);

    await act(async () => {
      (
        host!.querySelector('button[name="remove-typography-type.body"]') as HTMLButtonElement
      ).click();
    });

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('type.body')).toBe(true);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/\{type\.body\}/);
  });

  it('rejects an invalid typography path on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openTypography(session);

    const pathInput = host!.querySelector('input[name="new-typography-path"]') as HTMLInputElement;
    setInput(pathInput, 'body.only');
    await act(async () => {
      (host!.querySelector('button[name="add-typography"]') as HTMLButtonElement).click();
    });

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('body.only')).toBe(false);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/type\./i);
  });

  it('rejects duplicate typography paths on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openTypography(session);

    const pathInput = host!.querySelector('input[name="new-typography-path"]') as HTMLInputElement;
    setInput(pathInput, 'type.body');
    await act(async () => {
      (host!.querySelector('button[name="add-typography"]') as HTMLButtonElement).click();
    });

    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/already exists/i);
  });

  it('shows viewport override cues and resets a typography token override', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    const tabletOverride = { fontSize: '20px' };
    session.executeDesign({
      type: 'setToken',
      path: 'type.label',
      token: withTokenBreakpoint(
        session.getSnapshot().design.tokens,
        'type.label',
        'tablet',
        tabletOverride,
      ),
    });

    await openTypography(session);
    await act(async () => {
      session.setFocusViewport('tablet');
      session.setEditTarget('viewport');
    });

    expect(host!.textContent).toContain('Typography overrides at tablet');
    const indexedBefore = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedBefore.tokens.get('type.label')?.breakpoints.tablet).toEqual(tabletOverride);

    const resetButton = host!
      .querySelector('input[name="token-type.label-fontSize"]')
      ?.closest('.token-row')
      ?.parentElement?.querySelector('.override-cue button');
    expect(resetButton).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (resetButton as HTMLButtonElement).click();
    });

    const indexedAfter = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedAfter.tokens.get('type.label')?.breakpoints.tablet).toBeUndefined();
    expect(indexedAfter.tokens.get('type.label')?.value).toMatchObject({
      fontSize: '14px',
    });
  });
});
