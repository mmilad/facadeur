import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { COMMAND_ORIGIN, createDocumentStore } from '@facadeur/store-yjs';
import { createProjectSync, type ProjectSyncSocket } from '../src/domain/project/sync';
import { decodeBase64, encodeBase64 } from '../src/domain/project/encoding';

class Socket implements ProjectSyncSocket {
  readyState = 0;
  sent: { stateVector: string; update: string; requestId: string }[] = [];
  listeners = new Map<
    string,
    Set<(event: { data?: unknown; code?: number; reason?: string }) => void>
  >();
  addEventListener(
    type: string,
    listener: (event: { data?: unknown; code?: number; reason?: string }) => void,
  ) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(
    type: string,
    listener: (event: { data?: unknown; code?: number; reason?: string }) => void,
  ) {
    this.listeners.get(type)?.delete(listener);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
  }
  emit(type: string, event: { data?: unknown; code?: number; reason?: string } = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
  open() {
    this.readyState = 1;
    this.emit('open');
  }
  receive(frame: object) {
    this.emit('message', { data: JSON.stringify(frame) });
  }
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.useRealTimers();
});
function setup(onState?: Parameters<typeof createProjectSync>[0]['onState']) {
  const initial = {
    version: 1 as const,
    id: 'card',
    name: 'Card',
    kind: 'component' as const,
    root: { id: 'root', type: 'text' as const, text: 'Hello' },
  };
  const server = createDocumentStore(initial);
  const store = createDocumentStore(initial, {}, { update: Y.encodeStateAsUpdate(server.doc) });
  const sockets: Socket[] = [];
  const sync = createProjectSync({
    store,
    url: 'ws://test',
    onState,
    socketFactory: () => {
      const socket = new Socket();
      sockets.push(socket);
      return socket;
    },
  });
  cleanups.push(() => {
    sync.destroy();
    store.destroy();
    server.destroy();
  });
  function handshake(socket = sockets.at(-1)!) {
    socket.open();
    socket.receive({
      type: 'sync',
      update: encodeBase64(
        Y.encodeStateAsUpdate(server.doc, decodeBase64(socket.sent[0]!.stateVector)),
      ),
      stateVector: encodeBase64(Y.encodeStateVector(server.doc)),
      revision: 0,
      savedRevision: 0,
    });
    return socket;
  }
  return { server, store, sockets, sync, handshake };
}

