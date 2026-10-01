/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, useSyncExternalStore } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { LayoutPanel } from '../src/ui/sidebar/properties/layout/LayoutPanel.js';

const layoutDocument: DocumentFile = {
  version: 1,
  id: 'layout-context',
  name: 'Layout context',
  kind: 'component',
  settings: {
    breakpoints: [
      { id: 'mobile', minWidth: 375 },
      { id: 'tablet', minWidth: 768 },
      { id: 'desktop', minWidth: 1440 },
    ],
  },
  tokenInterface: {
    reads: ['space.gap.xs', 'space.gap.sm', 'space.gap.md', 'space.gap.lg'],
  },
  variants: [
    { name: 'default' },
    {
      name: 'compact',
      overrides: {
        nodes: {
          root: {
            layout: {
              direction: 'row',
              gap: '{space.gap.sm}',
              breakpoints: {
                tablet: { direction: 'column', gap: '{space.gap.md}' },
                desktop: { gap: '{space.gap.lg}' },
              },
            },
          },
        },
      },
    },
  ],
  root: {
    id: 'root',
    type: 'frame',
    layout: {
      direction: 'column',
      gap: '{space.gap.xs}',
      position: 'absolute',
      x: 10,
      y: 20,
      wrap: true,
      breakpoints: {
        tablet: {},
        desktop: { gap: '{space.gap.lg}' },
      },
    },
    children: [],
  },
};

function LayoutHarness({ session }: { session: EditorSession }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const node = snap.activeDocument.nodes.root ?? snap.document.nodes.root;
  if (!node) return null;
  return <LayoutPanel session={session} snap={snap} node={node} />;
}

function setup(document: DocumentFile = layoutDocument) {
  const session = createEditorSession({
    documents: validateCatalog([document]),
    design: createProjectTemplateDocument(),
  });
  session.openAsset('layout-context', 'root');
  session.selectNode('root');
  return session;
}

function compactPreset(session: EditorSession) {
  return session.getSnapshot().document.variantPresets?.find((preset) => preset.name === 'compact');
}

function chooseVariant(session: EditorSession) {
  session.setActiveVariant('compact');
}

function directionSelect(): HTMLSelectElement {
  const select = document.querySelector('select[name="layout-direction"]');
  if (!(select instanceof HTMLSelectElement)) throw new Error('missing layout direction select');
  return select;
}

describe('LayoutPanel variant and viewport context', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  afterEach(() => cleanup());

  it('shows named variant values while leaving the base document untouched', async () => {
    const session = setup();
    chooseVariant(session);
    render(<LayoutHarness session={session} />);

    expect(directionSelect()).toHaveValue('row');
    expect(screen.getByRole('button', { name: 'space.gap.sm' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(directionSelect(), {
        target: { value: 'column' },
      });
    });

    expect(session.getSnapshot().document.nodes.root?.layout?.direction).toBe('column');
    expect(compactPreset(session)?.overrides?.nodes?.root?.layout?.direction).toBe('column');
  });

  it('adds the absolute position prerequisite when a variant changes only x', async () => {
    const session = setup();
    chooseVariant(session);
    render(<LayoutHarness session={session} />);
    const x = document.querySelector('input[name="layout-x"]');
    if (!(x instanceof HTMLInputElement)) throw new Error('missing x input');

    await act(async () => {
      fireEvent.change(x, { target: { value: '44' } });
      fireEvent.blur(x);
    });

    expect(compactPreset(session)?.overrides?.nodes?.root?.layout).toMatchObject({
      position: 'absolute',
      x: 44,
    });
  });

  it('writes explicit false when a base variant disables inherited wrap', async () => {
    const session = setup();
    chooseVariant(session);
    render(<LayoutHarness session={session} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('switch', { name: 'Wrap' }));

    expect(session.getSnapshot().document.nodes.root?.layout?.wrap).toBe(true);
    expect(compactPreset(session)?.overrides?.nodes?.root?.layout?.wrap).toBe(false);
  });

  it('writes auto when a base variant disables inherited absolute positioning', async () => {
    const document = structuredClone(layoutDocument);
    delete document.root.layout?.x;
    delete document.root.layout?.y;
    const session = setup(document);
    chooseVariant(session);
    render(<LayoutHarness session={session} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('switch', { name: 'Free position' }));

    expect(session.getSnapshot().document.nodes.root?.layout?.position).toBe('absolute');
    expect(compactPreset(session)?.overrides?.nodes?.root?.layout).toMatchObject({
      position: 'auto',
    });
    expect(compactPreset(session)?.overrides?.nodes?.root?.layout?.x).toBeUndefined();
    expect(compactPreset(session)?.overrides?.nodes?.root?.layout?.y).toBeUndefined();
  });

  it('shows inherited earlier breakpoint fields at a wider viewport', () => {
    const session = setup();
    chooseVariant(session);
    session.setFocusViewport('desktop');
    session.setEditTarget('viewport');
    render(<LayoutHarness session={session} />);

    expect(directionSelect()).toHaveValue('column');
    expect(screen.getByRole('button', { name: 'space.gap.lg' })).toBeInTheDocument();
  });

  it('writes a sparse base breakpoint override with only the changed field', async () => {
    const session = setup();
    session.setFocusViewport('tablet');
    session.setEditTarget('viewport');
    render(<LayoutHarness session={session} />);

    await act(async () => {
      fireEvent.change(directionSelect(), {
        target: { value: 'row' },
      });
    });

    expect(session.getSnapshot().document.nodes.root?.layout?.breakpoints?.tablet).toEqual({
      direction: 'row',
    });
  });

  it('resets a base variant field so it inherits from the default document', async () => {
    const session = setup();
    chooseVariant(session);
    render(<LayoutHarness session={session} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reset layout direction' }));

    expect(compactPreset(session)?.overrides?.nodes?.root?.layout).toEqual({
      gap: '{space.gap.sm}',
      breakpoints: {
        tablet: { direction: 'column', gap: '{space.gap.md}' },
        desktop: { gap: '{space.gap.lg}' },
      },
    });
    expect(directionSelect()).toHaveValue('column');
  });

  it('resets one breakpoint field while retaining other breakpoint overrides', async () => {
    const session = setup();
    chooseVariant(session);
    session.setFocusViewport('tablet');
    session.setEditTarget('viewport');
    render(<LayoutHarness session={session} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reset layout direction' }));

    expect(compactPreset(session)?.overrides?.nodes?.root?.layout?.breakpoints).toEqual({
      tablet: { gap: '{space.gap.md}' },
      desktop: { gap: '{space.gap.lg}' },
    });
  });

  it('undoes a variant layout edit atomically', async () => {
    const session = setup();
    chooseVariant(session);
    render(<LayoutHarness session={session} />);
    const before = structuredClone(compactPreset(session));

    await act(async () => {
      fireEvent.change(directionSelect(), {
        target: { value: 'column' },
      });
    });
    expect(compactPreset(session)?.overrides?.nodes?.root?.layout?.direction).toBe('column');

    await act(async () => {
      session.undo();
    });

    expect(compactPreset(session)).toEqual(before);
    expect(directionSelect()).toHaveValue('row');
  });
});
