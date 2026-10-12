// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createAppService } from '../src/app-service';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../src/domain/session';
import { RenameAssetDialog } from '../src/ui/sidebar/left/RenameAssetDialog';

afterEach(cleanup);

it('renames a Catalog definition while preserving its UUID', async () => {
  const session = createEditorSession({ projectCatalog: createExampleCatalog() });
  const definitionId = exampleIds.components.card.definition;
  const app = createAppService({
    core: session.core,
    session,
    catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
  });
  let closed = false;
  render(
    <RenameAssetDialog
      asset={{ id: definitionId, label: 'Form input', kind: 'atom' }}
      onRename={(id, name) => void app.dispatchSidebarIntent({ type: 'asset.rename', id, name })}
      onClose={() => {
        closed = true;
      }}
    />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
    target: { value: 'Updated card' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(closed).toBe(true));
  expect(session.core.getSnapshot().catalog.components[definitionId]).toMatchObject({
    uuid: definitionId,
    name: 'Updated card',
  });
  session.destroy();
});
