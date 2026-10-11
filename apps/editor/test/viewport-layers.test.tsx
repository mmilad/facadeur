/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createExampleCatalog } from '@facadeur/examples';
import { createAppService } from '../src/app-service';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../src/domain/session';
import { CatalogLayersPanel } from '../src/ui/sidebar/layers/CatalogLayersPanel';

describe('catalog viewport layers', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('keeps configured breakpoints out of the catalog Layers panel', async () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<CatalogLayersPanel app={app} session={session} snap={session.getSnapshot()} />);
    });

    expect(session.getSnapshot().catalog.length).toBeGreaterThan(0);
    expect(host.querySelector('[aria-label="Layers"]')).not.toBeNull();
    expect(host.querySelector('.layers-viewports')).toBeNull();
    expect(host.querySelector('button.viewport-layer')).toBeNull();
    await act(async () => {
      root?.unmount();
      root = null;
    });
    session.destroy();
  });
});
