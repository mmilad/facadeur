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
    await openSettingsDomain(host!, 'radius');
  }

  async function submitNewToken(label: string) {
    if (!document.querySelector('input[name="new-radius-label"]')) {
      await act(async () => {
        (host!.querySelector('button[name="add-radius"]') as HTMLButtonElement).click();
      });
    }
    const pathInput = document.querySelector('input[name="new-radius-label"]') as HTMLInputElement;
    expect(pathInput).toBeInstanceOf(HTMLInputElement);
    await act(async () => setInput(pathInput, label));
    await act(async () => {
      (document.querySelector('button[name="add-radius-submit"]') as HTMLButtonElement).click();
    });
  }

  it('adds a radius token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openRadius(session);

    await submitNewToken('Corner xl');

    expect(tokenAtPath(session.getSnapshot().design.tokens, 'radius.corner.xl')).toMatchObject({
      type: 'dimension',
      value: '8px',
    });
    expect(host!.textContent).toContain('--fcdr-radius-corner-xl');
  });

  it('blocks removing a radius token that other tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openRadius(session);

    await act(async () => {
      (host!.querySelector('button[name="remove-radius-radius.sm"]') as HTMLButtonElement).click();
    });

    expect(tokenAtPath(session.getSnapshot().design.tokens, 'radius.sm')).toBeDefined();
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/\{radius\.sm\}/);
  });

  it('rejects an empty label on add', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openRadius(session);

    await submitNewToken('   ');

    expect(tokenAtPath(session.getSnapshot().design.tokens, 'radius.corner.xl')).toBe(
      false,
    );
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/label is required/i);
  });

  it('suffixes a generated radius path when the label collides', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openRadius(session);

    await submitNewToken('Md');

    expect(
      tokenAtPath(session.getSnapshot().design.tokens, 'radius.md2'),
    ).toMatchObject({ type: 'dimension' });
    expect(session.getSnapshot().notice?.tone).not.toBe('error');
  });

  it('shows viewport override cues and resets a radius token override', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    session.executeDesign({
      type: 'setToken',
      family: 'radius',
      token: withTokenBreakpoint(
        session.getSnapshot().design.tokens,
        'radius',
        fixtureIds.tokens.radius.lg,
        fixtureIds.catalog.breakpoints.tablet,
        '20px',
      ),
    });

    await openRadius(session);
    await act(async () => {
      session.setFocusViewport(fixtureIds.catalog.breakpoints.tablet);
      session.setEditTarget('viewport');
    });

    expect(host!.textContent).toContain('Radius overrides at Tablet');
    const indexedBefore = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedBefore.tokens.get(fixtureIds.tokens.radius.lg)?.breakpoints[fixtureIds.catalog.breakpoints.tablet]).toBe('20px');

    const resetButton = host!.querySelector('tr[data-token-path="radius.lg"] .override-cue button');
    expect(resetButton).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (resetButton as HTMLButtonElement).click();
    });

    const indexedAfter = readTokenTree(session.getSnapshot().design.tokens);
    expect(indexedAfter.tokens.get(fixtureIds.tokens.radius.lg)?.breakpoints[fixtureIds.catalog.breakpoints.tablet]).toBeUndefined();
    expect(indexedAfter.tokens.get(fixtureIds.tokens.radius.lg)?.value).toBe('12px');
  });
});
