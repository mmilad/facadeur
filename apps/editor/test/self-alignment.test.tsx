/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, useSyncExternalStore } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { LayoutPanel } from '../src/ui/sidebar/properties/layout/LayoutPanel.js';

afterEach(cleanup);
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
function fixture(): DocumentFile & { root: Extract<DocumentFile['root'], { type: 'frame' }> } {
  return {
    version: 1,
    id: 'self-align',
    name: 'Self align',
    kind: 'component',
    settings: {
      breakpoints: [
        { id: 'phone', minWidth: 375 },
        { id: 'tablet', minWidth: 768 },
      ],
    },
    variants: [{ name: 'compact' }],
    root: {
      id: 'root',
      type: 'frame',
      layout: {
        direction: 'column',
        align: 'start',
        breakpoints: { tablet: { direction: 'row' } },
      },
      children: [
        { id: 'title', type: 'text', text: 'Title' },
        { id: 'action', type: 'text', text: 'Continue', layout: { width: { mode: 'hug' } } },
      ],
    },
  };
}
function Harness({ session }: { session: EditorSession }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return <LayoutPanel session={session} snap={snap} node={snap.activeDocument.nodes.action!} />;
}
function setup(document = fixture(), variant = false, viewport = false) {
  const session = createEditorSession({
    documents: validateCatalog([document]),
    design: createProjectTemplateDocument(),
  });
  session.openAsset('self-align', 'root');
  session.selectNode('action');
  if (variant) session.setActiveVariant('compact');
  if (viewport) {
    session.setFocusViewport('tablet');
    session.setEditTarget('viewport');
  }
  render(<Harness session={session} />);
  return session;
}

it('aligns only the selected item, inherits the parent on auto, and undoes atomically', async () => {
  const session = setup();
  const before = structuredClone(session.getSnapshot().document);
  const user = userEvent.setup();
  expect(screen.getByRole('button', { name: 'Self alignment: End' })).toHaveAttribute(
    'title',
    'Right · flex-end',
  );
  await user.click(screen.getByRole('button', { name: 'Self alignment: End' }));
  expect(session.getSnapshot().document.styles).toEqual({
    children: { action: { declarations: { 'align-self': 'flex-end' } } },
  });
  expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
  await act(async () => session.undo());
  expect(session.getSnapshot().document).toEqual(before);
  await user.click(screen.getByRole('button', { name: 'Self alignment: End' }));
  await user.click(screen.getByRole('button', { name: 'Self alignment: Inherit' }));
  expect(
    session.getSnapshot().document.styles?.children?.action?.declarations?.['align-self'],
  ).toBe('auto');
  await user.click(screen.getByRole('button', { name: 'Reset self alignment' }));
  expect(session.getSnapshot().document.styles).toBeUndefined();
});

it.each([false, true])(
  'writes only the active viewport style layer (variant: %s)',
  async (variant) => {
    const session = setup(fixture(), variant, true);
    const before = structuredClone(session.getSnapshot().document.nodes);
    expect(screen.getByRole('button', { name: 'Self alignment: End' })).toHaveAttribute(
      'title',
      'Bottom · flex-end',
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Self alignment: End' }));
    const document = session.getSnapshot().document;
    const style = variant
      ? document.variantPresets?.find((p) => p.name === 'compact')?.overrides?.styles
      : document.styles;
    expect(style).toEqual({
      children: {
        action: { breakpoints: { tablet: { declarations: { 'align-self': 'flex-end' } } } },
      },
    });
    expect(document.nodes).toEqual(before);
    if (variant) expect(document.styles).toBeUndefined();
  },
);

it('preserves inline style priority in named variants and resets to the base value', async () => {
  const document = fixture();
  const child = document.root.children![1]!;
  if (child.type === 'instance') throw new Error('Expected a native action node');
  child.style = { alignSelf: 'flex-start', color: 'red' };
  const session = setup(document, true);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Self alignment: End' }));
  expect(
    session.getSnapshot().document.variantPresets?.[0]?.overrides?.nodes?.action?.style,
  ).toEqual({ alignSelf: 'flex-end' });
  const action = session.getSnapshot().document.nodes.action;
  expect(action?.type !== 'instance' && action?.style).toEqual({
    alignSelf: 'flex-start',
    color: 'red',
  });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Reset self alignment' }));
  expect(screen.getByRole('button', { name: 'Self alignment: Start' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('keeps inactive retained values resettable and blocks absolute-item edits', async () => {
  const document = fixture();
  document.root.children![1]!.layout = { position: 'absolute' };
  document.styles = { children: { action: { declarations: { 'align-self': 'flex-end' } } } };
  const session = setup(document);
  expect(screen.getByRole('button', { name: 'Self alignment: End' })).toBeDisabled();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Reset self alignment' }));
  expect(session.getSnapshot().document.styles).toBeUndefined();
  expect(screen.queryByRole('group', { name: 'Self alignment' })).not.toBeInTheDocument();
});

it('shows a Fill-width warning without changing size or alignment during render', () => {
  const document = fixture();
  document.root.children![1]!.layout = { width: { mode: 'fill' } };
  const session = setup(document);
  expect(screen.getByText(/Width is Fill/)).toBeInTheDocument();
  expect(session.getSnapshot().document.styles).toBeUndefined();
});
