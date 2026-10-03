import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { type DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';
import { createProjectServer } from '../src/http';
import { openProject } from '../src/project/index';

const cleanups: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'facadeur-catalog-'));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  const directory = join(dir, 'documents');
  mkdirSync(directory);
  const document: DocumentFile = {
    version: 1,
    id: 'card',
    name: 'Card',
    kind: 'component',
    root: { id: 'root', type: 'frame', children: [] },
  };
  writeFileSync(join(directory, 'card.json'), JSON.stringify(document));
  writeFileSync(
    join(directory, 'project-template.json'),
    JSON.stringify({ ...document, id: 'project-template', kind: 'page' }),
  );
  const options = { directory, stateDirectory: join(dir, 'state') };
  const project = openProject(options);
  cleanups.push(() => project.destroy());
  const runtime = createProjectServer(project);
  cleanups.push(() => runtime.close());
  await new Promise<void>((resolve) => runtime.server.listen(0, '127.0.0.1', resolve));
  const address = runtime.server.address();
  if (!address || typeof address === 'string') throw new Error('No listener');
  const base = `http://127.0.0.1:${address.port}`;
  return {
    project,
    runtime,
    options,
    document,
    base,
    url: `ws://127.0.0.1:${address.port}/sync?project=default`,
  };
}

function connect(url: string, headers?: Record<string, string>) {
  const socket = new WebSocket(url, { headers });
  const frames: Record<string, unknown>[] = [];
  socket.on('message', (data) => frames.push(JSON.parse(data.toString())));
  cleanups.push(() => socket.terminate());
  const opened = new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  return { socket, frames, opened };
}

const atom: DocumentFile = {
  version: 1,
  id: 'new-atom',
  name: 'New atom',
  kind: 'atom',
  root: { id: 'root', type: 'text', text: 'Created' },
};

