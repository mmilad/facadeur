import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { connectProject } from '../src/domain/project/client';
import { createProjectServer } from '../../server/src/http';
import { openProject } from '../../server/src/project/index';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('live catalog editor integration', () => {
  it('adds documents in both editors without navigation, merges dependent edits, saves and catches up after restart', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'facadeur-catalog-editor-'));
    const directory = join(dir, 'documents');
    mkdirSync(directory);
    const page: DocumentFile = {
      version: 1,
      id: 'page',
      name: 'Page',
      kind: 'page',
      root: { id: 'root', type: 'frame', children: [] },
    };
    writeFileSync(join(directory, 'page.json'), JSON.stringify(page));
    writeFileSync(
      join(directory, 'project-template.json'),
      JSON.stringify({ ...page, id: 'project-template' }),
    );
    const options = { directory, stateDirectory: join(dir, 'state') };
    let project = openProject(options);
    let runtime = createProjectServer(project);
    await new Promise<void>((resolve) => runtime.server.listen(0, '127.0.0.1', resolve));
    const address = runtime.server.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    const base = `http://127.0.0.1:${address.port}`;
    const originalFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (url: string | URL | Request, init?: RequestInit) =>
      originalFetch(typeof url === 'string' && url.startsWith('/') ? `${base}${url}` : url, init),
    );
    vi.stubEnv('NEXT_PUBLIC_FACADEUR_SYNC_URL', `ws://127.0.0.1:${address.port}`);
    const adapters = [connectProject(project.snapshot()), connectProject(project.snapshot())];
    try {
      await expect
        .poll(() => adapters.map((adapter) => adapter.getStatus()))
        .toEqual(['Connected', 'Connected']);
      const first = adapters[0]!.session;
      const second = adapters[1]!.session;
      const previousStore = second.syncStores().find((store) => store.getDocument().id === 'page');
      second.selectNode('root');
      second.execute({ type: 'setProp', nodeId: 'root', prop: 'name', value: 'Local page name' });
      const localUndo = second.getSnapshot().canUndo;
      const card: DocumentFile = {
        version: 1,
        id: 'live-card',
        name: 'Live card',
        kind: 'component',
        root: { id: 'root', type: 'text', text: 'New card' },
      };
      // Exercise browser creation, including registration-echo history preservation.
      first.loadDocument(card);
      await expect
        .poll(() => second.getSnapshot().catalog.some((asset) => asset.id === card.id))
        .toBe(true);
      expect(second.getSnapshot().openId).toBe('page');
      expect(second.getSnapshot().selectedNodeId).toBe('root');
      expect(second.getSnapshot().canUndo).toBe(localUndo);
      expect(second.syncStores().find((store) => store.getDocument().id === 'page')).toBe(
        previousStore,
      );
      await expect
        .poll(() => project.snapshot().documents.find((doc) => doc.id === 'page')?.root.name)
        .toBe('Local page name');
      const edit = await originalFetch(`${base}/api/projects/default/documents/page/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision: project.getState('page').revision,
          command: {
            type: 'insert',
            parentId: 'root',
            node: { id: 'new-instance', type: 'instance', component: card.id },
          },
        }),
      });
      expect(edit.status).toBe(200);
      await expect
        .poll(() => second.getSnapshot().document.nodes['new-instance']?.type)
        .toBe('instance');
      second.undo();
      expect(second.getSnapshot().document.nodes['new-instance']).toBeDefined();
      second.openAsset(card.id);
      second.execute({
        type: 'setProp',
        nodeId: 'root',
        prop: 'text',
        value: 'Edited in second editor',
      });
      expect(await second.saveOpenDocument()).toBe(true);
      expect(JSON.parse(readFileSync(join(directory, 'live-card.json'), 'utf8')).root.text).toBe(
        'Edited in second editor',
      );
      await expect
        .poll(() => {
          const root = first.getSnapshot().document.nodes.root;
          return root?.type === 'text' ? root.text : undefined;
        })
        .toBe('Edited in second editor');
      await runtime.close();
      project.create({ ...card, id: 'while-offline', name: 'While offline', kind: 'atom' });
      project.destroy();
      project = openProject(options);
      runtime = createProjectServer(project);
      await new Promise<void>((resolve) =>
        runtime.server.listen(address.port, '127.0.0.1', resolve),
      );
      await expect
        .poll(() => second.getSnapshot().catalog.some((asset) => asset.id === 'while-offline'), {
          timeout: 5000,
        })
        .toBe(true);
      await expect
        .poll(() => adapters.map((adapter) => adapter.getStatus()))
        .toEqual(['Connected', 'Connected']);
      expect(second.getSnapshot().openId).toBe(card.id);
      expect(second.getSnapshot().notice?.tone).not.toBe('error');
    } finally {
      for (const adapter of adapters) adapter.destroy();
      await runtime.close();
      project.destroy();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
