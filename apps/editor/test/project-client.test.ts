import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toFlat, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createDocumentStore } from '@facadeur/store-yjs';
import * as Y from 'yjs';
import { connectProject, loadProject, type ProjectSnapshot } from '../src/domain/project/client.js';
import { createProjectSync, type ProjectSyncState } from '../src/domain/project/sync.js';
import { encodeBase64, decodeBase64 } from '../src/domain/project/encoding.js';
import * as files from '../src/domain/assets/files.js';
import { createProjectTransport } from '../src/domain/project/transport.js';

vi.mock('../src/domain/project/sync.js', () => ({ createProjectSync: vi.fn() }));
vi.mock('../src/domain/project/transport.js', () => ({ createProjectTransport: vi.fn() }));

type SyncOptions = Parameters<typeof createProjectSync>[0];
type SyncClient = ReturnType<typeof createProjectSync>;
const connections: {
  options: SyncOptions;
  client: SyncClient;
  emit: (patch: Partial<ProjectSyncState>) => void;
}[] = [];
const cleanups: (() => void)[] = [];
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  connections.length = 0;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.mocked(createProjectTransport).mockReturnValue({ socketFor: vi.fn(), destroy: vi.fn() });
  vi.mocked(createProjectSync).mockImplementation((options) => {
    let state: ProjectSyncState = {
      status: 'connecting',
      revision: 0,
      savedRevision: 0,
      pending: true,
    };
    const client = {
      state: () => ({ ...state }),
      flush: vi.fn(async () => state.revision),
      destroy: vi.fn(),
    };
    connections.push({
      options,
      client,
      emit(patch) {
        state = { ...state, ...patch };
        options.onState?.(client.state());
      },
    });
    options.onState?.(client.state());
    return client;
  });
});
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function project(): ProjectSnapshot {
  const document: DocumentFile = {
    version: 1,
    id: 'card',
    kind: 'component',
    name: 'Card',
    root: { id: 'root', type: 'text', text: 'Hello' },
  };
  const design = createProjectTemplateDocument();
  const states: ProjectSnapshot['states'] = {};
  for (const file of [document, design]) {
    const store = createDocumentStore(file);
    states[file.id] = {
      update: encodeBase64(Y.encodeStateAsUpdate(store.doc)),
      revision: 4,
      savedRevision: 4,
    };
    store.destroy();
  }
  return {
    id: 'default',
    documents: [document],
    design,
    sources: { card: 'card.json', [design.id]: 'project-template.json' },
    states,
  };
}
function connect(snapshot = project()) {
  const adapter = connectProject(snapshot);
  cleanups.push(() => adapter.destroy());
  return adapter;
}
function documentConnection(id = 'card') {
  const connection = connections.find(({ options }) => options.store.getDocument().id === id);
  if (!connection) throw new Error(`Missing sync connection for ${id}`);
  return connection;
}
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('project client', () => {
  it('loads validated project data with the supplied abort signal', async () => {
    const snapshot = project();
    fetchMock.mockResolvedValue(response(snapshot));
    const controller = new AbortController();
    const loaded = await loadProject(controller.signal);
    expect(loaded.documents.map((doc) => doc.id)).toEqual(['card']);
    expect(loaded.states).toEqual(snapshot.states);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/default',
      expect.objectContaining({ signal: expect.any(AbortSignal), cache: 'no-store' }),
    );
    const forwardedSignal = fetchMock.mock.calls[0]![1]!.signal!;
    expect(forwardedSignal.aborted).toBe(false);
    controller.abort();
    expect(forwardedSignal.aborted).toBe(true);
    expect(forwardedSignal.reason).toBe(controller.signal.reason);
  });
  it('rejects HTTP load failures and missing hydration states', async () => {
    fetchMock.mockResolvedValueOnce(response({ error: 'Project unavailable' }, 503));
    await expect(loadProject()).rejects.toThrow('Project unavailable');
    const snapshot = project();
    delete snapshot.states.card;
    fetchMock.mockResolvedValueOnce(response(snapshot));
    await expect(loadProject()).rejects.toThrow('Invalid project sync state');
  });
  it.each([
    { revision: -1, savedRevision: 0 },
    { revision: 4, savedRevision: -1 },
    { revision: 4, savedRevision: 1.5 },
    { revision: 4, savedRevision: '4' },
    { revision: 4, savedRevision: null },
    { revision: 4, savedRevision: undefined },
    { revision: 4, savedRevision: Number.MAX_SAFE_INTEGER + 1 },
    { revision: 4, savedRevision: 5 },
  ])('rejects invalid revision metadata %j', async (metadata) => {
    const snapshot = project();
    const states = { ...snapshot.states, card: { ...snapshot.states.card!, ...metadata } };
    fetchMock.mockResolvedValue(response({ ...snapshot, states }));
    await expect(loadProject()).rejects.toThrow('Invalid project sync state');
  });
  it('hydrates exact server history and preserves initially unsaved metadata', () => {
    const snapshot = project();
    snapshot.states.card!.savedRevision = 2;
    const adapter = connect(snapshot);
    expect(adapter.getStatus()).toBe('Connecting…');
    expect(adapter.session.getSnapshot().documentDirty).toBe(true);
    expect(adapter.session.getSnapshot().designDirty).toBe(false);
    expect(connections).toHaveLength(2);
    for (const { options } of connections) {
      const server = new Y.Doc();
      try {
        Y.applyUpdate(
          server,
          decodeBase64(snapshot.states[options.store.getDocument().id]!.update),
        );
        expect(Y.encodeStateVector(options.store.doc)).toEqual(Y.encodeStateVector(server));
        expect(Y.encodeStateAsUpdate(options.store.doc, Y.encodeStateVector(server))).toEqual(
          new Uint8Array([0, 0]),
        );
      } finally {
        server.destroy();
      }
      expect(options.url).toContain(
        `/sync?project=default&id=${encodeURIComponent(options.store.getDocument().id)}`,
      );
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('awaits flush before saving its revision and uses the exact returned document as the saved baseline', async () => {
    const snapshot = project();
    const adapter = connect(snapshot);
    const connection = documentConnection();
    const flush = deferred<number>();
    vi.mocked(connection.client.flush).mockReturnValue(flush.promise);
    const savedDocument = { ...snapshot.documents[0]!, name: 'Server snapshot' };
    fetchMock.mockResolvedValue(response({ document: savedDocument }));
    const save = adapter.session.saveOpenDocument();
    await Promise.resolve();
    expect(connection.client.flush).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
    flush.resolve(17);
    expect(await save).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/default/documents/card/save',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ revision: 17 }) }),
    );
    // A server snapshot that differs from the live document must not mark it clean.
    expect(adapter.session.getSnapshot().document.name).toBe('Card');
    expect(adapter.session.getSnapshot().documentDirty).toBe(true);
    const store = connection.options.store;
    const server = createDocumentStore(savedDocument);
    cleanups.push(() => server.destroy());
    // Changing live data to exactly the returned snapshot now matches the baseline.
    store.doc.transact(() => store.doc.getMap('meta').set('name', toFlat(savedDocument).name));
    expect(adapter.session.getSnapshot().documentDirty).toBe(false);
  });
  it.each(['flush', 'http', 'network'] as const)(
    'reports %s save failure without falling back to a download',
    async (failure) => {
      const snapshot = project();
      snapshot.states.card!.savedRevision = 2;
      const adapter = connect(snapshot);
      const download = vi.spyOn(files, 'saveJsonFile');
      if (failure === 'flush')
        vi.mocked(documentConnection().client.flush).mockRejectedValue(new Error('Offline flush'));
      if (failure === 'http')
        fetchMock.mockResolvedValue(response({ error: 'Save rejected' }, 409));
      if (failure === 'network') fetchMock.mockRejectedValue(new Error('Network failed'));
      expect(await adapter.session.saveOpenDocument()).toBe(false);
      expect(download).not.toHaveBeenCalled();
      expect(adapter.session.getSnapshot().documentDirty).toBe(true);
      expect(adapter.session.getSnapshot().notice).toEqual({
        tone: 'error',
        text:
          failure === 'flush'
            ? 'Offline flush'
            : failure === 'http'
              ? 'Save rejected'
              : 'Network failed',
      });
      if (failure === 'flush') expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('saves design through its own sync client', async () => {
    const snapshot = project();
    const adapter = connect(snapshot);
    vi.mocked(documentConnection(snapshot.design.id).client.flush).mockResolvedValue(9);
    fetchMock.mockResolvedValue(response({ document: snapshot.design }));
    expect(await adapter.session.saveDesign()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/default/documents/${encodeURIComponent(snapshot.design.id)}/save`,
      expect.objectContaining({ body: JSON.stringify({ revision: 9 }) }),
    );
    expect(documentConnection().client.flush).not.toHaveBeenCalled();
  });
  it('publishes connection states and saved revisions, and unsubscribes listeners', () => {
    const adapter = connect();
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);
    connections.forEach((connection) =>
      connection.emit({ status: 'synced', pending: false, revision: 4, savedRevision: 4 }),
    );
    expect(adapter.getStatus()).toBe('Connected');
    const connection = documentConnection();
    connection.emit({ pending: true, revision: 5 });
    expect(adapter.getStatus()).toBe('Syncing…');
    expect(adapter.session.getSnapshot().documentDirty).toBe(true);
    connection.emit({ pending: false, savedRevision: 5 });
    expect(adapter.session.getSnapshot().documentDirty).toBe(false);
    connection.emit({ status: 'offline' });
    expect(adapter.getStatus()).toBe('Offline — changes remain in this tab');
    connection.emit({ status: 'error', error: 'Invalid update' });
    expect(adapter.getStatus()).toBe('Sync error');
    expect(adapter.session.getSnapshot().notice).toEqual({ tone: 'error', text: 'Invalid update' });
    unsubscribe();
    listener.mockClear();
    connection.emit({ status: 'connecting', error: undefined });
    expect(listener).not.toHaveBeenCalled();
  });
  it('destroys all providers and the session and ignores callbacks after cleanup', () => {
    const adapter = connect();
    const listener = vi.fn();
    adapter.subscribe(listener);
    const sessionDestroy = vi.spyOn(adapter.session, 'destroy');
    adapter.destroy();
    expect(sessionDestroy).toHaveBeenCalledOnce();
    connections.forEach(({ client, emit }) => {
      expect(client.destroy).toHaveBeenCalledOnce();
      emit({ status: 'error', error: 'Late socket error' });
    });
    expect(listener).not.toHaveBeenCalled();
    expect(adapter.session.getSnapshot().notice).toBeNull();
  });
});
