/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { editorStandardCatalog, editorStandardDesign } from './fixtures/example-catalog';

const documents = editorStandardCatalog();

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

  it('selects each asset root when clicking project rows, including an already open asset', async () => {
    const session = createEditorSession({
      design: editorStandardDesign(),
      documents: (['atom', 'component', 'section', 'page'] as const).map((kind) => ({
        version: 1,
        id: kind,
        name: kind,
        kind,
        root: { id: `${kind}-root`, type: 'frame' as const },
      })),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));
    for (const kind of ['component', 'section', 'page', 'atom', 'atom']) {
      act(() => session.selectNode(null));
      await act(async () =>
        (host!.querySelector(`[data-asset-id="${kind}"]`) as HTMLButtonElement).click(),
      );
      expect(session.getSnapshot().openId).toBe(kind);
      expect(session.getSnapshot().selectedNodeId).toBe(`${kind}-root`);
      expect(session.getSnapshot().nestedSelection).toBeNull();
    }
    await act(async () =>
      (host!.querySelector('[data-subnav="settings"]') as HTMLButtonElement).click(),
    );
    await act(async () =>
      (host!.querySelector('[data-asset-id="section"]') as HTMLButtonElement).click(),
    );
    expect(session.getSnapshot().selectedNodeId).toBe('section-root');
    session.destroy();
  });

  it('places schema library in Settings and Icons in the subnav', async () => {
    const session = createEditorSession({ documents, design: editorStandardDesign() });
    session.openAsset('card', 'root');
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));
    expect(host.querySelector('.editor-subnav [data-surface="schemas"]')).toBeNull();
    expect(host.querySelector('.editor-subnav [data-surface="icons"]')).not.toBeNull();
    expect(host.querySelector('.side-left [data-design-domain="icons"]')).toBeNull();
    await act(async () =>
      (host!.querySelector('[data-subnav="settings"]') as HTMLButtonElement).click(),
    );
    await act(async () =>
      (host!.querySelector('[data-settings-tab="schemas"]') as HTMLButtonElement).click(),
    );
    expect(host.querySelector('[data-subnav="settings"]')?.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(host.querySelector('[data-settings-tab="schemas"]')?.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(host.textContent).toContain('Settings · Schemas');
    await act(async () =>
      (host!.querySelector('[data-settings-tab="colors"]') as HTMLButtonElement).click(),
    );
    expect(host.querySelector('[data-design-domain="colors"]')).not.toBeNull();
    expect(session.getSnapshot().selectedNodeId).toBe('root');
    session.destroy();
  });

  it('switches Editor, Schema, and Preview data without resetting selection or variant', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: editorStandardDesign(),
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
    expect(host.textContent).toContain('Defaults');
    expect(host.querySelector('[data-testid="code-stage"]')).toBeNull();
    expect(host.textContent).not.toContain('Legacy variant axes');
    await act(async () => {
      (host!.querySelector('[data-surface="code"]') as HTMLButtonElement).click();
    });
    expect(host.querySelector('[data-testid="code-stage"]')).toBeTruthy();
    expect(host.textContent).toContain('React preview');
    await act(async () => {
      (host!.querySelector('[data-surface="schema"]') as HTMLButtonElement).click();
    });
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
