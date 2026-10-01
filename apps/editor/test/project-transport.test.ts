import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProjectTransport } from '../src/domain/project/transport.js';
import type { ProjectSnapshot } from '../src/domain/project/types.js';
import type { ProjectSyncSocket } from '../src/domain/project/sync.js';

type Event = { data?: unknown; code?: number; reason?: string };
class Socket implements ProjectSyncSocket {
  readyState = 0;
  sent: unknown[] = [];
  listeners = new Map<string, Set<(event: Event) => void>>();
  addEventListener(type: string, listener: (event: Event) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.get(type)?.delete(listener);
  }
  send(wire: string) {
    this.sent.push(JSON.parse(wire));
  }
  close() {
    this.readyState = 3;
  }
  emit(type: string, event: Event = {}) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }
  receive(frame: unknown) {
    this.emit('message', { data: JSON.stringify(frame) });
  }
}
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.useRealTimers();
});
function setup(onCatalog = vi.fn(), onError = vi.fn()) {
  const sockets: Socket[] = [];
  const transport = createProjectTransport({
    url: 'ws://test/sync?project=default',
    onCatalog,
    onError,
    socketFactory: () => {
      const socket = new Socket();
      sockets.push(socket);
      return socket;
    },
  });
  cleanups.push(() => transport.destroy());
  return { transport, sockets, onCatalog, onError };
}
const catalog = { id: 'default' } as ProjectSnapshot;

describe('ordered project transport', () => {
  it('registers catalog before opening channels and routes updates by document identity', () => {
    const order: string[] = [];
    const { transport, sockets } = setup(vi.fn(() => order.push('catalog')));
    const card = transport.socketFor('card');
    const page = transport.socketFor('page');
    card.addEventListener('open', () => order.push('card-open'));
    page.addEventListener('message', () => order.push('page-update'));
    sockets[0]!.emit('open');
    expect(card.readyState).toBe(0);
    sockets[0]!.receive({ type: 'catalog', project: catalog });
    card.send(JSON.stringify({ type: 'sync', stateVector: 'AA==' }));
    expect(sockets[0]!.sent).toEqual([{ type: 'sync', stateVector: 'AA==', id: 'card' }]);
    sockets[0]!.receive({ type: 'update', id: 'page', update: 'AA==' });
    expect(order).toEqual(['catalog', 'card-open', 'page-update']);
  });
  it('opens channels added while accepting a catalog exactly once', async () => {
    const opened = vi.fn();
    let channel: ProjectSyncSocket;
    const onCatalog = vi.fn(() => {
      channel = context.transport.socketFor('new');
      channel.addEventListener('open', opened);
    });
    const context = setup(onCatalog);
    context.sockets[0]!.receive({ type: 'catalog', project: catalog });
    await Promise.resolve();
    expect(opened).toHaveBeenCalledOnce();
    channel!.close();
    context.sockets[0]!.receive({ type: 'update', id: 'new' });
    expect(opened).toHaveBeenCalledOnce();
  });
  it('reconnects with a fresh catalog before reopening replacement channels', () => {
    vi.useFakeTimers();
    const { transport, sockets, onCatalog } = setup();
    const first = transport.socketFor('card');
    const closed = vi.fn();
    first.addEventListener('close', closed);
    sockets[0]!.receive({ type: 'catalog', project: catalog });
    sockets[0]!.emit('close', { code: 1006 });
    expect(closed).toHaveBeenCalledOnce();
    const replacement = transport.socketFor('card');
    vi.advanceTimersByTime(250);
    expect(replacement.readyState).toBe(0);
    sockets[1]!.receive({ type: 'catalog', project: catalog });
    expect(replacement.readyState).toBe(1);
    expect(onCatalog).toHaveBeenCalledTimes(2);
  });
  it('fails invalid catalogs and unscoped messages visibly instead of processing document data', () => {
    const { transport, sockets, onError } = setup(
      vi.fn(() => {
        throw new Error('Invalid catalog');
      }),
    );
    const channel = transport.socketFor('card');
    const closed = vi.fn();
    channel.addEventListener('close', closed);
    sockets[0]!.receive({ type: 'catalog', project: catalog });
    expect(onError).toHaveBeenCalledWith('Invalid catalog');
    expect(closed).toHaveBeenCalledWith({ code: 1008, reason: 'Invalid catalog' });
    const other = setup();
    other.sockets[0]!.receive({ type: 'update', id: 'card' });
    expect(other.onError).toHaveBeenCalledWith('Unscoped project frame');
  });
  it('times out missing catalog handshakes and removes socket listeners on cleanup', () => {
    vi.useFakeTimers();
    const { transport, sockets, onError } = setup();
    sockets[0]!.emit('open');
    vi.advanceTimersByTime(10000);
    expect(onError).toHaveBeenCalledWith('Project catalog handshake timed out');
    transport.destroy();
    expect([...sockets[0]!.listeners.values()].every((listeners) => listeners.size === 0)).toBe(
      true,
    );
  });
});
