/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readTokenTree } from '@facadeur/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { withTokenBreakpoint } from '../src/domain/edits/token-edit';
import { App } from '../src/ui/shell/EditorShell';
import { editorStandardCatalog, editorStandardDesign } from './fixtures/example-catalog';
import { tokenAtPath } from './fixtures/token-tree';
import { openSettingsDomain } from './settings-navigation';
import { exampleIds as fixtureIds } from '@facadeur/examples';

const documents = editorStandardCatalog();

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
    await openSettingsDomain(host!, 'shadow');
  }

  async function submitNewToken(label: string) {
    if (!document.querySelector('input[name="new-shadow-label"]')) {
      await act(async () => {
        (host!.querySelector('button[name="add-shadow"]') as HTMLButtonElement).click();
      });
    }
    const pathInput = document.querySelector('input[name="new-shadow-label"]') as HTMLInputElement;
    expect(pathInput).toBeInstanceOf(HTMLInputElement);
    await act(async () => setInput(pathInput, label));
    await act(async () => {
      (document.querySelector('button[name="add-shadow-submit"]') as HTMLButtonElement).click();
    });
  }

  it('adds a shadow token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openShadow(session);

    await submitNewToken('Elevated xl');

    const indexed = readTokenTree(session.getSnapshot().design.tokens);
    expect(tokenAtPath(session.getSnapshot().design.tokens, 'shadow.elevated.xl')).toMatchObject({
      type: 'shadow',
      value: {
        offsetX: '0px',
        offsetY: '1px',
        blur: '2px',
        spread: '0px',
        color: '#0f172a14',
      },
    });
    expect(host!.textContent).toContain('--fcdr-shadow-elevated-xl');
  });

  it('blocks removing a shadow token that other tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openShadow(session);

    await act(async () => {
      (host!.querySelector('button[name="remove-shadow-shadow.md"]') as HTMLButtonElement).click();
    });

    expect(tokenAtPath(session.getSnapshot().design.tokens, 'shadow.md')).toBeDefined();
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/\{shadow\.md\}/);
  });

  it('rejects an empty label on add', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openShadow(session);

    await submitNewToken('   ');

    expect(
      tokenAtPath(session.getSnapshot().design.tokens, 'shadow.elevated.xl'),
    ).toBe(false);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/label is required/i);
  });

  it('suffixes a generated shadow path when the label collides', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openShadow(session);

    await submitNewToken('Md');

    expect(
      tokenAtPath(session.getSnapshot().design.tokens, 'shadow.md2'),
    ).toMatchObject({ type: 'shadow' });
    expect(session.getSnapshot().notice?.tone).not.toBe('error');
  });

  it('shows viewport override cues and resets a shadow token override', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    const smOverride = {
      blur: '40px',
      color: '#0f172a29',
      offsetX: '0px',
      offsetY: '20px',
      spread: '0px',
    };
    session.executeDesign({
      type: 'setToken',
      family: 'shadow',
      token: withTokenBreakpoint(
        session.getSnapshot().design.tokens,
        'shadow',
        fixtureIds.tokens.shadow.lg,
        fixtureIds.catalog.breakpoints.tablet,
        smOverride,
      ),
    });

    await openShadow(session);
    await act(async () => {
      session.setFocusViewport(fixtureIds.catalog.breakpoints.tablet);
      session.setEditTarget('viewport');
    });

    expect(host!.textContent).toContain('Shadow overrides at Tablet');
    const indexedBefore = readTokenTree(session.getSnapshot().design.tokens);
    expect(
      indexedBefore.tokens.get(fixtureIds.tokens.shadow.lg)?.breakpoints[
        fixtureIds.catalog.breakpoints.tablet
      ],
    ).toEqual(smOverride);

    const resetButton = host!.querySelector('tr[data-token-path="shadow.lg"] .override-cue button');
    expect(resetButton).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (resetButton as HTMLButtonElement).click();
    });

    const indexedAfter = readTokenTree(session.getSnapshot().design.tokens);
    expect(
      indexedAfter.tokens.get(fixtureIds.tokens.shadow.lg)?.breakpoints[
        fixtureIds.catalog.breakpoints.tablet
      ],
    ).toBeUndefined();
    expect(indexedAfter.tokens.get(fixtureIds.tokens.shadow.lg)?.value).toMatchObject({
      offsetY: '16px',
    });
  });
});
