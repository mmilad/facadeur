import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@facadeur/store-yjs';
import * as Y from 'yjs';
import { createEditorSession } from '../src/domain/session';
import { allExampleDocuments } from './fixtures/example-catalog';

const catalog = allExampleDocuments();

describe('session shared-history hydration', () => {
  it.each(['project-template', 'form-controls'])(
    'resolves the complete example catalog before hydrating design %s or forward asset references',
    (designId) => {
      const design = catalog.find((file) => file.id === designId)!;
      // Pages come before their sections/components, exercising forward references.
      const documents = [...catalog].sort((left, right) => right.kind.localeCompare(left.kind));
      const servers = catalog.map((file) => createDocumentStore(file));
      const updates = Object.fromEntries(
        servers.map((store) => [store.getDocument().id, Y.encodeStateAsUpdate(store.doc)]),
      );
      let session: ReturnType<typeof createEditorSession> | undefined;
      try {
        session = createEditorSession({ documents, design, updates });
        expect(session.getSnapshot().design.id).toBe(designId);
        const hydrated = session.syncStores();
        expect(hydrated).toHaveLength(catalog.length);
        for (const store of hydrated) {
          const server = servers.find((item) => item.getDocument().id === store.getDocument().id)!;
          expect(store.getDocument()).toEqual(server.getDocument());
          expect(Y.encodeStateVector(store.doc)).toEqual(Y.encodeStateVector(server.doc));
          expect(store.canUndo()).toBe(false);
        }
        if (designId !== 'form-controls') {
          session.openAsset('form-controls');
          expect(session.getSnapshot().document.id).toBe('form-controls');
        }
      } finally {
        session?.destroy();
        servers.forEach((store) => store.destroy());
      }
    },
  );
});
