/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createAppService } from '../src/app-service';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../src/domain/session';
import { CatalogNodeInspector } from '../src/ui/sidebar/properties/CatalogNodeInspector';

const definitionUuid = exampleIds.components.formInput.definition;
const rootUuid = exampleIds.components.formInput.nodes.root;

function renderInspector() {
  const session = createEditorSession({ projectCatalog: createExampleCatalog() });
  session.openAsset(definitionUuid);
  const app = createAppService({
    core: session.core,
    session,
    catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
  });
  render(<CatalogNodeInspector app={app} nodeUuid={rootUuid} formKey={definitionUuid} />);
  return session;
}

describe('catalog inspector tabs', () => {
  afterEach(cleanup);

  it('shows the active Style and Properties tabs for a catalog element', () => {
    const session = renderInspector();

    expect(screen.getByRole('tab', { name: 'Style' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Properties' })).toBeTruthy();
    expect(screen.getByRole('tabpanel', { name: 'Style' }).textContent).toContain('Layout & style');

    fireEvent.click(screen.getByRole('tab', { name: 'Properties' }));

    expect(screen.getByRole('tab', { name: 'Properties' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tabpanel', { name: 'Properties' }).textContent).toContain(
      'HTML attributes',
    );
    session.destroy();
  });
});
