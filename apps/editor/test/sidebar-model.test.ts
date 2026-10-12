import { describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createAppService } from '../src/app-service';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../src/domain/session';

describe('sidebar view-model adapter', () => {
  it('maps the canonical Example Catalog into asset, layer, and inspector UI models', () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    session.openAsset(exampleIds.components.card.definition);
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });
    const snapshot = app.getSnapshot();
    const project = snapshot.sidebar.project;
    const card = project.assets.find((asset) => asset.id === exampleIds.components.card.definition);
    const layers = snapshot.sidebar.layers.layers;

    expect(card).toMatchObject({ label: 'Card', kind: 'component' });
    expect(project.draggableAssetIds).toContain(exampleIds.components.button.definition);
    expect(layers?.children.map((item) => item.label)).toEqual(
      expect.arrayContaining(['eyebrow', 'title', 'body']),
    );
    expect(snapshot.sidebar.inspector?.nodeId).toBe(exampleIds.components.card.nodes.root);
    expect(snapshot.sidebar.inspector?.tabs.map((tab) => tab.label)).toEqual(
      expect.arrayContaining(['Style', 'Properties']),
    );
    session.destroy();
  });
});
