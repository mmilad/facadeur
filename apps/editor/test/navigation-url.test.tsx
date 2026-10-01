// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const routing = vi.hoisted(() => ({
  search: '',
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(routing.search),
  useRouter: () => ({ push: routing.push, replace: routing.replace }),
}));
beforeEach(() => {
  routing.search = '';
  routing.push.mockReset();
  routing.replace.mockReset();
});
afterEach(cleanup);
function session() {
  return createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      {
        version: 1,
        id: 'first',
        name: 'First',
        kind: 'atom',
        root: { id: 'root', type: 'text', text: 'First' },
      },
      {
        version: 1,
        id: 'second',
        name: 'Second',
        kind: 'component',
        variants: [
          {
            name: 'compact',
            overrides: {
              insertions: [
                { parent: 'root', node: { id: 'extra', type: 'text', text: 'Only in variant' } },
              ],
            },
          },
        ],
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'label', type: 'text', text: 'Second' }],
        },
      },
    ],
  });
}
describe('editor URL selection', () => {
  it('restores nested layer addresses without opening the master', async () => {
    routing.search = 'document=section&layer=root%2Fhost%2Flabel';
    const editor = createEditorSession({
      design: createProjectTemplateDocument(),
      documents: [
        {
          version: 1,
          id: 'button',
          name: 'Button',
          kind: 'atom',
          fields: [{ name: 'label', type: 'text', default: 'Button' }],
          root: {
            id: 'root',
            type: 'frame',
            children: [
              { id: 'label', type: 'text', bindings: [{ field: 'label', target: 'text' }] },
            ],
          },
        },
        {
          version: 1,
          id: 'section',
          name: 'Section',
          kind: 'section',
          root: {
            id: 'root',
            type: 'frame',
            children: [{ id: 'host', type: 'instance', component: 'button' }],
          },
        },
      ],
    });
    const view = render(<App session={editor} />);
    expect(editor.getSnapshot().openId).toBe('section');
    expect(editor.getSnapshot().nestedSelection?.renderId).toBe('root/host/label');
    expect(screen.getByTestId('nested-fields-panel')).toBeVisible();
    act(() => editor.selectNode('host'));
    await waitFor(() => expect(routing.replace).toHaveBeenCalled());
    expect(
      new URL(routing.replace.mock.lastCall?.[0] as string, 'http://localhost').searchParams.get(
        'layer',
      ),
    ).toBe('host');
    routing.search = 'document=section&layer=root%2Fhost%2Fmissing';
    view.rerender(<App session={editor} />);
    expect(editor.getSnapshot().nestedSelection).toBeNull();
    expect(editor.getSnapshot().selectedNodeId).toBeNull();
  });

  it('returns to the initial document when navigating back to the bare URL', async () => {
    const editor = session();
    const view = render(<App session={editor} />);
    act(() => editor.openAsset('second'));
    await waitFor(() => expect(routing.push).toHaveBeenCalled());
    routing.search = (routing.push.mock.lastCall?.[0] as string).split('?')[1] ?? '';
    view.rerender(<App session={editor} />);
    routing.search = '';
    view.rerender(<App session={editor} />);
    expect(editor.getSnapshot().openId).toBe('first');
  });

  it('removes invalid references using replace rather than adding history', () => {
    routing.search = 'document=missing&variant=missing&layer=missing&surface=unknown';
    const editor = session();
    render(<App session={editor} />);
    expect(editor.getSnapshot().openId).toBe('first');
    expect(editor.getSnapshot().notice).toBeNull();
    expect(routing.push).not.toHaveBeenCalled();
    expect(routing.replace).toHaveBeenCalledWith('/?document=first', { scroll: false });
  });

  it('keeps variant-only layers selected while editing and clears them on returning to Default', () => {
    const editor = session();
    editor.openAsset('second');
    editor.setActiveVariant('compact');
    editor.selectNode('extra');
    expect(editor.getSnapshot().selectedRenderId).toBe('root/extra');
    editor.execute({ type: 'setProp', nodeId: 'extra', prop: 'text', value: 'Edited' });
    expect(editor.getSnapshot().selectedNodeId).toBe('extra');
    expect(editor.getSnapshot().activeDocument.nodes.extra).toMatchObject({ text: 'Edited' });
    editor.setActiveVariant(null);
    expect(editor.getSnapshot().selectedNodeId).toBeNull();
  });

  it('keeps a newer layer selection when an earlier document navigation finishes', async () => {
    const editor = session();
    const view = render(<App session={editor} />);
    act(() => editor.openAsset('second'));
    await waitFor(() => expect(routing.push).toHaveBeenCalled());
    const documentUrl = routing.push.mock.lastCall?.[0] as string;
    act(() => editor.selectNode('label'));
    routing.search = documentUrl.split('?')[1] ?? '';
    view.rerender(<App session={editor} />);
    expect(editor.getSnapshot().selectedNodeId).toBe('label');
    await waitFor(() => expect(routing.replace).toHaveBeenCalled());
    expect(
      new URL(routing.replace.mock.lastCall?.[0] as string, 'http://localhost').searchParams.get(
        'layer',
      ),
    ).toBe('label');
  });

  it('restores a deep link including a layer inserted by a variant', () => {
    routing.search = 'surface=schema&document=second&variant=compact&layer=extra';
    const editor = session();
    render(<App session={editor} />);
    expect(editor.getSnapshot().openId).toBe('second');
    expect(editor.getSnapshot().activeVariantName).toBe('compact');
    expect(editor.getSnapshot().selectedNodeId).toBe('extra');
    expect(screen.getByTestId('schema-stage')).toBeVisible();
  });

  it('restores viewport selection and switches the URL back to a layer selection', async () => {
    routing.search = 'document=second&viewport=tablet';
    const editor = session();
    const view = render(<App session={editor} />);
    expect(editor.getSnapshot().selectedViewportId).toBe('tablet');
    expect(editor.getSnapshot().selectedNodeId).toBeNull();
    act(() => editor.selectNode('label'));
    await waitFor(() => expect(routing.replace).toHaveBeenCalled());
    const url = new URL(routing.replace.mock.lastCall?.[0] as string, 'http://localhost');
    expect(url.searchParams.get('layer')).toBe('label');
    expect(url.searchParams.has('viewport')).toBe(false);
    routing.search = url.search.slice(1);
    view.rerender(<App session={editor} />);
    expect(editor.getSnapshot().selectedNodeId).toBe('label');
  });

  it('updates the URL on document, layer, and surface selection', async () => {
    const editor = session();
    const view = render(<App session={editor} />);
    routing.push.mockClear();
    routing.replace.mockClear();
    act(() => editor.openAsset('second'));
    await waitFor(() => expect(routing.push).toHaveBeenCalled());
    const documentUrl = routing.push.mock.lastCall?.[0] as string;
    expect(new URL(documentUrl, 'http://localhost').searchParams.get('document')).toBe('second');
    routing.search = documentUrl.split('?')[1] ?? '';
    view.rerender(<App session={editor} />);
    routing.replace.mockClear();
    act(() => editor.selectNode('label'));
    await waitFor(() => expect(routing.replace).toHaveBeenCalled());
    const layerUrl = routing.replace.mock.lastCall?.[0] as string;
    expect(new URL(layerUrl, 'http://localhost').searchParams.get('layer')).toBe('label');
    routing.search = layerUrl.split('?')[1] ?? '';
    view.rerender(<App session={editor} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Preview data' }));
    expect(
      new URL(routing.push.mock.lastCall?.[0] as string, 'http://localhost').searchParams.get(
        'surface',
      ),
    ).toBe('preview');
  });

  it('applies back/forward URL changes while preserving unsaved edits', () => {
    routing.search = 'document=second&layer=label';
    const editor = session();
    const view = render(<App session={editor} />);
    act(() =>
      editor.execute({ type: 'setProp', nodeId: 'label', prop: 'text', value: 'Unsaved edit' }),
    );
    routing.search = 'document=first&layer=root';
    view.rerender(<App session={editor} />);
    expect(editor.getSnapshot().openId).toBe('first');
    routing.search = 'document=second&layer=label&surface=preview';
    view.rerender(<App session={editor} />);
    expect(editor.getSnapshot().document.nodes.label).toMatchObject({ text: 'Unsaved edit' });
    expect(editor.getSnapshot().selectedNodeId).toBe('label');
    expect(screen.getByTestId('preview-data-stage')).toBeVisible();
  });
});
