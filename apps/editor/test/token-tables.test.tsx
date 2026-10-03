/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  createId,
  listComponentTokens,
  readTokenTree,
  setTokenInTree,
  type JsonValue,
  type TokenTree,
} from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import { withTokenLabel, withTokenValue } from '../src/domain/edits/token-edit';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { expandExampleCatalog } from './fixtures/example-catalog';
import { openSettingsDomain } from './settings-navigation';

const documents = expandExampleCatalog([button]);

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

  it('keeps table labels synchronized through undo, redo, and an external snapshot update', async () => {
    const session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    await openDomain(session, 'spacing');
    const inputFor = () =>
      host!.querySelector<HTMLInputElement>(
        'tr[data-token-path="space.4"] .token-table-label-input',
      )!;
    const labelOf = () =>
      readTokenTree(session.getSnapshot().design.tokens).tokens.get('space.4')?.label;
    const input = inputFor();

    await act(async () => {
      input.focus();
      setInput(input, 'Comfortable');
      input.blur();
    });
    expect(labelOf()).toBe('Comfortable');
    expect(inputFor().value).toBe('Comfortable');

    await act(async () => session.undo());
    expect(labelOf()).toBeUndefined();
    expect(inputFor().value).toBe('4');
    await act(async () => session.redo());
    expect(labelOf()).toBe('Comfortable');
    expect(inputFor().value).toBe('Comfortable');

    await act(async () => {
      const currentInput = inputFor();
      currentInput.focus();
      setInput(currentInput, 'Stale draft');
      const tokens = session.getSnapshot().design.tokens;
      session.executeDesign({
        type: 'setToken',
        path: 'space.4',
        token: withTokenLabel(tokens, 'space.4', 'Remote label'),
      });
    });
    expect(inputFor().value).toBe('Remote label');
    await act(async () => inputFor().blur());
    expect(labelOf()).toBe('Remote label');
    expect(inputFor().value).toBe('Remote label');

    await act(async () => {
      const tokens = session.getSnapshot().design.tokens;
      session.executeDesign({
        type: 'setToken',
        path: 'space.4',
        token: withTokenLabel(tokens, 'space.4', '4'),
      });
    });
    expect(inputFor().value).toBe('4');
    await act(async () => {
      const currentInput = inputFor();
      currentInput.focus();
      setInput(currentInput, '');
      currentInput.blur();
    });
    expect(labelOf()).toBeUndefined();
    expect(inputFor().value).toBe('4');
  });

  it('refreshes component token labels after undo with an active draft', async () => {
    const session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    session.openAsset('button', 'root');
    const id = createId();
    await act(async () => {
      session.execute({
        type: 'setComponentToken',
        id,
        path: 'color.bg',
        token: { type: 'color', value: '#ffffff' },
      });
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));
    await act(async () => {
      host!.querySelector<HTMLButtonElement>('button[name="property-tab-tokens"]')?.click();
    });
    const inputFor = () =>
      host!.querySelector<HTMLInputElement>(
        '[data-component-token-path="color.bg"] .component-token-row-label',
      )!;

    await act(async () => {
      const input = inputFor();
      input.focus();
      setInput(input, 'Local label');
      input.blur();
    });
    expect(inputFor().value).toBe('Local label');
    await act(async () => {
      const input = inputFor();
      input.focus();
      setInput(input, 'Stale draft');
      session.undo();
    });
    expect(inputFor().value).toBe('Bg');
    await act(async () => inputFor().blur());
    expect(inputFor().value).toBe('Bg');
    expect(
      listComponentTokens(session.getSnapshot().document.componentTokens).find(
        (token) => token.id === id,
      )?.label,
    ).toBeUndefined();
  });

  it('shows labels for token references in typography and shadow summaries', async () => {
    const design = structuredClone(createProjectTemplateDocument());
    let tokens = (design.tokens ?? {}) as TokenTree;
    tokens = setTokenInTree(tokens, 'space.4', withTokenLabel(tokens, 'space.4', 'Comfortable'));
    const body = readTokenTree(tokens).tokens.get('type.body')?.value as Record<string, JsonValue>;
    tokens = setTokenInTree(
      tokens,
      'type.body',
      withTokenValue(tokens, 'type.body', { ...body, fontSize: '{space.4}' }),
    );
    const shadow = readTokenTree(tokens).tokens.get('shadow.md')?.value as Record<
      string,
      JsonValue
    >;
    tokens = setTokenInTree(
      tokens,
      'shadow.md',
      withTokenValue(tokens, 'shadow.md', { ...shadow, offsetX: '{space.4}' }),
    );
    design.tokens = tokens;
    const session = createEditorSession({ documents, design });
    await openDomain(session, 'typography');

    const typographySummary = host!.querySelector(
      'tr[data-token-path="type.body"] .design-typography-editor summary .meta',
    );
    expect(typographySummary?.textContent).toContain('Comfortable');
    expect(typographySummary?.textContent).not.toContain('{space.4}');
    expect(
      readTokenTree(session.getSnapshot().design.tokens).tokens.get('type.body')?.value,
    ).toMatchObject({
      fontSize: '{space.4}',
    });

    await act(async () => {
      host!.querySelector<HTMLButtonElement>('[data-settings-tab="shadow"]')?.click();
    });
    const shadowSummary = host!.querySelector(
      'tr[data-token-path="shadow.md"] .design-shadow-editor summary .meta',
    );
    expect(shadowSummary?.textContent).toContain('Comfortable');
    expect(shadowSummary?.textContent).not.toContain('{space.4}');
    expect(
      readTokenTree(session.getSnapshot().design.tokens).tokens.get('shadow.md')?.value,
    ).toMatchObject({
      offsetX: '{space.4}',
    });
  });
});
