import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createDocumentStore } from '@facadeur/store-yjs';
import { type DocumentFile } from '@facadeur/core';
import { createProjectSync, type ProjectSyncSocket } from '../../editor/src/domain/project/sync';
import { createProjectServer } from '../src/http';
import { openProject } from '../src/project/index';

const temporary: string[] = [];
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'facadeur-http-'));
  temporary.push(dir);
  const directory = join(dir, 'documents');
  mkdirSync(directory);
  const document: DocumentFile = {
    version: 1,
    id: 'card',
    name: 'Card',
    kind: 'component',
    root: { id: 'root', type: 'text', text: 'Original' },
  };
  const design: DocumentFile = {
    version: 1,
    id: 'project-template',
    name: 'Design',
    kind: 'page',
    root: { id: 'root', type: 'frame', children: [] },
  };
  writeFileSync(join(directory, 'card.json'), JSON.stringify(document));
  writeFileSync(join(directory, 'project-template.json'), JSON.stringify(design));
  return { directory, stateDirectory: join(dir, 'state'), document };
}
async function listen(project: ReturnType<typeof openProject>) {
  const runtime = createProjectServer(project);
  await new Promise<void>((resolve) => runtime.server.listen(0, '127.0.0.1', resolve));
  const address = runtime.server.address();
  if (!address || typeof address === 'string') throw new Error('No listener');
  return {
    ...runtime,
    base: `http://127.0.0.1:${address.port}`,
    socket: `ws://127.0.0.1:${address.port}/sync?project=default&id=card`,
  };
}
async function post(base: string, action: string, body: unknown) {
  return fetch(`${base}/api/projects/default/documents/card/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('project HTTP and live Yjs channel', () => {
  it('syncs local edits, API edits and Undo to two clients; saves JSON and recovers on restart', async () => {
    const options = fixture();
    let project = openProject(options);
    const runtime = await listen(project);
    const state = project.getState('card');
    const stores = [0, 1].map(() =>
      createDocumentStore(options.document, {}, { update: Buffer.from(state.update, 'base64') }),
    );
    const clients = stores.map((store) =>
      createProjectSync({
        store,
        url: runtime.socket,
        socketFactory: (url) => new WebSocket(url) as unknown as ProjectSyncSocket,
      }),
    );
    try {
      await Promise.all(clients.map((client) => client.flush()));
      stores[0]!.execute({ type: 'setProp', nodeId: 'root', prop: 'text', value: 'Local edit' });
      await clients[0]!.flush();
      await expect
        .poll(() => {
          const node = stores[1]!.getNode('root');
          return node?.type === 'text' ? node.text : undefined;
        })
        .toBe('Local edit');
      const revision = project.getState('card').revision;
      const edit = await post(runtime.base, 'edit', {
        revision,
        command: { type: 'setProp', nodeId: 'root', prop: 'name', value: 'API name' },
      });
      expect(edit.status).toBe(200);
      await expect.poll(() => stores[0]!.getNode('root')?.name).toBe('API name');
      expect(stores[1]!.canUndo()).toBe(false);
      stores[0]!.undo();
      await clients[0]!.flush();
      await expect
        .poll(() => {
          const node = stores[1]!.getNode('root');
          return node?.type === 'text' ? node.text : undefined;
        })
        .toBe('Original');
      expect(stores[0]!.getNode('root')?.name).toBe('API name');
      const save = await post(runtime.base, 'save', {
        revision: project.getState('card').revision,
      });
      expect(save.status).toBe(200);
      expect(JSON.parse(readFileSync(join(options.directory, 'card.json'), 'utf8')).root.name).toBe(
        'API name',
      );
      expect((await post(runtime.base, 'save', { revision: 0 })).status).toBe(409);
      await post(runtime.base, 'edit', {
        revision: project.getState('card').revision,
        command: { type: 'setProp', nodeId: 'root', prop: 'text', value: 'Durable unsaved edit' },
      });
    } finally {
      for (const client of clients) client.destroy();
      for (const store of stores) store.destroy();
      await runtime.close();
      project.destroy();
    }
    project = openProject(options);
    try {
      expect(project.snapshot().documents[0]!.root).toMatchObject({
        text: 'Durable unsaved edit',
        name: 'API name',
      });
      expect(project.getState('card').revision).toBeGreaterThan(
        project.getState('card').savedRevision,
      );
    } finally {
      project.destroy();
    }
  });

  it('rejects cross-origin writes, malformed commands, stale revisions and external source conflicts', async () => {
    const options = fixture();
    const project = openProject(options);
    const runtime = await listen(project);
    try {
      const denied = await fetch(`${runtime.base}/api/projects/default`, {
        headers: { Origin: 'https://unrelated.example' },
      });
      expect(denied.status).toBe(403);
      const rebound = await new Promise<number | undefined>((resolve, reject) => {
        const request = httpRequest(
          `${runtime.base}/health`,
          { headers: { Host: 'unrelated.example' } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        );
        request.on('error', reject);
        request.end();
      });
      expect(rebound).toBe(403);
      expect(
        (await post(runtime.base, 'edit', { revision: 0, command: { type: 'invalid' } })).status,
      ).toBe(400);
      expect(
        (
          await post(runtime.base, 'edit', {
            revision: 99,
            command: { type: 'setProp', nodeId: 'root', prop: 'text', value: 'Rejected' },
          })
        ).status,
      ).toBe(409);
      expect(project.getState('card').revision).toBe(0);
      writeFileSync(
        join(options.directory, 'card.json'),
        JSON.stringify({ ...options.document, name: 'External edit' }),
      );
      expect((await post(runtime.base, 'save', { revision: 0 })).status).toBe(409);
      expect(JSON.parse(readFileSync(join(options.directory, 'card.json'), 'utf8')).name).toBe(
        'External edit',
      );
    } finally {
      await runtime.close();
      project.destroy();
    }
  });
});
