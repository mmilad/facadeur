import { expect, it, vi } from 'vitest';
import { applyCommand, toFlat, type DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';

const fixture: DocumentFile = {
  version: 1,
  id: 'grid-batch',
  name: 'Grid batch',
  kind: 'component',
  root: { id: 'root', type: 'frame', children: [{ id: 'child', type: 'text', text: 'Child' }] },
};
it('applies parent and child styles in one notification and one Undo', () => {
  const store = createDocumentStore(fixture);
  const before = store.getDocument();
  const listener = vi.fn();
  store.subscribe(listener);
  store.execute({
    type: 'batch',
    commands: [
      { type: 'setStyle', nodeId: 'root', property: 'grid-template-areas', value: '"content"' },
      { type: 'setStyle', nodeId: 'child', property: 'grid-area', value: 'content' },
    ],
  });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(store.getDocument().nodes.child).toMatchObject({ style: { 'grid-area': 'content' } });
  store.undo();
  expect(store.getDocument()).toEqual(before);
  store.redo();
  expect(store.getDocument().nodes.root).toMatchObject({
    style: { 'grid-template-areas': '"content"' },
  });
  store.destroy();
});
it('rejects an invalid batch without mutating the store or input', () => {
  const before = toFlat(fixture);
  const command = {
    type: 'batch' as const,
    commands: [
      { type: 'setStyle' as const, nodeId: 'root', property: 'display', value: 'grid' },
      { type: 'setStyle' as const, nodeId: 'missing', property: 'grid-area', value: 'content' },
    ],
  };
  expect(() => applyCommand(before, command)).toThrow();
  expect(before).toEqual(toFlat(fixture));
  const store = createDocumentStore(fixture);
  const listener = vi.fn();
  store.subscribe(listener);
  expect(() => store.execute(command)).toThrow();
  expect(store.getDocument()).toEqual(before);
  expect(listener).not.toHaveBeenCalled();
  expect(store.canUndo()).toBe(false);
  store.destroy();
});
