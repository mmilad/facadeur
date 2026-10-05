/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, useSyncExternalStore } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DocumentFile } from '@facadeur/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { LayoutPanel } from '../src/ui/sidebar/properties/layout/LayoutPanel';
import { editorStandardDesign, expandExampleCatalog } from './fixtures/example-catalog';

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
    documents: expandExampleCatalog([document]),
    design: editorStandardDesign(),
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

function directionButton(direction: 'row' | 'column'): HTMLElement {
  return screen.getByRole('button', { name: direction === 'row' ? 'Horizontal' : 'Vertical' });
}

describe('LayoutPanel variant and viewport context', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  afterEach(() => cleanup());

  it('writes None and Flex only as display declarations and retains existing layout fields', async () => {
    const session = setup();
    render(<LayoutHarness session={session} />);
    const before = structuredClone(session.getSnapshot().document.nodes.root);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'None' }));

    expect(session.getSnapshot().document.styles).toEqual({ declarations: { display: 'block' } });
    expect(session.getSnapshot().document.nodes.root).toEqual(before);
    expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');
    expect(directionButton('column')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Flex' }));

    expect(session.getSnapshot().document.styles).toEqual({ declarations: { display: 'flex' } });
    expect(session.getSnapshot().document.nodes.root).toEqual(before);
    expect(directionButton('column')).toBeEnabled();
  });

  it('writes mode to variant styles while retaining base styles and variant layout', async () => {
    const document = structuredClone(layoutDocument);
    document.styles = { declarations: { color: 'red' } };
    const session = setup(document);
    chooseVariant(session);
    render(<LayoutHarness session={session} />);
    const before = structuredClone(session.getSnapshot().document);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'None' }));

    expect(compactPreset(session)?.overrides?.styles).toEqual({
      declarations: { display: 'block' },
    });
    expect(compactPreset(session)?.overrides?.nodes).toEqual(
      before.variantPresets?.find((preset) => preset.name === 'compact')?.overrides?.nodes,
    );
    expect(session.getSnapshot().document.styles).toEqual(before.styles);
    expect(session.getSnapshot().document.nodes).toEqual(before.nodes);

    await user.click(screen.getByRole('button', { name: 'Flex' }));
    expect(compactPreset(session)?.overrides?.styles).toEqual({
      declarations: { display: 'flex' },
    });
    expect(session.getSnapshot().document.styles).toEqual(before.styles);
  });

  it.each([false, true])('writes a sparse tablet mode override (variant: %s)', async (variant) => {
    const session = setup();
    if (variant) chooseVariant(session);
    session.setFocusViewport('tablet');
    session.setEditTarget('viewport');
    render(<LayoutHarness session={session} />);
    const before = structuredClone(session.getSnapshot().document);

    await userEvent.setup().click(screen.getByRole('button', { name: 'None' }));

    const styles = variant
      ? compactPreset(session)?.overrides?.styles
      : session.getSnapshot().document.styles;
    expect(styles).toEqual({ breakpoints: { tablet: { declarations: { display: 'block' } } } });
    expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
    if (variant) {
      expect(session.getSnapshot().document.styles).toEqual(before.styles);
      expect(compactPreset(session)?.overrides?.nodes).toEqual(
        before.variantPresets?.find((preset) => preset.name === 'compact')?.overrides?.nodes,
      );
    }
  });

  it.each([false, true])(
    'resets only the mode declaration and undoes the reset atomically (variant: %s)',
    async (variant) => {
      const document = structuredClone(layoutDocument);
      const styles = {
        declarations: { display: 'block', color: 'red' },
        breakpoints: { tablet: { declarations: { display: 'flex', opacity: '0.5' } } },
      };
      if (variant) {
        const preset = document.variants![1]!;
        if (!('overrides' in preset)) throw new Error('Missing compact overrides');
        preset.overrides!.styles = styles;
      } else document.styles = styles;
      const session = setup(document);
      if (variant) chooseVariant(session);
      render(<LayoutHarness session={session} />);
      const before = structuredClone(session.getSnapshot().document);

      await userEvent.setup().click(screen.getByRole('button', { name: 'Reset layout mode' }));

      expect(
        variant ? compactPreset(session)?.overrides?.styles : session.getSnapshot().document.styles,
      ).toEqual({
        declarations: { color: 'red' },
        breakpoints: styles.breakpoints,
      });
      expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
      await act(async () => session.undo());
      expect(session.getSnapshot().document).toEqual(before);
      expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');
    },
  );

  it('undoes a variant tablet mode edit in one step', async () => {
    const session = setup();
    chooseVariant(session);
    session.setFocusViewport('tablet');
    session.setEditTarget('viewport');
    render(<LayoutHarness session={session} />);
    const before = structuredClone(session.getSnapshot().document);

    await userEvent.setup().click(screen.getByRole('button', { name: 'None' }));
    expect(compactPreset(session)?.overrides?.styles?.breakpoints?.tablet).toEqual({
      declarations: { display: 'block' },
    });
    await act(async () => session.undo());
    expect(session.getSnapshot().document).toEqual(before);
    expect(screen.getByRole('button', { name: 'Flex' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('overrides an existing node display in a variant and preserves sibling styles and layout through Undo and reset', async () => {
    const document = structuredClone(layoutDocument);
    if (document.root.type !== 'frame') throw new Error('Expected frame root');
    document.root.style = { display: 'block', color: 'red' };
    const preset = document.variants![1]!;
    if (!('overrides' in preset)) throw new Error('Missing compact overrides');
    preset.overrides!.nodes!.root = {
      ...preset.overrides!.nodes!.root!,
      style: { opacity: '0.5' },
    };
    const session = setup(document);
    chooseVariant(session);
    render(<LayoutHarness session={session} />);
    const before = structuredClone(session.getSnapshot().document);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Flex' }));
    expect(compactPreset(session)?.overrides?.nodes?.root?.style).toEqual({
      opacity: '0.5',
      display: 'flex',
    });
    expect(compactPreset(session)?.overrides?.nodes?.root?.layout).toEqual(
      before.variantPresets?.find((preset) => preset.name === 'compact')?.overrides?.nodes?.root
        ?.layout,
    );
    expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
    expect(session.getSnapshot().document.styles).toEqual(before.styles);
    expect(screen.getByRole('button', { name: 'Flex' })).toHaveAttribute('aria-pressed', 'true');

    await act(async () => session.undo());
    expect(session.getSnapshot().document).toEqual(before);
    expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Flex' }));
    await user.click(screen.getByRole('button', { name: 'Reset layout mode' }));
    expect(session.getSnapshot().document).toEqual(before);
    expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows named variant values while leaving the base document untouched', async () => {
    const session = setup();
    chooseVariant(session);
    render(<LayoutHarness session={session} />);

    expect(directionButton('row')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Gap Sm' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(directionButton('column'));
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

    expect(directionButton('column')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Gap Lg' })).toBeInTheDocument();
  });

  it('writes a sparse base breakpoint override with only the changed field', async () => {
    const session = setup();
    session.setFocusViewport('tablet');
    session.setEditTarget('viewport');
    render(<LayoutHarness session={session} />);

    await act(async () => {
      fireEvent.click(directionButton('row'));
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
    expect(directionButton('column')).toHaveAttribute('aria-pressed', 'true');
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
      fireEvent.click(directionButton('column'));
    });
    expect(compactPreset(session)?.overrides?.nodes?.root?.layout?.direction).toBe('column');

    await act(async () => {
      session.undo();
    });

    expect(compactPreset(session)).toEqual(before);
    expect(directionButton('row')).toHaveAttribute('aria-pressed', 'true');
  });
});
