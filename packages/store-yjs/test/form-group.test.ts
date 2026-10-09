import { describe, expect, it } from 'vitest';
import { toNested, validateDocumentFile, type DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';

const initial: DocumentFile = {
  version: 1,
  id: 'group-persistence',
  name: 'Group persistence',
  kind: 'component',
  group: 'form',
  root: { id: 'root', type: 'frame', children: [] },
};

describe('document group persistence', () => {
  it('preserves editable group names through reload, undo, and redo', () => {
    const store = createDocumentStore(validateDocumentFile(initial));
    store.execute({ type: 'setDocumentGroup', group: 'Custom controls' });
    const saved = toNested(store.getDocument());
    expect(saved.group).toBe('Custom controls');
    const reloaded = createDocumentStore(saved);
    expect(toNested(reloaded.getDocument())).toEqual(saved);
    reloaded.destroy();
    store.undo();
    expect(store.getDocument().group).toBe('form');
    store.redo();
    expect(store.getDocument().group).toBe('Custom controls');
    store.destroy();
  });
});
