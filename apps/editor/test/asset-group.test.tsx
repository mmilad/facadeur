// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createEditorSession } from '../src/domain/session';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { GroupAssetDialog } from '../src/ui/sidebar/layers/GroupAssetDialog';

afterEach(cleanup);
it('adds an asset to an existing group, preserves its reference and supports Undo', () => {
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
    ],
  });
  session.openAsset('button');
  let closed = false;
  render(
    <GroupAssetDialog
      session={session}
      asset={session.getSnapshot().catalog[0]!}
      groups={['form']}
      onClose={() => {
        closed = true;
      }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add to group' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a group name');
  fireEvent.change(screen.getByRole('combobox', { name: 'Group name' }), {
    target: { value: 'Form' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add to group' }));
  expect(closed).toBe(true);
  expect(session.getSnapshot().document).toMatchObject({ id: 'button', group: 'form' });
  session.undo();
  expect(session.getSnapshot().document.group).toBeUndefined();
  session.executeDocument('button', { type: 'setDocumentGroup', group: 'Custom controls' });
  expect(session.getSnapshot().document.group).toBe('Custom controls');
  session.executeDocument('button', { type: 'setDocumentGroup', group: null });
  expect(session.getSnapshot().document.group).toBeUndefined();
  session.destroy();
});
