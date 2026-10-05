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
import { openSettingsDomain } from './settings-navigation';

const documents = editorStandardCatalog();

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
    await openSettingsDomain(host!, 'spacing');
  }

  async function submitNewToken(label: string) {
    if (!document.querySelector('input[name="new-spacing-label"]')) {
      await act(async () => {
        (host!.querySelector('button[name="add-spacing"]') as HTMLButtonElement).click();
      });
    }
    const pathInput = document.querySelector('input[name="new-spacing-label"]') as HTMLInputElement;
    expect(pathInput).toBeInstanceOf(HTMLInputElement);
    await act(async () => setInput(pathInput, label));
    await act(async () => {
      (document.querySelector('button[name="add-spacing-submit"]') as HTMLButtonElement).click();
    });
  }

  it('adds a spacing token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openSpacing(session);

    await submitNewToken('Gap xl');

    const indexed = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexed.tokens.get('space.gap.xl')).toMatchObject({
      type: 'dimension',
      value: '16px',
    });
    expect(host!.textContent).toContain('--fcdr-space-gap-xl');
  });

  it('blocks removing a spacing token that other tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
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
      design: editorStandardDesign(),
    });
    await openSpacing(session);

    await submitNewToken('   ');

    expect(readTokenTree(session.getSnapshot().design.tokens).tokens.has('space.gap.xl')).toBe(
      false,
    );
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/label is required/i);
  });

  it('suffixes a generated spacing path when the label collides', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openSpacing(session);

    await submitNewToken('Gap md');

    expect(
      readTokenTree(session.getSnapshot().design.tokens).tokens.get('space.gap.md2'),
    ).toMatchObject({ type: 'dimension' });
    expect(session.getSnapshot().notice?.tone).not.toBe('error');
  });

  it('shows viewport override cues and resets a spacing token override', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    session.executeDesign({
      type: 'setToken',
      path: 'space.5',
      token: withTokenBreakpoint(session.getSnapshot().design.tokens, 'space.5', 'sm', '28px'),
    });

    await openSpacing(session);
    await act(async () => {
      session.setFocusViewport('sm');
      session.setEditTarget('viewport');
    });

    expect(host!.textContent).toContain('Spacing overrides at Tablet');
    const indexedBefore = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedBefore.tokens.get('space.5')?.breakpoints.sm).toBe('28px');

    const resetButton = host!.querySelector('tr[data-token-path="space.5"] .override-cue button');
    expect(resetButton).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (resetButton as HTMLButtonElement).click();
    });

    const indexedAfter = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedAfter.tokens.get('space.5')?.breakpoints.sm).toBeUndefined();
    expect(indexedAfter.tokens.get('space.5')?.value).toBe('20px');
  });
});