describe('project sync', () => {
  it('encodes browser binary payloads and rejects malformed base64', () => {
    const bytes = Uint8Array.from({ length: 30000 }, (_, i) => i % 256);
    expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
    expect(() => decodeBase64('%%%')).toThrow();
  });
  it('waits for handshake and every acknowledgement without resending hydrated state', async () => {
    const { store, sync, handshake } = setup();
    const ready = sync.flush();
    const socket = handshake();
    expect(await ready).toBe(0);
    expect(socket.sent).toHaveLength(1);
    store.doc.transact(() => store.doc.getMap('meta').set('name', 'Local'), COMMAND_ORIGIN);
    store.doc.transact(() => store.doc.getMap('meta').set('name', 'Local 2'), COMMAND_ORIGIN);
    const flushed = sync.flush();
    socket.receive({
      type: 'ack',
      requestId: socket.sent[1]!.requestId,
      revision: 1,
      savedRevision: 0,
    });
    expect(sync.state().pending).toBe(true);
    socket.receive({
      type: 'ack',
      requestId: socket.sent[2]!.requestId,
      revision: 2,
      savedRevision: 0,
    });
    expect(await flushed).toBe(2);
    socket.receive({ type: 'saved', revision: 2, savedRevision: 2 });
    expect(sync.state().savedRevision).toBe(2);
  });
  it('does not resend remote edits and preserves local undo', () => {
    const { server, store, handshake } = setup();
    const socket = handshake();
    store.doc.transact(() => store.doc.getMap('meta').set('name', 'Local'), COMMAND_ORIGIN);
    const vector = Y.encodeStateVector(store.doc);
    server.doc.transact(() => server.doc.getMap('meta').set('remoteField', 'Remote'));
    socket.receive({
      type: 'update',
      update: encodeBase64(Y.encodeStateAsUpdate(server.doc, vector)),
      revision: 1,
      savedRevision: 0,
    });
    expect(socket.sent).toHaveLength(2);
    store.undo();
    expect(store.doc.getMap('meta').get('name')).toBe('Card');
    expect(socket.sent).toHaveLength(3);
  });
  it('recovers unacknowledged and offline edits using a reconnect state vector', async () => {
    vi.useFakeTimers();
    const { store, server, sync, sockets, handshake } = setup();
    const socket = handshake();
    store.doc.transact(() => store.doc.getMap('meta').set('name', 'Unacked'), COMMAND_ORIGIN);
    socket.emit('close', { code: 1006 });
    await expect(sync.flush()).rejects.toThrow('offline');
    store.doc.transact(() => store.doc.getMap('meta').set('name', 'Offline'), COMMAND_ORIGIN);
    expect(sync.state().pending).toBe(true);
    await vi.advanceTimersByTimeAsync(250);
    expect(sync.state()).toMatchObject({ status: 'connecting', pending: true });
    const next = handshake(sockets[1]);
    expect(next.sent).toHaveLength(2);
    expect(sync.state().pending).toBe(true);
    server.applyRemoteUpdate(decodeBase64(next.sent[1]!.update));
    expect(server.getDocument().name).toBe('Offline');
    const flushed = sync.flush();
    next.receive({
      type: 'ack',
      requestId: next.sent[1]!.requestId,
      revision: 1,
      savedRevision: 0,
    });
    expect(await flushed).toBe(1);
    expect(sync.state().pending).toBe(false);
  });
  it('preserves server saved metadata separately from acknowledged revisions', () => {
    const onState = vi.fn();
    const { sync, sockets, server } = setup(onState);
    const socket = sockets[0]!;
    socket.open();
    socket.receive({
      type: 'sync',
      update: encodeBase64(Y.encodeStateAsUpdate(server.doc)),
      stateVector: encodeBase64(Y.encodeStateVector(server.doc)),
      revision: 8,
      savedRevision: 3,
    });
    expect(sync.state()).toMatchObject({ revision: 8, savedRevision: 3, pending: false });
    expect(onState).toHaveBeenLastCalledWith(sync.state());
  });
  it('silences expected destruction and ignores late socket errors', async () => {
    vi.useFakeTimers();
    const onState = vi.fn();
    const { sync, sockets } = setup(onState);
    const socket = sockets[0]!;
    const flushed = sync.flush();
    onState.mockClear();
    sync.destroy();
    sync.destroy();
    socket.emit('error');
    socket.emit('close', { code: 1006 });
    await expect(flushed).rejects.toThrow('destroyed');
    await vi.advanceTimersByTimeAsync(20000);
    expect(onState).not.toHaveBeenCalled();
    expect(sync.state()).toMatchObject({ status: 'offline', error: undefined });
    expect(sockets).toHaveLength(1);
  });
  it('rejects server errors and stops reconnecting after invalid updates', async () => {
    vi.useFakeTimers();
    const { store, sync, sockets, handshake } = setup();
    const socket = handshake();
    store.doc.transact(() => store.doc.getMap('meta').set('name', 'Bad'), COMMAND_ORIGIN);
    const flushed = sync.flush();
    socket.receive({
      type: 'error',
      requestId: socket.sent[1]!.requestId,
      message: 'Update rejected',
    });
    await expect(flushed).rejects.toThrow('Update rejected');
    expect(sync.state()).toMatchObject({ status: 'error', pending: true });
    socket.emit('close', { code: 1008 });
    await vi.advanceTimersByTimeAsync(20000);
    expect(sockets).toHaveLength(1);
  });
  it('bounds handshake waits and removes listeners on destruction', async () => {
    vi.useFakeTimers();
    const { sync, sockets } = setup();
    sockets[0]!.open();
    const assertion = expect(sync.flush()).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(10000);
    await assertion;
    sync.destroy();
    expect([...sockets[0]!.listeners.values()].every((listeners) => !listeners.size)).toBe(true);
  });
  it('rejects malformed and oversized frames', () => {
    const { sync, sockets } = setup();
    sockets[0]!.emit('message', { data: 'x'.repeat(10 * 1024 * 1024 + 1) });
    expect(sync.state().status).toBe('error');
    const other = setup();
    other.sockets[0]!.receive({ type: 'saved', revision: -1, savedRevision: 0 });
    expect(other.sync.state().status).toBe('error');
  });
});
