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
        root: { id: 'root', type: 'text', text: 'Inner layer' },
      },
    ],
  });
  session.openAsset('parent');
  render(<App session={session} />);
  return session;
}
it('drills into a layer instance master and returns through the breadcrumb', async () => {
  const session = setup();
  const layers = within(screen.getByRole('region', { name: 'Layers' }));
  expect(layers.getByText('Parent', { selector: 'strong' })).toBeVisible();
  const user = userEvent.setup();
  await user.dblClick(layers.getByRole('button', { name: 'instance child' }));
  expect(session.getSnapshot().openId).toBe('child');
  expect(session.getSnapshot().drillParents.map((parent) => parent.documentId)).toEqual(['parent']);
  act(() => session.navigateDrillParent(0));
  expect(session.getSnapshot().openId).toBe('parent');
  expect(session.getSnapshot().selectedNodeId).toBe('child');
});

it('folds layer branches and reveals a descendant selected on the stage', async () => {
  const session = setup();
  const layers = within(screen.getByRole('region', { name: 'Layers' }));
  await userEvent.setup().click(layers.getByRole('button', { name: 'Collapse layers in root' }));
  expect(layers.queryByRole('button', { name: 'instance child' })).not.toBeInTheDocument();
  act(() => session.selectNode('child'));
  expect(layers.getByRole('button', { name: 'instance child' })).toBeVisible();
  expect(
    screen.getByText('Viewports', { selector: 'summary' }).closest('details'),
  ).not.toHaveAttribute('open');
  act(() => session.selectViewport('tablet'));
  expect(screen.getByText('Viewports', { selector: 'summary' }).closest('details')).toHaveAttribute(
    'open',
  );
});
