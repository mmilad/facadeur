import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createDocumentStore, REMOTE_ORIGIN } from '@facadeur/store-yjs';
import * as Y from 'yjs';

const initial: DocumentFile = {
  version: 1,
  id: 'form',
  name: 'Form',
  kind: 'component',
  root: {
    id: 'root',
    type: 'frame',
    children: [
      { id: 'input', type: 'frame', tag: 'input', attributes: { value: 'Typed value' } },
      { id: 'label', type: 'text', text: 'Before' },
    ],
  },
};

describe('shared Yjs document history', () => {
  it('hydrates the server history without reseeding and accepts later incremental updates', () => {
    const server = createDocumentStore(initial);
    server.executeRemote({ type: 'setProp', nodeId: 'label', prop: 'text', value: 'Server' });
    const update = Y.encodeStateAsUpdate(server.doc);
    const client = createDocumentStore(initial, {}, { update });
    expect(client.getDocument()).toEqual(server.getDocument());
    expect(Y.encodeStateVector(client.doc)).toEqual(Y.encodeStateVector(server.doc));
    expect(client.canUndo()).toBe(false);
    const vector = Y.encodeStateVector(client.doc);
    server.executeRemote({
      type: 'insert',
      parentId: 'root',
      node: { id: 'extra', type: 'text', text: 'Extra' },
    });
    client.applyRemoteUpdate(Y.encodeStateAsUpdate(server.doc, vector));
    expect(client.getDocument()).toEqual(server.getDocument());
    expect(client.getDocument().nodes.root).toMatchObject({
      children: ['input', 'label', 'extra'],
    });
    client.destroy();
    server.destroy();
  });

  it('emits once for incoming updates, ignores repeats, and preserves node maps and input data', () => {
    const server = createDocumentStore(initial);
    const client = createDocumentStore(initial, {}, { update: Y.encodeStateAsUpdate(server.doc) });
    const input = client.doc.getMap('nodes').get('input');
    const reasons: string[] = [];
    client.subscribe((change) => reasons.push(change.reason));
    server.executeRemote({ type: 'setProp', nodeId: 'label', prop: 'text', value: 'Remote' });
    const update = Y.encodeStateAsUpdate(server.doc);
    client.applyRemoteUpdate(update);
    client.applyRemoteUpdate(update);
    expect(reasons).toEqual(['remote']);
    expect(client.doc.getMap('nodes').get('input')).toBe(input);
    expect(client.getNode('input')).toMatchObject({
      id: 'input',
      attributes: { value: 'Typed value' },
    });
    server.executeRemote({ type: 'setProp', nodeId: 'label', prop: 'text', value: 'External' });
    Y.applyUpdate(client.doc, Y.encodeStateAsUpdate(server.doc));
    expect(reasons).toEqual(['remote', 'remote']);
    expect(client.getNode('label')).toMatchObject({ text: 'External' });
    client.destroy();
    server.destroy();
  });

  it('keeps API edits out of local Undo and emits local command/undo/redo exactly once', () => {
    const store = createDocumentStore(initial);
    const reasons: string[] = [];
    const origins: unknown[] = [];
    store.subscribe((change) => reasons.push(change.reason));
    store.doc.on('afterTransaction', (transaction) => {
      if (transaction.changedParentTypes.size) origins.push(transaction.origin);
    });
    store.execute({ type: 'setProp', nodeId: 'label', prop: 'text', value: 'Local' });
    store.executeRemote({
      type: 'setProp',
      nodeId: 'input',
      prop: 'attributes',
      value: { value: 'API' },
    });
    expect(origins).toContain(REMOTE_ORIGIN);
    store.undo();
    expect(store.getNode('label')).toMatchObject({ text: 'Before' });
    expect(store.getNode('input')).toMatchObject({ attributes: { value: 'API' } });
    expect(store.canUndo()).toBe(false);
    store.redo();
    expect(store.getNode('label')).toMatchObject({ text: 'Local' });
    expect(reasons).toEqual(['command', 'remote', 'undo', 'redo']);
    expect(() => store.executeRemote({ type: 'remove', nodeId: 'missing' })).toThrow();
    expect(reasons).toEqual(['command', 'remote', 'undo', 'redo']);
    store.destroy();
  });

  it('does not resurrect a local value overwritten by a remote API edit', () => {
    const store = createDocumentStore(initial);
    store.execute({ type: 'setProp', nodeId: 'label', prop: 'text', value: 'Local' });
    store.executeRemote({ type: 'setProp', nodeId: 'label', prop: 'text', value: 'API' });
    store.undo();
    expect(store.getNode('label')).toMatchObject({ text: 'API' });
    store.destroy();
  });

  it('preserves incoming sync edits when undoing and redoing a local command', () => {
    const server = createDocumentStore(initial);
    const client = createDocumentStore(initial, {}, { update: Y.encodeStateAsUpdate(server.doc) });
    client.execute({ type: 'setProp', nodeId: 'label', prop: 'text', value: 'Local' });
    server.executeRemote({
      type: 'setProp',
      nodeId: 'input',
      prop: 'attributes',
      value: { value: 'Synced' },
    });
    client.applyRemoteUpdate(Y.encodeStateAsUpdate(server.doc));
    client.undo();
    expect(client.getNode('label')).toMatchObject({ text: 'Before' });
    expect(client.getNode('input')).toMatchObject({ attributes: { value: 'Synced' } });
    expect(client.canUndo()).toBe(false);
    client.redo();
    expect(client.getNode('label')).toMatchObject({ text: 'Local' });
    expect(client.getNode('input')).toMatchObject({ attributes: { value: 'Synced' } });
    client.destroy();
    server.destroy();
  });

  it('rejects empty, malformed, mismatched, invalid-tree and invalid-token hydration', () => {
    expect(() => createDocumentStore(initial, {}, { update: new Uint8Array([255]) })).toThrow();
    const empty = new Y.Doc();
    expect(() =>
      createDocumentStore(initial, {}, { update: Y.encodeStateAsUpdate(empty) }),
    ).toThrow();
    empty.destroy();
    const other = createDocumentStore({ ...initial, id: 'other' });
    expect(() =>
      createDocumentStore(initial, {}, { update: Y.encodeStateAsUpdate(other.doc) }),
    ).toThrow(/id/);
    other.destroy();
    for (const corrupt of [
      (doc: Y.Doc) => doc.getMap('meta').set('rootId', 'missing'),
      (doc: Y.Doc) => doc.getMap('tokens').set('bad', { $type: 'color', $value: '{missing}' }),
    ]) {
      const server = createDocumentStore(initial);
      corrupt(server.doc);
      expect(() =>
        createDocumentStore(initial, {}, { update: Y.encodeStateAsUpdate(server.doc) }),
      ).toThrow();
      server.destroy();
    }
  });

  it('rejects invalid incoming updates before changing the live document or history', () => {
    const server = createDocumentStore(initial);
    const client = createDocumentStore(initial, {}, { update: Y.encodeStateAsUpdate(server.doc) });
    const before = client.getDocument();
    const vector = Y.encodeStateVector(client.doc);
    const reasons: string[] = [];
    client.subscribe((change) => reasons.push(change.reason));
    server.doc.getMap('meta').set('id', 'wrong');
    expect(() => client.applyRemoteUpdate(Y.encodeStateAsUpdate(server.doc))).toThrow(/id/);
    expect(client.getDocument()).toEqual(before);
    expect(Y.encodeStateVector(client.doc)).toEqual(vector);
    expect(reasons).toEqual([]);
    expect(client.canUndo()).toBe(false);
    client.destroy();
    server.destroy();
  });
});
