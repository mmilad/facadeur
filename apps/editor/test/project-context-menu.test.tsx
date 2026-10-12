/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createExampleCatalog } from '@facadeur/examples';
import { createAppService } from '../src/app-service';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../src/domain/session';
import { ProjectTree } from '../src/ui/sidebar/left/ProjectTree';

afterEach(cleanup);

it('opens the Catalog asset menu and creates a Catalog definition from the New action', async () => {
  const session = createEditorSession({ projectCatalog: createExampleCatalog() });
  const app = createAppService({
    core: session.core,
    session,
    catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
  });
  const asset = session.getSnapshot().catalog[0]!;
  const view = render(
    <ProjectTree
      model={session.getSnapshot().sidebar.project}
      surface="editor"
      onOpenDesignDomain={vi.fn()}
      onIntent={(intent) => void app.dispatchSidebarIntent(intent)}
    />,
  );
  const row = view.container.querySelector<HTMLButtonElement>(`[data-asset-id="${asset.id}"]`)!;

  fireEvent.keyDown(row, { key: 'F10', shiftKey: true });
  expect(screen.getByRole('menu')).toBeVisible();
  expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
  expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  expect(screen.queryByRole('menuitem', { name: 'Create variant' })).toBeNull();
  expect(screen.queryByRole('menuitem', { name: 'Add to group' })).toBeNull();

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('menu')).toBeNull();

  fireEvent.contextMenu(row);
  expect(screen.getByRole('menu')).toBeVisible();
  fireEvent.pointerDown(screen.getByRole('heading', { name: 'Project' }));
  expect(screen.queryByRole('menu')).toBeNull();

  fireEvent.click(view.container.querySelector<HTMLButtonElement>('[name="create-component"]')!);
  await waitFor(() => {
    expect(session.getSnapshot().catalog.some((item) => item.name === 'New component')).toBe(true);
  });
  expect(session.getSnapshot().openId).not.toBeNull();

  session.destroy();
});
