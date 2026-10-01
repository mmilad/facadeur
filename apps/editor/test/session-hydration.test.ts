import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateCatalog } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';
import * as Y from 'yjs';
import { createEditorSession } from '../src/domain/session.js';

const examples = new URL('../../../examples/', import.meta.url);
const catalog = validateCatalog(
  readdirSync(examples)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(new URL(name, examples), 'utf8')))
    .filter((file) => file.version === 1 && file.root && file.id),
);

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
