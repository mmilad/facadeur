import { describe, expect, it } from 'vitest';
import { toFlat, toNested, type DocumentFile } from '@facadeur/core';
import { createDocumentStore, readDocumentFromUpdate } from '@facadeur/store-yjs';
import * as Y from 'yjs';

const list: DocumentFile = {
  version: 1,
  id: 'list',
  name: 'CardList',
  kind: 'component',
  previewData: { fields: { items: [{ title: 'A' }, { description: 'B' }] } },
  root: {
    id: 'repeat',
    type: 'repeater',
    name: 'Repeater',
    children: [
      {
        id: 'switch',
        type: 'switch',
        name: 'Switch',
        children: [
          { id: 'card', type: 'instance', component: 'card', switchCase: 'card' },
          { id: 'card2', type: 'instance', component: 'card2', switchCase: 'card-2' },
        ],
      },
    ],
  },
};

describe('structural element persistence', () => {
  it('round trips nested special nodes and heterogeneous samples through Yjs updates', () => {
    const store = createDocumentStore(list);
    expect(store.getDocument()).toEqual(toFlat(list));
    const restored = readDocumentFromUpdate(Y.encodeStateAsUpdate(store.doc));
    expect(restored).toEqual(store.getDocument());
    expect(toNested(restored).root).toEqual(list.root);
    expect(restored.previewData).toEqual(list.previewData);
    store.destroy();
  });

  it('preserves structural child ordering through remove/Undo/Redo', () => {
    const store = createDocumentStore(list);
    store.execute({ type: 'remove', nodeId: 'card2' });
    expect(store.getDocument().nodes.switch).toMatchObject({ type: 'switch', children: ['card'] });
    store.undo();
    expect(store.getDocument().nodes.switch).toMatchObject({ children: ['card', 'card2'] });
    store.redo();
    expect(store.getDocument().nodes.switch).toMatchObject({ children: ['card'] });
    store.destroy();
  });
});
