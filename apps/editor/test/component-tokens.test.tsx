/**
 * @vitest-environment jsdom
 */
import { listComponentTokens } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import { readComponentTokens } from '../src/domain/component-tokens';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { expandExampleCatalog } from './fixtures/example-catalog';

const documents = expandExampleCatalog([button]);

function tokenValueByPath(doc: ReturnType<EditorSession['getSnapshot']>['document'], path: string) {
  return listComponentTokens(readComponentTokens(doc)).find((entry) => entry.path === path)?.value;
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('component tokens inspector', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('updates a local token default from a global ref to a literal', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    session.openAsset('button', 'root');
    const id = listComponentTokens(
      session.project.styles.document('button').componentTokens ?? {},
    ).find((token) => token.path === 'color.bg')!.id;
    await act(async () => {
      session.execute({
        type: 'setComponentToken',
        id,
        path: 'color.bg',
        token: { type: 'color', value: '{color.accent.default}' },
      });
    });
    expect(tokenValueByPath(session.getSnapshot().document, 'color.bg')).toBe(
      '{color.accent.default}',
    );
    expect(session.getSnapshot().notice?.tone).not.toBe('error');

    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));

    await act(async () => {
      host!
        .querySelector('button[name="property-tab-tokens"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.querySelector('[data-component-token-path="color.bg"]')).toBeTruthy();

    const tokenRow = host.querySelector('[data-component-token-path="color.bg"]')!;
    const pickerToggle = tokenRow.querySelector('[aria-label^="Choose"]') as HTMLButtonElement;
    await act(async () => {
      pickerToggle.click();
    });
    const tokenId = tokenRow.getAttribute('data-component-token-id');
    const custom = document.querySelector(
      `input[name="component-token-${tokenId}-custom"]`,
    ) as HTMLInputElement;
    await act(async () => {
      setInput(custom, '#336699');
    });
    const useDirect = [...document.querySelectorAll('button')].find(
      (buttonEl) => buttonEl.textContent === 'Use direct value',
    ) as HTMLButtonElement;
    await act(async () => {
      useDirect.click();
    });

    expect(tokenValueByPath(session.getSnapshot().document, 'color.bg')).toBe('#336699');
  });

  it('selects a global reference by its saved label and preserves the reference', async () => {
    const design = structuredClone(createProjectTemplateDocument());
    const accentDefault = (
      design.tokens as unknown as {
        color: { accent: { default: { $value: string; $extensions?: object } } };
      }
    ).color.accent.default;
    accentDefault.$extensions = { facadeur: { label: 'Warm' } };
    const session = createEditorSession({ documents, design });
    session.openAsset('button', 'root');
    const id = listComponentTokens(
      session.project.styles.document('button').componentTokens ?? {},
    ).find((token) => token.path === 'color.bg')!.id;
    await act(async () => {
      session.execute({
        type: 'setComponentToken',
        id,
        path: 'color.bg',
        token: { type: 'color', value: '{color.neutral.0}' },
      });
    });

    expect(tokenValueByPath(session.getSnapshot().document, 'color.bg')).toBe('{color.neutral.0}');
    expect(session.getSnapshot().notice?.tone).not.toBe('error');
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));
    await act(async () => {
      host!
        .querySelector('button[name="property-tab-tokens"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const tokenRow = host.querySelector('[data-component-token-path="color.bg"]')!;
    await act(async () => {
      (tokenRow.querySelector('[aria-label^="Choose"]') as HTMLButtonElement).click();
    });
    const search = document.querySelector<HTMLInputElement>(
      '.token-value-picker input[type="search"]',
    )!;
    await act(async () => setInput(search, 'Warm'));
    const globalOption = [
      ...document.querySelectorAll<HTMLButtonElement>('.token-value-options button'),
    ].find((button) => button.textContent?.startsWith('◇ Warm'));
    expect(globalOption).toBeDefined();
    await act(async () => globalOption?.click());

    expect(tokenRow.querySelector('.token-value-reference')?.textContent?.trim()).toBe('◇ Warm');
    expect(tokenValueByPath(session.getSnapshot().document, 'color.bg')).toBe(
      '{color.accent.default}',
    );
  });
});
