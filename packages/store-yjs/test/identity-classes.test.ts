import { describe, expect, it } from 'vitest';
import { toNested, type DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';

describe('identity and utility class persistence', () => {
  it('preserves class arrays and identifier metadata through save, reload and history', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'host',
      name: 'Host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        classes: ['flex'],
        children: [
          { id: 'child', type: 'instance', component: 'button', classes: ['hover:bg-blue-600'] },
        ],
      },
    };
    const store = createDocumentStore(file);
    store.execute({ type: 'setDocumentMetadata', name: 'Actions', slug: 'actions' });
    store.execute({ type: 'setProp', nodeId: 'child', prop: 'classes', value: ['w-full'] });
    const saved = toNested(store.getDocument());
    expect(saved.slug).toBe('actions');
    expect(toNested(createDocumentStore(saved).getDocument())).toEqual(saved);
    store.undo();
    expect(store.getDocument().nodes.child?.classes).toEqual(['hover:bg-blue-600']);
    store.undo();
    expect(store.getDocument().slug).toBeUndefined();
    store.redo();
    expect(store.getDocument().slug).toBe('actions');
  });
});
