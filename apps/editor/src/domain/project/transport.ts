import type { ProjectSyncSocket } from './sync.js';
import type { ProjectSnapshot } from './types.js';

type Event = { data?: unknown; code?: number; reason?: string };
type Listener = (event: Event) => void;

/** One ordered project stream: catalog registration precedes dependent document updates. */
export function createProjectTransport(options: {
  url: string;
  onCatalog: (project: ProjectSnapshot) => void;
  onError: (message: string) => void;
  socketFactory?: (url: string) => ProjectSyncSocket;
}) {
  const channels = new Set<Channel>();
  let socket: ProjectSyncSocket;
  let ready = false;
  let destroyed = false;
  let fatal = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let detach = () => {};

  class Channel implements ProjectSyncSocket {
    readyState = 0;
    private listeners = new Map<string, Set<Listener>>();
    constructor(readonly id: string) {}
    addEventListener(type: string, listener: Listener) {
      const listeners = this.listeners.get(type) ?? new Set<Listener>();
      listeners.add(listener);
      this.listeners.set(type, listeners);
    }
    removeEventListener(type: string, listener: Listener) {
      this.listeners.get(type)?.delete(listener);
    }
    emit(type: string, event: Event = {}) {
      for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
    }
    open() {
      if (this.readyState !== 0 || !channels.has(this)) return;
      this.readyState = 1;
      this.emit('open');
    }
    send(data: string) {
      if (!ready || this.readyState !== 1) throw new Error('Project transport is offline');
      socket.send(JSON.stringify({ ...JSON.parse(data), id: this.id }));
    }
    close() {
      channels.delete(this);
      this.readyState = 3;
      this.listeners.clear();
    }
  }

  function fail(message: string) {
    if (destroyed || fatal) return;
    fatal = true;
    ready = false;
    clearTimeout(deadline);
    clearTimeout(retry);
    options.onError(message);
    for (const channel of [...channels]) {
      channel.readyState = 3;
      channel.emit('close', { code: 1008, reason: message });
    }
    detach();
    socket?.close();
  }
  function connect() {
    if (destroyed || fatal) return;
    ready = false;
    try {
      socket = (options.socketFactory ?? ((url) => new WebSocket(url)))(options.url);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Could not connect to project');
      return;
    }
    const active = socket;
    const open = () => {
      deadline = setTimeout(() => fail('Project catalog handshake timed out'), 10000);
    };
    const message = (event: Event) => {
      try {
        if (typeof event.data !== 'string' || event.data.length > 10 * 1024 * 1024)
          throw new Error('Invalid project frame');
        const frame = JSON.parse(event.data);
        if (!frame || typeof frame !== 'object') throw new Error('Invalid project frame');
        if (frame.type === 'catalog') {
          options.onCatalog(frame.project);
          clearTimeout(deadline);
          ready = true;
          for (const channel of [...channels]) channel.open();
        } else {
          if (!ready || typeof frame.id !== 'string') throw new Error('Unscoped project frame');
          for (const channel of [...channels]) {
            if (channel.id === frame.id && channel.readyState === 1)
              channel.emit('message', { data: event.data });
          }
        }
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Invalid project catalog');
      }
    };
    const close = (event: Event) => {
      detach();
      clearTimeout(deadline);
      ready = false;
      if (destroyed || fatal) return;
      if ([1007, 1008, 1009].includes(event.code ?? 0)) {
        fail(event.reason || 'Project transport rejected');
        return;
      }
      for (const channel of [...channels]) {
        channel.readyState = 3;
        channel.emit('close', event);
        channels.delete(channel);
      }
      retry = setTimeout(connect, 250);
    };
    const error = () => {
      for (const channel of [...channels]) channel.emit('error');
    };
    const handlers = { open, message, close, error };
    for (const [type, handler] of Object.entries(handlers)) active.addEventListener(type, handler);
    detach = () => {
      for (const [type, handler] of Object.entries(handlers))
        active.removeEventListener(type, handler);
    };
  }
  connect();
  return {
    socketFor(id: string): ProjectSyncSocket {
      const channel = new Channel(id);
      if (destroyed || fatal) {
        queueMicrotask(() =>
          channel.emit('close', { code: 1008, reason: 'Project transport unavailable' }),
        );
      } else {
        channels.add(channel);
        if (ready) queueMicrotask(() => channel.open());
      }
      return channel;
    },
    destroy() {
      destroyed = true;
      ready = false;
      clearTimeout(deadline);
      clearTimeout(retry);
      detach();
      socket?.close();
      for (const channel of channels) channel.close();
      channels.clear();
    },
  };
}
