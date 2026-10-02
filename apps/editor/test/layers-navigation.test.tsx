// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

afterEach(cleanup);
function setup() {
  const session = createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      {
        version: 1,
        id: 'parent',
        name: 'Parent',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'child', type: 'instance', component: 'child' }],
        },
      },
      {
        version: 1,
        id: 'child',
        name: 'Child',
        kind: 'atom',
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'inner', type: 'text', text: 'Inner layer' }],
        },
      },
    ],
  });
  session.openAsset('parent');
  render(<App session={session} />);
  return session;
}
it('selects nested layers locally and drills to a master explicitly', async () => {
  const session = setup();
  const layers = within(screen.getByRole('region', { name: 'Layers' }));
  expect(layers.getByText('Parent', { selector: 'strong' })).toBeVisible();
  const user = userEvent.setup();
  await user.dblClick(layers.getByRole('button', { name: 'instance child' }));
  expect(session.getSnapshot().openId).toBe('parent');
  expect(session.getSnapshot().selectedNodeId).toBe('child');
  expect(session.getSnapshot().nestedSelection).toBeNull();
  await user.click(layers.getByRole('button', { name: 'Expand layers in child' }));
  await user.dblClick(layers.getByRole('button', { name: 'text Inner layer' }));
  expect(session.getSnapshot().openId).toBe('parent');
  expect(session.getSnapshot().selectedNodeId).toBe('child');
  expect(session.getSnapshot().nestedSelection).toMatchObject({
    ownerNodeId: 'child',
    renderId: 'root/child/inner',
  });
  act(() => session.drillToMaster('child'));
  expect(session.getSnapshot().openId).toBe('child');
  expect(session.getSnapshot().drillParents.map((parent) => parent.documentId)).toEqual(['parent']);
  act(() => session.navigateDrillParent(0));
  expect(session.getSnapshot().openId).toBe('parent');
  expect(session.getSnapshot().selectedNodeId).toBe('child');
});

it('deletes a layer from the context menu', async () => {
  const session = createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      {
        version: 1,
        id: 'demo',
        name: 'Demo',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [
            { id: 'keep', type: 'text', text: 'Keep' },
            { id: 'drop', type: 'text', text: 'Drop' },
          ],
        },
      },
    ],
  });
  session.openAsset('demo');
  render(<App session={session} />);
  const layers = within(screen.getByRole('region', { name: 'Layers' }));
  const user = userEvent.setup();
  await user.pointer({ keys: '[MouseRight>]', target: layers.getByRole('button', { name: 'text Drop' }) });
  await user.click(screen.getByRole('menuitem', { name: 'Delete layer' }));
  expect(session.getSnapshot().document.nodes.drop).toBeUndefined();
  expect(session.getSnapshot().document.nodes.keep).toBeTruthy();
});

it('inserts an atom instance from the insert submenu', async () => {
  const session = createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      {
        version: 1,
        id: 'button',
        name: 'Button',
        kind: 'atom',
        root: { id: 'root', type: 'frame', tag: 'button' },
      },
      {
        version: 1,
        id: 'demo',
        name: 'Demo',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'label', type: 'text', text: 'Label' }],
        },
      },
    ],
  });
  session.openAsset('demo');
  render(<App session={session} />);
  const layers = within(screen.getByRole('region', { name: 'Layers' }));
  const user = userEvent.setup();
  await user.pointer({
    keys: '[MouseRight>]',
    target: layers.getByRole('button', { name: 'frame root' }),
  });
  await user.click(screen.getByRole('menuitem', { name: 'Insert atom inside' }));
  await user.click(screen.getByRole('menuitem', { name: 'Button' }));
  const nodes = session.getSnapshot().document.nodes.root;
  expect(nodes?.type).toBe('frame');
  if (nodes?.type === 'frame') {
    expect(nodes.children).toHaveLength(2);
    expect(
      nodes.children.some(
        (id) => session.getSnapshot().document.nodes[id]?.type === 'instance',
      ),
    ).toBe(true);
  }
});

it('folds layer branches and reveals a descendant selected on the stage', async () => {
  const session = setup();
  const layers = within(screen.getByRole('region', { name: 'Layers' }));
  await userEvent.setup().click(layers.getByRole('button', { name: 'Collapse layers in root' }));
  expect(layers.queryByRole('button', { name: 'instance child' })).not.toBeInTheDocument();
  act(() => session.selectNode('child'));
  expect(layers.getByRole('button', { name: 'instance child' })).toBeVisible();
  expect(layers.queryByText('Viewports')).not.toBeInTheDocument();
  act(() => session.selectViewport('tablet'));
  expect(layers.queryByText('Viewports')).not.toBeInTheDocument();
});
