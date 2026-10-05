/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, afterEach } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { editorStandardCatalog, editorStandardDesign } from './fixtures/example-catalog';

const documents = editorStandardCatalog();

describe('viewport layers UX', () => {
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

  it('keeps viewports out of Layers while updating stage titles', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });

    expect(host.querySelector('.layers-viewports')).toBeNull();
    expect(host.querySelector('button.viewport-layer')).toBeNull();

    await act(async () => {
      session.setViewportChrome('sm', { title: 'Tablet preview' });
    });
    expect(
      host.querySelector('.viewport-frame[data-breakpoint="sm"] .viewport-chrome-title')
        ?.textContent,
    ).toBe('Tablet preview');
  });

  it('selects a viewport on stage and shows chrome options in the inspector', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });

    await act(async () => {
      session.selectViewport('sm');
    });

    const snap = session.getSnapshot();
    expect(snap.selectedViewportId).toBe('sm');
    expect(snap.selectedNodeId).toBeNull();
    expect(host.querySelector('input[name="viewport-inner-padding"]')).toBeNull();
    expect(host.querySelector('input[name="viewport-outer-padding"]')).toBeNull();
    expect(host.querySelector('[aria-label="Content alignment"]')).not.toBeNull();
    expect(host.querySelector('.viewport-edit')).toBeNull();

    await act(async () => {
      session.setViewportChrome('sm', { innerPaddingPx: 24, title: 'Tablet preview' });
    });
    const title = document.querySelector(
      '.viewport-frame[data-breakpoint="sm"] .viewport-chrome-title',
    );
    expect(title?.textContent).toBe('Tablet preview');
  });

  it('keeps node properties and ViewportEditBar when a layer is selected', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      session.openAsset('button', 'root');
    });
    expect(host.querySelector('.viewport-edit')).toBeTruthy();
    expect(host.querySelector('select[name="tag"]')).toBeInstanceOf(HTMLSelectElement);
    expect(session.getSnapshot().selectedViewportId).toBeNull();
  });
});
