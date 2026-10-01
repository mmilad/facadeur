/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import signIn from '../../../examples/sign-in.json';
import textarea from '../../../examples/textarea.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const documents = validateCatalog([
  button,
  card,
  input,
  link,
  specimenSection,
  specimenPage,
  signIn,
  textarea,
]);

describe('editor subnavigation', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('switches Editor, Schema, and Preview data without resetting selection or variant', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    session.openAsset('card', 'root');
    session.execute({
      type: 'setVariantPreset',
      preset: {
        name: 'compact',
        overrides: {
          insertions: [
            { parent: 'root', node: { id: 'variant-child', type: 'text', text: 'Compact' } },
          ],
        },
      },
    });
    session.setActiveVariant('compact');
    session.execute({
      type: 'defineVariant',
      axis: { name: 'tone', values: ['default', 'compact'], default: 'default' },
    });
    expect(session.getSnapshot().document.nodes['variant-child']).toBeUndefined();
    expect(session.getSnapshot().activeDocument.nodes['variant-child']).toBeDefined();
    const selectedBefore = session.getSnapshot().selectedNodeId;

    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });

    expect(host.querySelector('[data-surface="editor"]')?.getAttribute('aria-current')).toBe(
      'page',
    );
    await act(async () => {
      (host!.querySelector('[data-surface="schema"]') as HTMLButtonElement).click();
    });
    expect(host.querySelector('[data-testid="schema-stage"]')).toBeTruthy();
    expect(host.textContent).toContain('Component definition');
    expect(host.textContent).toContain('Props');
    expect(host.textContent).toContain('React preview');
    expect(host.textContent).toContain('Legacy variant axes');
    expect(session.getSnapshot().selectedNodeId).toBe(selectedBefore);
    expect(session.getSnapshot().activeVariantName).toBe('compact');

    await act(async () => {
      (host!.querySelector('[data-surface="preview"]') as HTMLButtonElement).click();
    });
    expect(host.querySelector('[data-testid="preview-data-stage"]')).toBeTruthy();

    await act(async () => {
      (host!.querySelector('[data-surface="editor"]') as HTMLButtonElement).click();
    });
    expect(host.querySelector('[data-testid="schema-stage"]')).toBeNull();
    expect(host.querySelector('[data-testid="preview-data-stage"]')).toBeNull();
    expect(host.querySelector('button[name="property-tab-content"]')).toBeTruthy();
    expect(session.getSnapshot().selectedNodeId).toBe(selectedBefore);
    expect(session.getSnapshot().activeVariantName).toBe('compact');
    await act(async () => {
      (host!.querySelector('[data-surface="schema"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (host!.querySelector('[data-asset-id="button"]') as HTMLButtonElement).click();
    });
    expect(host.querySelector('[data-testid="schema-stage"]')).toBeTruthy();
    expect(session.getSnapshot().openId).toBe('button');
  });
});
