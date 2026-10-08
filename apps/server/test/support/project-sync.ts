import * as Y from 'yjs';
import { REMOTE_ORIGIN, type YjsDocumentStore } from '@facadeur/store-yjs';
import { decodeBase64, encodeBase64 } from './encoding';
export { decodeBase64, encodeBase64 } from './encoding';

export interface ProjectSyncState {
  status: 'connecting' | 'synced' | 'offline' | 'error';
  revision: number;
  savedRevision: number;
  pending: boolean;
  error?: string;
}

export interface ProjectSyncSocket {
  readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(
    type: string,
    listener: (event: { data?: unknown; code?: number; reason?: string }) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: { data?: unknown; code?: number; reason?: string }) => void,
  ): void;
}

const MAX_FRAME = 10 * 1024 * 1024;
const TIMEOUT = 10_000;

export function createProjectSync(options: {
  store: YjsDocumentStore;
  url: string;
  onState?: (state: ProjectSyncState) => void;
  socketFactory?: (url: string) => ProjectSyncSocket;
}) {
  let current: ProjectSyncState = {
    status: 'connecting',
    revision: 0,
    savedRevision: 0,
    pending: true,
  };
  let socket: ProjectSyncSocket | undefined;
  let detach = () => {};
  let destroyed = false;
  let fatal = false;
  let handshake = false;
  let dirty = false;
  let sequence = 0;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const pending = new Set<string>();
  const waiters = new Set<{
    resolve: (revision: number) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  function publish(patch: Partial<ProjectSyncState> = {}) {
    current = { ...current, ...patch, pending: !handshake || dirty || pending.size > 0 };
    options.onState?.({ ...current });
    if (handshake && !current.pending && current.status === 'synced') {
      for (const waiter of waiters) {
        clearTimeout(waiter.timer);
        waiter.resolve(current.revision);
      }
      waiters.clear();
    }
  }
  function reject(message: string) {
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(message));
    }
    waiters.clear();
  }
  function fail(message: string) {
    fatal = true;
    clearTimeout(deadline);
    clearTimeout(reconnect);
    publish({ status: 'error', error: message });
    reject(message);
    detach();
    socket?.close();
  }
  function send(frame: object) {
    const wire = JSON.stringify(frame);
    if (wire.length > MAX_FRAME) throw new Error('Sync frame exceeds 10MB');
    socket!.send(wire);
  }
  function armDeadline() {
    clearTimeout(deadline);
    deadline = setTimeout(() => fail('Sync acknowledgement timed out'), TIMEOUT);
  }
  function update(bytes: Uint8Array) {
    const requestId = `update-${++sequence}`;
    pending.add(requestId);
    send({ type: 'update', requestId, update: encodeBase64(bytes) });
    if (pending.size === 1) armDeadline();
  }
  function localUpdate(bytes: Uint8Array, origin: unknown) {
    if (origin === REMOTE_ORIGIN || destroyed) return;
    dirty = true;
    if (handshake && !fatal && socket?.readyState === 1) {
      try {
        update(bytes);
        dirty = false;
      } catch (error) {
        fail(String(error));
      }
    }
    publish();
  }
  function connect() {
    if (destroyed || fatal) return;
    handshake = false;
    publish({ status: 'connecting', error: undefined });
    try {
      socket = (options.socketFactory ?? ((url) => new WebSocket(url)))(options.url);
    } catch (error) {
      fail(String(error));
      return;
    }
    const active = socket;
    const open = () => {
      try {
        send({ type: 'sync', stateVector: encodeBase64(Y.encodeStateVector(options.store.doc)) });
        armDeadline();
      } catch (error) {
        fail(String(error));
      }
    };
    const message = (event: { data?: unknown }) => {
      try {
        if (typeof event.data !== 'string' || event.data.length > MAX_FRAME)
          throw new Error('Invalid sync frame size or format');
        const frame = JSON.parse(event.data);
        if (!frame || typeof frame !== 'object' || typeof frame.type !== 'string')
          throw new Error('Invalid sync frame');
        if (frame.type === 'error') {
          if (
            typeof frame.message !== 'string' ||
            (frame.requestId !== undefined && typeof frame.requestId !== 'string')
          )
            throw new Error('Invalid error frame');
          fail(frame.message);
          return;
        }
        if (
          !['sync', 'update', 'ack', 'saved'].includes(frame.type) ||
          !Number.isSafeInteger(frame.revision) ||
          frame.revision < 0 ||
          !Number.isSafeInteger(frame.savedRevision) ||
          frame.savedRevision < 0 ||
          frame.savedRevision > frame.revision
        )
          throw new Error('Invalid sync metadata');
        if (frame.type === 'sync' || frame.type === 'update') {
          if (typeof frame.update !== 'string') throw new Error('Invalid update frame');
          if (frame.type === 'sync' && typeof frame.stateVector !== 'string')
            throw new Error('Invalid state vector');
          options.store.applyRemoteUpdate(decodeBase64(frame.update));
        }
        if (frame.type === 'sync') {
          if (handshake) throw new Error('Unexpected sync response');
          const diff = Y.encodeStateAsUpdate(options.store.doc, decodeBase64(frame.stateVector));
          pending.clear();
          handshake = true;
          dirty = false;
          clearTimeout(deadline);
          if (diff.length > 2) update(diff);
        } else if (frame.type === 'ack') {
          if (typeof frame.requestId !== 'string' || !pending.delete(frame.requestId))
            throw new Error('Unexpected acknowledgement');
          if (!pending.size) clearTimeout(deadline);
        }
        publish({
          status: handshake ? 'synced' : 'connecting',
          revision: Math.max(current.revision, frame.revision),
          savedRevision: Math.max(current.savedRevision, frame.savedRevision),
        });
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    };
    const close = (event: { code?: number; reason?: string }) => {
      detach();
      clearTimeout(deadline);
      handshake = false;
      if (destroyed || fatal) return;
      if (event.code === 1007 || event.code === 1008 || event.code === 1009) {
        fail(event.reason || 'Server rejected sync data');
        return;
      }
      publish({ status: 'offline' });
      reject('Project sync is offline');
      reconnect = setTimeout(connect, 250);
    };
    const error = () => {
      publish({ status: 'offline' });
      reject('Project sync is offline');
    };
    const listeners = { open, message, close, error };
    for (const [type, listener] of Object.entries(listeners))
      active.addEventListener(type, listener);
    detach = () => {
      for (const [type, listener] of Object.entries(listeners))
        active.removeEventListener(type, listener);
    };
  }
  options.store.doc.on('update', localUpdate);
  connect();
  return {
    state: () => ({ ...current }),
    flush(): Promise<number> {
      if (destroyed || fatal || current.status === 'offline')
        return Promise.reject(new Error(current.error ?? 'Project sync is offline'));
      if (handshake && !current.pending) return Promise.resolve(current.revision);
      return new Promise((resolve, rejectPromise) => {
        const waiter = {
          resolve,
          reject: rejectPromise,
          timer: setTimeout(() => {
            waiters.delete(waiter);
            rejectPromise(new Error('Project sync flush timed out'));
          }, TIMEOUT),
        };
        waiters.add(waiter);
      });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(reconnect);
      clearTimeout(deadline);
      options.store.doc.off('update', localUpdate);
      detach();
      socket?.close();
      handshake = false;
      reject('Project sync was destroyed');
      // Cleanup may run during StrictMode's setup/cleanup probe. Retire this
      // instance without publishing a stale state into its replacement.
      current = {
        ...current,
        status: 'offline',
        error: undefined,
        pending: dirty || pending.size > 0,
      };
    },
  };
}
