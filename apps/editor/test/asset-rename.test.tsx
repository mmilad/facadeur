// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createEditorSession } from '../src/domain/session';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { RenameAssetDialog } from '../src/ui/sidebar/layers/RenameAssetDialog';

afterEach(cleanup);

it('renames name and identifier without changing references and permits correcting a collision', () => {
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
        id: 'host',
        name: 'Host',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'action', type: 'instance', component: 'button' }],
        },
      },
    ],
  });
  session.openAsset('button');
  let closed = false;
  render(
    <RenameAssetDialog
      session={session}
      asset={session.getSnapshot().catalog.find((asset) => asset.id === 'button')!}
      onClose={() => {
        closed = true;
      }}
    />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Asset name' }), {
    target: { value: 'Action' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Asset identifier' }), {
    target: { value: 'host' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  expect(closed).toBe(false);
  expect(screen.getByRole('alert')).toHaveTextContent('already in use');
  fireEvent.change(screen.getByRole('textbox', { name: 'Asset identifier' }), {
    target: { value: 'primary-action' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  expect(closed).toBe(true);
  expect(session.getSnapshot().catalog.find((asset) => asset.id === 'button')).toMatchObject({
    name: 'Action',
    slug: 'primary-action',
  });
  expect(session.project.document('host').manifest.nodes.action).toMatchObject({
    component: 'button',
  });
  session.undo();
  expect(session.getSnapshot().document).toMatchObject({ id: 'button', name: 'Button' });
  session.destroy();
});
