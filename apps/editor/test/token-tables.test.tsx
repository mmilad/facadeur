/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readTokenTree, validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';
import { openSettingsDomain } from './settings-navigation.js';

const documents = validateCatalog([button]);

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('design token tables', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  async function openDomain(session: EditorSession, domain: string) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));
    await openSettingsDomain(host!, domain);
  }

  it('sorts numeric token paths naturally and searches names and values', async () => {
    const session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    await openDomain(session, 'spacing');

    const paths = [...host!.querySelectorAll<HTMLElement>('tr[data-token-path]')].map(
      (row) => row.dataset.tokenPath,
    );
    expect(paths.slice(0, 7)).toEqual([
      'space.0',
      'space.1',
      'space.2',
      'space.3',
      'space.4',
      'space.5',
      'space.6',
    ]);

    await act(async () => {
      setInput(host!.querySelector('input[name="token-filter"]') as HTMLInputElement, '16px');
    });
    expect(host!.querySelector('tr[data-token-path="space.4"]')).toBeTruthy();
    expect(host!.querySelector('tr[data-token-path="space.5"]')).toBeNull();
  });

  it('adds a token through the compact popover action', async () => {
    const session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    await openDomain(session, 'colors');
    expect(host!.querySelector('.token-table-group-toggle')?.textContent).not.toContain('Color ');
    expect(host!.querySelector('.token-table-group-toggle small')).toBeNull();

    await act(async () => {
      (host!.querySelector('button[name="add-color"]') as HTMLButtonElement).click();
    });
    const input = document.querySelector('input[name="new-color-label"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    await act(async () => setInput(input, 'Brand highlight'));
    await act(async () => {
      (document.querySelector('button[name="add-color-submit"]') as HTMLButtonElement).click();
    });

    expect(
      readTokenTree(session.getSnapshot().design.tokens).tokens.has('color.brand.highlight'),
    ).toBe(true);
    expect(host!.querySelector('tr[data-token-path="color.brand.highlight"]')).toBeTruthy();
  });
});
