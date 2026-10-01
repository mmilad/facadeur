import {
  toFlat,
  toNested,
  validateCatalog,
  validateDocumentFile,
  type DocumentFile,
  type FlatDocument,
} from '@facadeur/core';
import type { YjsDocumentStore } from '@facadeur/store-yjs';
import * as Y from 'yjs';
import { createEditorSession } from '../session.js';
import { createProjectSync } from './sync.js';
import { decodeBase64, encodeBase64 } from './encoding.js';
import { createProjectTransport } from './transport.js';
import type { ProjectSnapshot, ProjectState } from './types.js';
export type { ProjectSnapshot } from './types.js';

export async function loadProject(signal?: AbortSignal): Promise<ProjectSnapshot> {
  const project = await request<ProjectSnapshot>('/api/projects/default', { signal });
  return validateProject(project);
}

function validateProject(project: ProjectSnapshot): ProjectSnapshot {
  if (!project || project.id !== 'default' || !project.sources || !project.states)
    throw new Error('Invalid project catalog');
  project.documents = validateCatalog(project.documents);
  project.design = validateDocumentFile(project.design);
  for (const doc of [project.design, ...project.documents]) {
    const state = project.states[doc.id];
    if (
      !state ||
      typeof state.update !== 'string' ||
      !Number.isSafeInteger(state.revision) ||
      state.revision < 0 ||
      !Number.isSafeInteger(state.savedRevision) ||
      state.savedRevision < 0 ||
      state.savedRevision > state.revision
    )
      throw new Error('Invalid project sync state');
    if (typeof project.sources[doc.id] !== 'string') throw new Error('Missing project source');
  }
  return project;
}

export function connectProject(project: ProjectSnapshot) {
  const clients = new Map<YjsDocumentStore, ReturnType<typeof createProjectSync>>();
  const registrations = new Map<YjsDocumentStore, Promise<void>>();
  const failedRegistrations = new Set<YjsDocumentStore>();
  const known = new Set(Object.keys(project.states));
  const listeners = new Set<() => void>();
  let destroyed = false;
  let reconciling = false;
  let status = 'Connecting…';
  const session = createEditorSession({
    documents: project.documents,
    design: project.design,
    sources: project.sources,
    updates: Object.fromEntries(
      Object.entries(project.states).map(([id, state]) => [id, decodeBase64(state.update)]),
    ),
    saveDocument: async (id): Promise<FlatDocument> => {
      const store = session.syncStores().find((store) => store.getDocument().id === id);
      if (!store) throw new Error(`Unknown document ${id}`);
      await registrations.get(store);
      const client = clients.get(store);
      if (!client) throw new Error('Document is not connected to the project');
      const revision = await client.flush();
      const saved = await request<{ document: DocumentFile }>(
        `/api/projects/default/documents/${encodeURIComponent(id)}/save`,
        {
          method: 'POST',
          body: JSON.stringify({ revision }),
        },
      );
      return toFlat(validateDocumentFile(saved.document));
    },
  });
  const originalLoad = session.loadDocument;
  session.loadDocument = (file, handle) => {
    if (session.syncStores().some((store) => store.getDocument().id === file.id)) {
      session.setNotice(
        'This document already exists in the project. Use its editor or the Edit API to change it.',
        'error',
      );
      return;
    }
    originalLoad(file, handle);
  };
  const socketBase = process.env.NEXT_PUBLIC_FACADEUR_SYNC_URL ?? 'ws://127.0.0.1:3002';
  const transport = createProjectTransport({
    url: `${socketBase}/sync?project=default`,
    onCatalog: (incoming) => {
      if (destroyed) return;
      const catalog = validateProject(incoming);
      if (catalog.design.id !== project.design.id)
        throw new Error('Project design identity changed');
      // Mark server identities before publishing the session, avoiding registration echoes.
      for (const document of catalog.documents) known.add(document.id);
      session.acceptProjectDocuments(
        catalog.documents.map((document) => ({
          document,
          source: catalog.sources[document.id]!,
          update: decodeBase64(catalog.states[document.id]!.update),
          saved:
            catalog.states[document.id]!.revision === catalog.states[document.id]!.savedRevision,
        })),
      );
      reconcile();
    },
    onError: (message) => {
      if (!destroyed) session.setNotice(message, 'error');
    },
  });
  function publishStatus() {
    if (destroyed) return;
    const states = [...clients.values()].map((client) => client.state());
    const next =
      failedRegistrations.size || states.some((state) => state.status === 'error')
        ? 'Sync error'
        : states.some((state) => state.status === 'offline')
          ? 'Offline — changes remain in this tab'
          : registrations.size || states.some((state) => state.status === 'connecting')
            ? 'Connecting…'
            : states.some((state) => state.pending)
              ? 'Syncing…'
              : 'Connected';
    if (status === next) return;
    status = next;
    for (const listener of listeners) listener();
  }
  function connect(store: YjsDocumentStore) {
    const id = store.getDocument().id;
    let initializing = true;
    const client = createProjectSync({
      store,
      url: `${socketBase}/sync?project=default&id=${encodeURIComponent(id)}`,
      socketFactory: () => transport.socketFor(id),
      onState: (state) => {
        if (destroyed || initializing) return;
        if (state.status === 'synced')
          session.markProjectSaved(id, !state.pending && state.revision === state.savedRevision);
        if (state.error) session.setNotice(state.error, 'error');
        publishStatus();
      },
    });
    clients.set(store, client);
    initializing = false;
  }
  function reconcile() {
    if (destroyed || reconciling) return;
    reconciling = true;
    try {
      const stores = new Set(session.syncStores());
      for (const [store, client] of clients) {
        if (!stores.has(store)) {
          client.destroy();
          clients.delete(store);
        }
      }
      for (const store of stores) {
        if (clients.has(store) || registrations.has(store) || failedRegistrations.has(store))
          continue;
        const id = store.getDocument().id;
        if (known.has(id)) {
          connect(store);
          continue;
        }
        const registering = request<ProjectState>('/api/projects/default/documents', {
          method: 'POST',
          body: JSON.stringify({
            document: toNested(store.getDocument()),
            update: encodeBase64(Y.encodeStateAsUpdate(store.doc)),
          }),
        })
          .then(() => {
            if (destroyed) return;
            known.add(id);
            connect(store);
          })
          .catch((error: unknown) => {
            failedRegistrations.add(store);
            if (!destroyed)
              session.setNotice(
                error instanceof Error ? error.message : 'Could not add document',
                'error',
              );
            throw error;
          })
          .finally(() => {
            registrations.delete(store);
            publishStatus();
          });
        registrations.set(store, registering);
        void registering.catch(() => {});
      }
      publishStatus();
    } finally {
      reconciling = false;
    }
  }
  for (const store of session.syncStores()) {
    const initial = project.states[store.getDocument().id];
    if (initial?.revision !== initial?.savedRevision)
      session.markProjectSaved(store.getDocument().id, false);
  }
  const unsubscribe = session.subscribe(reconcile);
  reconcile();
  return {
    session,
    getStatus: () => status,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      destroyed = true;
      unsubscribe();
      for (const client of clients.values()) client.destroy();
      transport.destroy();
      clients.clear();
      listeners.clear();
      session.destroy();
    },
  };
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Project request failed (${response.status})`);
  return result as T;
}
