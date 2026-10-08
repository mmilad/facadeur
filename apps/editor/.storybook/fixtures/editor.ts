import { createInMemoryCatalogPort } from '../../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../../src/domain/session/create-editor-session';
import { createAppService } from '../../src/app-service';
import { createExampleCatalog } from '@facadeur/examples';

export function createStorybookEditor(assetId: string, layerUuid: string) {
  const session = createEditorSession({ projectCatalog: createExampleCatalog() });
  session.openAsset(assetId);
  session.selectNode(layerUuid);
  const app = createAppService({
    core: session.core,
    session,
    catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
  });
  return { app, session };
}
