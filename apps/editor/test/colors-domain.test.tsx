/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readTokenTree } from '@facadeur/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { editorStandardCatalog, editorStandardDesign } from './fixtures/example-catalog';
import { tokenAtPath } from './fixtures/token-tree';
import { openSettingsDomain } from './settings-navigation';

const documents = editorStandardCatalog();

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('colors domain panel', () => {
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

  async function openColors(session: EditorSession) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await openSettingsDomain(host!, 'colors');
  }

  async function submitNewToken(label: string) {
    if (!document.querySelector('input[name="new-color-label"]')) {
      await act(async () => {
        (host!.querySelector('button[name="add-color"]') as HTMLButtonElement).click();
      });
    }
    const pathInput = document.querySelector('input[name="new-color-label"]') as HTMLInputElement;
    expect(pathInput).toBeInstanceOf(HTMLInputElement);
    await act(async () => setInput(pathInput, label));
    await act(async () => {
      (document.querySelector('button[name="add-color-submit"]') as HTMLButtonElement).click();
    });
  }

  it('adds a color token with a valid path and default value', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openColors(session);

    await submitNewToken('Brand highlight');

    const indexed = readTokenTree(session.getSnapshot().design.tokens);
    expect(tokenAtPath(session.getSnapshot().design.tokens, 'color.brand.highlight')).toMatchObject({
      type: 'color',
      value: '#000000',
    });
    expect(host!.textContent).toContain('--fcdr-color-brand-highlight');
  });

  it('blocks removing a color that other tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openColors(session);

    await act(async () => {
      (
        host!.querySelector('button[name="remove-color-color.blue.500"]') as HTMLButtonElement
      ).click();
    });

    expect(tokenAtPath(session.getSnapshot().design.tokens, 'color.blue.500')).toBeDefined();
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/\{color\.blue\.500\}/);
  });

  it('rejects an empty label on add', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openColors(session);

    await submitNewToken('   ');

    expect(
      tokenAtPath(session.getSnapshot().design.tokens, 'color.brand.highlight'),
    ).toBe(false);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/label is required/i);
  });

  it('suffixes a generated color path when the label collides', async () => {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    await openColors(session);

    await submitNewToken('Accent default');

    expect(
      tokenAtPath(session.getSnapshot().design.tokens, 'color.accent.default2'),
    ).toMatchObject({ type: 'color' });
    expect(session.getSnapshot().notice?.tone).not.toBe('error');
  });
});