describe('project-wide WebSocket catalog', () => {
  it('sends the complete snapshot on connection and multiplexes sync and update acknowledgements', async () => {
    const { project, url, document } = await fixture();
    const first = connect(url, { Origin: 'http://localhost:3001' });
    const second = connect(url);
    const legacy = connect(`${url}&id=card`);
    await Promise.all([first.opened, second.opened, legacy.opened]);
    await expect.poll(() => first.frames.length).toBe(1);
    expect(first.frames[0]).toEqual({ type: 'catalog', project: project.snapshot() });
    await expect.poll(() => second.frames.length).toBe(1);
    expect(second.frames[0]).toEqual(first.frames[0]);
    expect(legacy.frames).toEqual([]);

    const empty = new Y.Doc();
    const stateVector = Buffer.from(Y.encodeStateVector(empty)).toString('base64');
    empty.destroy();
    for (const id of ['card', 'project-template']) {
      first.socket.send(JSON.stringify({ id, type: 'sync', stateVector }));
      await expect.poll(() => first.frames.at(-1)?.id).toBe(id);
      expect(first.frames.at(-1)).toMatchObject({ id, type: 'sync', ...project.getState(id) });
    }
    const store = createDocumentStore(
      document,
      {},
      {
        update: Buffer.from(project.getState('card').update, 'base64'),
      },
    );
    try {
      const vector = Y.encodeStateVector(store.doc);
      store.execute({ type: 'setProp', nodeId: 'root', prop: 'name', value: 'Shared' });
      first.socket.send(
        JSON.stringify({
          id: 'card',
          type: 'update',
          requestId: 'edit-1',
          update: Buffer.from(Y.encodeStateAsUpdate(store.doc, vector)).toString('base64'),
        }),
      );
      await expect.poll(() => first.frames.at(-1)?.type).toBe('ack');
      expect(first.frames.at(-1)).toEqual({
        id: 'card',
        type: 'ack',
        requestId: 'edit-1',
        revision: 1,
        savedRevision: 0,
      });
      await expect.poll(() => second.frames.length).toBe(2);
      expect(second.frames[1]).toEqual({ id: 'card', type: 'update', ...project.getState('card') });
      await expect.poll(() => legacy.frames.length).toBe(1);
      expect(legacy.frames[0]).toEqual({ type: 'update', ...project.getState('card') });
      legacy.socket.send(JSON.stringify({ type: 'sync', stateVector }));
      await expect.poll(() => legacy.frames.length).toBe(2);
      expect(legacy.frames[1]).toEqual({ type: 'sync', ...project.getState('card') });
    } finally {
      store.destroy();
    }
  });

  it('publishes creation catalogs before dependent parent updates and reconnects with unsaved documents', async () => {
    const { project, runtime, options, base, url } = await fixture();
    const peers = [connect(url), connect(url)];
    const legacy = connect(`${url}&id=card`);
    await Promise.all([...peers.map((peer) => peer.opened), legacy.opened]);
    for (const peer of peers) await expect.poll(() => peer.frames.length).toBe(1);
    const created = await fetch(`${base}/api/projects/default/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: atom }),
    });
    expect(created.status).toBe(201);
    const catalog = project.snapshot();
    // Both commits occur without waiting for receipt: socket ordering must carry the dependency.
    project.edit(
      'card',
      {
        type: 'insert',
        parentId: 'root',
        node: { type: 'instance', component: atom.id },
      },
      0,
    );
    for (const peer of peers) {
      await expect.poll(() => peer.frames.length).toBe(3);
      expect(peer.frames[1]).toEqual({ type: 'catalog', project: catalog });
      expect(peer.frames[2]).toEqual({ id: 'card', type: 'update', ...project.getState('card') });
    }
    await expect.poll(() => legacy.frames.length).toBe(1);
    expect(legacy.frames[0]).toEqual({ type: 'update', ...project.getState('card') });
    expect(existsSync(join(options.directory, `${atom.id}.json`))).toBe(false);
    const reconnect = connect(url);
    await reconnect.opened;
    await expect.poll(() => reconnect.frames.length).toBe(1);
    expect(reconnect.frames[0]).toEqual({ type: 'catalog', project: project.snapshot() });
    const snapshot = project.snapshot();
    await runtime.close();
    project.destroy();
    const restored = openProject(options);
    cleanups.push(() => restored.destroy());
    const restarted = createProjectServer(restored);
    cleanups.push(() => restarted.close());
    await new Promise<void>((resolve) => restarted.server.listen(0, '127.0.0.1', resolve));
    const address = restarted.server.address();
    if (!address || typeof address === 'string') throw new Error('No listener');
    const recovered = connect(`ws://127.0.0.1:${address.port}/sync?project=default`);
    await recovered.opened;
    await expect.poll(() => recovered.frames.length).toBe(1);
    expect(recovered.frames[0]).toEqual({ type: 'catalog', project: snapshot });
  });

  it('scopes errors to document and request without changing state, and retains the legacy error shape', async () => {
    const { project, url } = await fixture();
    const peer = connect(url);
    await peer.opened;
    await expect.poll(() => peer.frames.length).toBe(1);
    const before = project.snapshot();
    const invalid = [
      { type: 'sync', requestId: 'missing-id', stateVector: 'AA==' },
      { id: 42, type: 'sync', requestId: 'numeric-id' },
      ...['', '../card', 'missing', '__proto__', 'con'].map((id) => ({
        id,
        type: 'sync',
        requestId: 'bad-id',
      })),
      { id: 'card', type: 'unknown', requestId: 'bad-type' },
      { id: 'card', type: 'sync', stateVector: '!', requestId: 'bad-vector' },
      { id: 'card', type: 'update', update: '/w==', requestId: 'bad-update' },
      { id: 'card', type: 'update', update: 'AAA=' },
    ];
    for (const message of invalid) {
      const count = peer.frames.length;
      peer.socket.send(JSON.stringify(message));
      await expect.poll(() => peer.frames.length).toBe(count + 1);
      expect(peer.frames.at(-1)).toMatchObject({ type: 'error' });
      expect(peer.frames.at(-1)?.id).toBe(typeof message.id === 'string' ? message.id : undefined);
      expect(peer.frames.at(-1)?.requestId).toBe(message.requestId);
    }
    for (const message of ['{', 'null', '[]', Buffer.from([1, 2])]) {
      const count = peer.frames.length;
      peer.socket.send(message);
      await expect.poll(() => peer.frames.length).toBe(count + 1);
      expect(peer.frames.at(-1)).toMatchObject({ type: 'error' });
    }
    expect(project.snapshot()).toEqual(before);
    const legacy = connect(`${url}&id=card`);
    await legacy.opened;
    legacy.socket.send(JSON.stringify({ type: 'unknown', id: 'missing', requestId: 'legacy' }));
    await expect.poll(() => legacy.frames.length).toBe(1);
    expect(legacy.frames[0]).toEqual({
      type: 'error',
      requestId: 'legacy',
      message: 'Unknown sync message',
    });
  });

  it('rejects forbidden origins, hosts, projects and explicit invalid document ids', async () => {
    const { url } = await fixture();
    for (const [target, headers, status] of [
      [url, { Origin: 'https://unrelated.example' }, 403],
      [url, { Host: 'unrelated.example' }, 403],
      [url.replace('default', 'other'), {}, 403],
      [`${url}&id=`, {}, 404],
      [`${url}&id=missing`, {}, 404],
      [`${url}&id=..%2Fcard`, {}, 404],
    ] as const) {
      const socket = new WebSocket(target, { headers });
      const response = await new Promise<number | undefined>((resolve, reject) => {
        socket.on('unexpected-response', (_request, incoming) => {
          incoming.resume();
          resolve(incoming.statusCode);
          socket.terminate();
        });
        socket.on('error', reject);
        socket.on('open', () => reject(new Error('Unexpected accepted connection')));
      });
      expect(response).toBe(status);
    }
  });
});
