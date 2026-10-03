import { describe, expect, it, vi } from 'vitest';
import { type DocumentFile, validateCatalog } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import * as Y from 'yjs';
import { createEditorSession } from '../src/domain/session';

const page: DocumentFile = {
  version: 1,
  id: 'local',
  name: 'Local',
  kind: 'page',
  root: { id: 'root', type: 'frame', tag: 'div', children: [] },
};
const component: DocumentFile = {
  version: 1,
  id: 'remote-component',
  name: 'Remote component',
  kind: 'component',
  root: { id: 'root', type: 'frame', tag: 'div', children: [] },
};
const section: DocumentFile = {
  version: 1,
  id: 'remote-section',
  name: 'Remote section',
  kind: 'section',
  root: {
    id: 'root',
    type: 'frame',
    tag: 'div',
    children: [{ id: 'instance', type: 'instance', component: component.id }],
  },
};
const remotePage: DocumentFile = {
  version: 1,
  id: 'remote-page',
  name: 'Remote page',
  kind: 'page',
  root: {
    id: 'root',
    type: 'frame',
    tag: 'div',
    children: [{ id: 'instance', type: 'instance', component: section.id }],
  },
};

function setup() {
  const session = createEditorSession({
    documents: [page],
    design: createProjectTemplateDocument(),
  });
  const documents = validateCatalog([remotePage, section, component]);
  const servers = documents.map((document) => createDocumentStore(document));
  const entries = documents.map((document, index) => ({
    document,
    update: Y.encodeStateAsUpdate(servers[index]!.doc),
    source: `${document.id}-source.json`,
    saved: index !== 2,
  }));
  return {
    session,
    servers,
    entries,
    destroy() {
      session.destroy();
      servers.forEach((store) => store.destroy());
    },
  };
}

describe('remote session catalog', () => {
  it('preserves drill navigation and pending Redo when adding another document', () => {
    const fixture = setup();
    const { session, entries } = fixture;
    const extra: DocumentFile = { ...component, id: 'extra', name: 'Extra' };
    const server = createDocumentStore(extra);
    try {
      session.acceptProjectDocuments(entries);
      session.openAsset(remotePage.id);
      session.selectNode('instance');
      session.drillToMaster(section.id);
      session.execute({ type: 'setProp', nodeId: 'root', prop: 'name', value: 'Redo me' });
      session.undo();
      const before = session.getSnapshot();
      expect(before.drillParents).toHaveLength(1);
      expect(before.canRedo).toBe(true);
      session.acceptProjectDocuments([
        {
          document: extra,
          update: Y.encodeStateAsUpdate(server.doc),
          source: 'extra.json',
          saved: true,
        },
      ]);
      const after = session.getSnapshot();
      expect(after.drillParents).toEqual(before.drillParents);
      expect(after.openId).toBe(before.openId);
      expect(after.selectedNodeId).toBe(before.selectedNodeId);
      expect(after.canRedo).toBe(true);
      session.redo();
      expect(session.getSnapshot().document.nodes.root?.name).toBe('Redo me');
    } finally {
      server.destroy();
      fixture.destroy();
    }
  });
  it('hydrates actual forward references together, publishes once and allows local editing', () => {
    const fixture = setup();
    const { session, entries, servers } = fixture;
    try {
      const before = session.getSnapshot();
      const listener = vi.fn();
      session.subscribe(listener);
      session.acceptProjectDocuments(entries);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(session.getSnapshot().generation).toBe(before.generation + 1);
      expect(session.getSnapshot().canUndo).toBe(false);
      expect(session.boardDocuments().map((document) => document.id)).toEqual([
        page.id,
        remotePage.id,
        section.id,
        component.id,
      ]);
      for (const [index, entry] of entries.entries()) {
        const store = session
          .syncStores()
          .find((store) => store.getDocument().id === entry.document.id)!;
        expect(store.getDocument()).toEqual(servers[index]!.getDocument());
        expect(Y.encodeStateVector(store.doc)).toEqual(Y.encodeStateVector(servers[index]!.doc));
        expect(store.canUndo()).toBe(false);
        expect(session.filenameFor(entry.document.id)).toBe(entry.source);
        session.openAsset(entry.document.id);
        expect(session.getSnapshot().documentDirty).toBe(!entry.saved);
      }
      session.execute({ type: 'setProp', nodeId: 'root', prop: 'name', value: 'Edited remote' });
      expect(session.getSnapshot().document.nodes.root?.name).toBe('Edited remote');
      expect(session.getSnapshot().canUndo).toBe(true);
      session.undo();
      expect(session.getSnapshot().document.nodes.root?.name).toBeUndefined();
    } finally {
      fixture.destroy();
    }
  });

  it('preserves existing history, unsent bytes, saved metadata and interaction state', () => {
    const fixture = setup();
    const { session, entries } = fixture;
    try {
      session.execute({ type: 'setProp', nodeId: 'root', prop: 'name', value: 'Unsent local' });
      session.selectNode('root');
      session.setFocusViewport('wide');
      session.setEditTarget('base');
      session.setTool('frame');
      session.beginDrag({ kind: 'node', nodeId: 'root' });
      const before = session.getSnapshot();
      const stores = session.syncStores();
      const bytes = stores.map((store) => Y.encodeStateAsUpdate(store.doc));
      const wrongUpdate = new Uint8Array([255]);
      session.acceptProjectDocuments([
        { document: page, update: wrongUpdate, source: 'replacement.json', saved: true },
        ...entries,
      ]);
      for (const [index, store] of stores.entries()) {
        expect(session.syncStores()).toContain(store);
        expect(Y.encodeStateAsUpdate(store.doc)).toEqual(bytes[index]);
      }
      const after = session.getSnapshot();
      for (const key of [
        'openId',
        'workspace',
        'selectedNodeId',
        'selectedRenderId',
        'focusViewportId',
        'selectedViewportId',
        'editTarget',
        'tool',
        'drag',
        'drillParents',
        'canUndo',
        'canRedo',
        'documentDirty',
      ] as const) {
        expect(after[key]).toEqual(before[key]);
      }
      expect(session.filenameFor(page.id)).toBe('local.json');
      session.undo();
      expect(session.getSnapshot().document.nodes.root?.name).toBeUndefined();
      session.redo();
      expect(session.getSnapshot().document.nodes.root?.name).toBe('Unsent local');
      const listener = vi.fn();
      session.subscribe(listener);
      session.acceptProjectDocuments(entries);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      fixture.destroy();
    }
  });

  it('throws validation and hydration errors without partially registering a batch', () => {
    const fixture = setup();
    const { session, entries } = fixture;
    try {
      const before = session.getSnapshot();
      expect(() => session.acceptProjectDocuments([entries[0]!])).toThrow();
      expect(() => session.acceptProjectDocuments([...entries, entries[2]!])).toThrow();
      expect(() =>
        session.acceptProjectDocuments(
          entries.map((entry, index) =>
            index === 2 ? { ...entry, update: new Uint8Array([255]) } : entry,
          ),
        ),
      ).toThrow();
      expect(session.getSnapshot()).toBe(before);
      expect(session.boardDocuments().map((document) => document.id)).toEqual([page.id]);
      session.acceptProjectDocuments(entries);
      expect(session.getSnapshot().catalog).toHaveLength(4);
    } finally {
      fixture.destroy();
    }
  });
});
