/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { act, useSyncExternalStore } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DocumentFile } from '@facadeur/core';
import { afterEach, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { LayoutPanel } from '../src/ui/sidebar/properties/layout/LayoutPanel';
import { gridDeclarations } from '../src/ui/sidebar/properties/layout/grid/edits';
import { editorStandardDesign, expandExampleCatalog } from './fixtures/example-catalog';
import { exampleIds as fixtureIds } from '@facadeur/examples';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(cleanup);
function fixture(): DocumentFile {
  return {
    version: 1,
    id: 'grid-test',
    name: 'Grid',
    kind: 'component',
    settings: {
      breakpoints: [
        { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 375 },
        { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
      ],
    },
    variants: [{ name: 'compact' }],
    root: { id: 'root', type: 'frame', children: [{ id: 'action', type: 'text', text: 'Action' }] },
  };
}
function Harness({ session, nodeId }: { session: EditorSession; nodeId: string }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return <LayoutPanel session={session} snap={snap} node={snap.activeDocument.nodes[nodeId]!} />;
}
function setup(variant = false, viewport = false, nodeId = 'root') {
  const session = createEditorSession({
    documents: expandExampleCatalog([fixture()]),
    design: editorStandardDesign(),
  });
  session.openAsset('grid-test', 'root');
  if (variant) session.setActiveVariant('compact');
  if (viewport) {
    session.setFocusViewport(fixtureIds.catalog.breakpoints.tablet);
    session.setEditTarget('viewport');
  }
  render(<Harness session={session} nodeId={nodeId} />);
  return session;
}
it.each([false, true])(
  'renames an area and direct child atomically at a viewport (variant: %s)',
  async (variant) => {
    const file = fixture();
    if (file.root.type !== 'frame') throw new Error('Expected frame');
    file.root.style = { display: 'grid', 'grid-template-areas': '"action"' };
    const child = file.root.children?.[0];
    if (child?.type !== 'text') throw new Error('Expected text child');
    child.style = { 'grid-area': 'action', 'grid-column-start': 'action', opacity: '0.5' };
    const session = createEditorSession({
      documents: expandExampleCatalog([file]),
      design: editorStandardDesign(),
    });
    session.openAsset('grid-test', 'root');
    if (variant) session.setActiveVariant('compact');
    session.setFocusViewport(fixtureIds.catalog.breakpoints.tablet);
    session.setEditTarget('viewport');
    render(<Harness session={session} nodeId="root" />);
    const before = structuredClone(session.getSnapshot().document);
    const user = userEvent.setup();
    await user.clear(screen.getByRole('textbox', { name: 'Rename area action' }));
    await user.type(screen.getByRole('textbox', { name: 'Rename area action' }), 'content');
    await user.click(screen.getByRole('button', { name: 'Rename action' }));
    const snap = session.getSnapshot();
    const breakpoints = file.settings!.breakpoints!;
    expect(gridDeclarations(snap, 'root', fixtureIds.catalog.breakpoints.tablet, breakpoints)['grid-template-areas']).toBe(
      '"content"',
    );
    expect(gridDeclarations(snap, 'action', fixtureIds.catalog.breakpoints.tablet, breakpoints)).toMatchObject({
      'grid-area': 'content',
      'grid-column-start': 'content',
      opacity: '0.5',
    });
    expect(snap.document.nodes).toEqual(before.nodes);
    await act(async () => session.undo());
    expect(session.getSnapshot().document).toEqual(before);
  },
);
it.each([false, true])(
  'enables Grid through a sparse mode edit and one Undo (variant: %s)',
  async (variant) => {
    const session = setup(variant, true);
    const before = structuredClone(session.getSnapshot().document);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Grid' }));
    const document = session.getSnapshot().document;
    const block = variant ? document.variantPresets?.[0]?.overrides?.styles : document.styles;
    expect(block).toEqual({ breakpoints: { [fixtureIds.catalog.breakpoints.tablet]: { declarations: { display: 'grid' } } } });
    expect(document.nodes).toEqual(before.nodes);
    expect(screen.queryByRole('group', { name: 'Direction' })).not.toBeInTheDocument();
    await act(async () => session.undo());
    expect(session.getSnapshot().document).toEqual(before);
  },
);

it('assigns an area to a child component instance without editing its master', async () => {
  const file = fixture();
  file.root = {
    id: 'root',
    type: 'frame',
    style: { display: 'grid', 'grid-template-areas': '"action"' },
    children: [{ id: 'action', type: 'instance', component: 'button-master' }],
  };
  const master: DocumentFile = {
    version: 1,
    id: 'button-master',
    name: 'Button',
    kind: 'component',
    root: { id: 'root', type: 'text', text: 'Action' },
  };
  const session = createEditorSession({
    documents: expandExampleCatalog([file, master]),
    design: editorStandardDesign(),
  });
  session.openAsset('grid-test', 'root');
  render(<Harness session={session} nodeId="action" />);
  const before = structuredClone(session.getSnapshot().document);
  await userEvent
    .setup()
    .selectOptions(screen.getByRole('combobox', { name: 'Grid area' }), 'action');
  expect(
    gridDeclarations(session.getSnapshot(), 'action', null, file.settings!.breakpoints!),
  ).toMatchObject({
    'grid-area': 'action',
    'grid-column-start': 'action',
    'grid-row-end': 'action',
  });
  expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
  await act(async () => session.undo());
  expect(session.getSnapshot().document).toEqual(before);
});

it.each([false, true])(
  'renames inherited instance areas and longhand-only assignments (longhand: %s)',
  async (longhand) => {
    const file = fixture();
    file.root = {
      id: 'root',
      type: 'frame',
      style: { display: 'grid', 'grid-template-areas': '"action"' },
      children: [{ id: 'action', type: 'instance', component: 'button-master' }],
    };
    const master: DocumentFile = {
      version: 1,
      id: 'button-master',
      name: 'Button',
      kind: 'component',
      root: {
        id: 'root',
        type: 'text',
        text: 'Action',
        style: longhand
          ? { 'grid-column-start': 'action', 'grid-row-end': 'action' }
          : { 'grid-area': 'action' },
      },
    };
    const session = createEditorSession({
      documents: expandExampleCatalog([file, master]),
      design: editorStandardDesign(),
    });
    session.openAsset('grid-test', 'root');
    render(<Harness session={session} nodeId="root" />);
    const before = structuredClone(session.getSnapshot().document);
    const user = userEvent.setup();
    await user.clear(screen.getByRole('textbox', { name: 'Rename area action' }));
    await user.type(screen.getByRole('textbox', { name: 'Rename area action' }), 'content');
    await user.click(screen.getByRole('button', { name: 'Rename action' }));
    expect(
      gridDeclarations(session.getSnapshot(), 'action', null, file.settings!.breakpoints!),
    ).toMatchObject(
      longhand
        ? { 'grid-column-start': 'content', 'grid-row-end': 'content' }
        : { 'grid-area': 'content' },
    );
    expect(
      session
        .boardStores()
        .find((store) => store.getDocument().id === 'button-master')!
        .getNode('root'),
    ).toMatchObject({ style: master.root.type === 'text' ? master.root.style : {} });
    await act(async () => session.undo());
    expect(session.getSnapshot().document).toEqual(before);
  },
);
