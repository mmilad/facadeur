import { describe, expect, it } from 'vitest';
import { toNested, validateDocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';
import select from '../../../examples/atoms/form-native-select.json';

describe('form group and options persistence', () => {
  it('preserves options bindings and editable group names through reload and Undo', () => {
    const store = createDocumentStore(validateDocumentFile(select));
    store.execute({ type: 'setDocumentGroup', group: 'Custom controls' });
    const saved = toNested(store.getDocument());
    expect(saved.group).toBe('Custom controls');
    if (saved.root.type !== 'frame') throw new Error('Expected select frame');
    expect(saved.root.bindings).toContainEqual({ target: 'options', field: 'options' });
    expect(toNested(createDocumentStore(saved).getDocument())).toEqual(saved);
    store.undo();
    expect(store.getDocument().group).toBe('form');
    store.redo();
    expect(store.getDocument().group).toBe('Custom controls');
  });
});
