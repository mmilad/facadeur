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
import { withTokenBreakpoint } from '../src/domain/edits/token-edit.js';
import { App } from '../src/ui/shell/EditorShell.js';
import { openSettingsDomain } from './settings-navigation.js';

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
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
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
    await openSettingsDomain(host!, 'typography');
  }

  async function submitNewToken(label: string) {
    if (!document.querySelector('input[name="new-typography-label"]')) {
      await act(async () => {
        (host!.querySelector('button[name="add-typography"]') as HTMLButtonElement).click();
      });
    }
    const pathInput = document.querySelector(
      'input[name="new-typography-label"]',
    ) as HTMLInputElement;
    expect(pathInput).toBeInstanceOf(HTMLInputElement);
    await act(async () => setInput(pathInput, label));
    await act(async () => {
      (document.querySelector('button[name="add-typography-submit"]') as HTMLButtonElement).click();
    });
  }

  it('adds a typography token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openTypography(session);

    await submitNewToken('Hero');

    const indexed = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexed.tokens.get('type.hero')).toMatchObject({
      type: 'typography',
      value: {
        fontFamily: '{font.sans}',
        fontSize: '16px',
        fontWeight: 400,
        letterSpacing: '0',
        lineHeight: 1.5,
      },
    });
    expect(host!.textContent).toContain('--fcdr-type-hero');
    expect(host!.textContent).toContain('Hero');
  });

  it('blocks removing a typography token that other tokens still reference', async () => {
    const design = createProjectTemplateDocument();
    const tokens = design.tokens!;
    design.tokens = {
      ...tokens,
      type: {
        ...(tokens.type as object),
        alias: { $type: 'typography', $value: '{type.body}' },
      },
    };
    const session = createEditorSession({ documents, design });
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

  it('rejects an empty label on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openTypography(session);

    await submitNewToken('   ');

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('type.hero')).toBe(false);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/label is required/i);
  });

  it('rejects duplicate typography paths on add', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openTypography(session);

    await submitNewToken('Body');

    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/already exists/i);
  });

  it('shows viewport override cues and resets a typography token override', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    const tabletOverride = {
      fontFamily: '{font.sans}',
      fontSize: '20px',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0',
    };
    session.executeDesign({
      type: 'setToken',
      path: 'type.title',
      token: withTokenBreakpoint(
        session.getSnapshot().design.tokens,
        'type.title',
        'sm',
        tabletOverride,
      ),
    });
    await openTypography(session);
    await act(async () => {
      session.setFocusViewport('sm');
      session.setEditTarget('viewport');
    });

    expect(host!.textContent).toContain('Typography overrides at Tablet');
    const indexedBefore = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedBefore.tokens.get('type.title')?.breakpoints.sm).toEqual(tabletOverride);

    const resetButton = host!.querySelector(
      'tr[data-token-path="type.title"] .override-cue button',
    );
    expect(resetButton).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (resetButton as HTMLButtonElement).click();
    });

    const indexedAfter = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedAfter.tokens.get('type.title')?.breakpoints.sm).toBeUndefined();
    expect(indexedAfter.tokens.get('type.title')?.value).toMatchObject({
      fontSize: '24px',
    });
  });

  it('shows a type style by its label and writes a media-query size on that row', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openTypography(session);

    expect(host!.textContent).toContain('Body');
    expect(host!.textContent).not.toContain('font.weight');
    expect(host!.querySelector('[data-viewport-tab="sm"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host!.querySelector('[data-viewport-tab="xl"]')).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      (host!.querySelector('[data-viewport-tab="sm"]') as HTMLButtonElement).click();
    });
    const tablet = host!.querySelector('input[name="token-type.body-fontSize"]') as HTMLInputElement;
    expect(tablet).toBeInstanceOf(HTMLInputElement);
    expect(tablet.value).toBe('17px');

    await act(async () => setInput(tablet, '19px'));

    expect(
      readTokenTree(session.getSnapshot().design.tokens).tokens.get('type.body')?.breakpoints
        .sm,
    ).toEqual({ fontSize: '19px' });
  });
});
