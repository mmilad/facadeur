import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePreviewData, validateDocumentFile } from '@facadeur/core';
import { connectProject } from '../src/domain/project/client';
import { createProjectServer } from '../../server/src/http';
import { openProject } from '../../server/src/project/index';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Product Card server/editor workflow', () => {
  it('shares API previews, isolates local Undo, saves JSON and restores both editors after restart', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'facadeur-product-card-'));
    const directory = join(dir, 'documents');
    mkdirSync(directory);
    for (const filename of ['product-card.json', 'button.json', 'project-template.json']) {
      copyFileSync(resolve('examples', filename), join(directory, filename));
    }
    const sourcePath = join(directory, 'product-card.json');
    const original = validateDocumentFile(JSON.parse(readFileSync(sourcePath, 'utf8')));
    expect(original.id).toBe('product-card');
    expect(original.fields?.map((field) => field.name)).toEqual([
      'title',
      'price',
      'imageSrc',
      'imageAlt',
      'buttonLabel',
    ]);
    const options = { directory, stateDirectory: join(dir, 'state') };
    let project = openProject(options);
    let runtime = createProjectServer(project);
    await new Promise<void>((done) => runtime.server.listen(0, '127.0.0.1', done));
    const address = runtime.server.address();
    if (!address || typeof address === 'string') throw new Error('No server address');
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
      for (const adapter of adapters) adapter.session.openAsset(original.id);
      expect(adapters.map((adapter) => adapter.session.getSnapshot().openId)).toEqual([
        original.id,
        original.id,
      ]);
      expect(resolvePreviewData(second.getSnapshot().document)).toEqual(
        resolvePreviewData(original),
      );
      first.execute({ type: 'setProp', nodeId: 'root', prop: 'name', value: 'Local card name' });
      expect(first.getSnapshot().canUndo).toBe(true);
      await expect
        .poll(() => project.snapshot().documents.find((doc) => doc.id === original.id)?.root.name)
        .toBe('Local card name');
      await expect
        .poll(() => second.getSnapshot().document.nodes.root?.name)
        .toBe('Local card name');

      const previewData = {
        ...original.previewData,
        fields: {
          ...original.previewData?.fields,
          title: 'Shared API product title',
          price: '€29.00',
          buttonLabel: 'Buy this mug',
        },
      };
      const edit = await originalFetch(`${base}/api/projects/default/documents/product-card/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision: project.getState(original.id).revision,
          command: { type: 'setPreviewData', previewData },
        }),
      });
      expect(edit.status).toBe(200);
      await expect
        .poll(() => adapters.map((adapter) => adapter.session.getSnapshot().document.previewData))
        .toEqual([previewData, previewData]);
      for (const adapter of adapters) {
        expect(resolvePreviewData(adapter.session.getSnapshot().document)).toEqual(
          previewData.fields,
        );
      }
      expect(second.getSnapshot().canUndo).toBe(false);

      first.undo();
      expect(first.getSnapshot().document.nodes.root?.name).toBe(original.root.name);
      expect(first.getSnapshot().document.previewData).toEqual(previewData);
      expect(first.getSnapshot().canUndo).toBe(false);
      await expect
        .poll(() => second.getSnapshot().document.nodes.root?.name)
        .toBe(original.root.name);
      expect(second.getSnapshot().document.previewData).toEqual(previewData);

      expect(await first.saveOpenDocument()).toBe(true);
      const saved = validateDocumentFile(JSON.parse(readFileSync(sourcePath, 'utf8')));
      expect(saved).toEqual({ ...original, previewData });
      expect(project.getState(original.id).savedRevision).toBe(
        project.getState(original.id).revision,
      );

      await runtime.close();
      await expect
        .poll(() => adapters.every((adapter) => adapter.getStatus().startsWith('Offline')))
        .toBe(true);
      project.destroy();
      project = openProject(options);
      expect(project.snapshot().documents.find((doc) => doc.id === original.id)).toEqual(saved);
      runtime = createProjectServer(project);
      await new Promise<void>((done) => runtime.server.listen(address.port, '127.0.0.1', done));
      await expect
        .poll(() => adapters.map((adapter) => adapter.getStatus()), { timeout: 5000 })
        .toEqual(['Connected', 'Connected']);
      for (const adapter of adapters) {
        const snapshot = adapter.session.getSnapshot();
        expect(snapshot.openId).toBe(original.id);
        expect(snapshot.document.previewData).toEqual(previewData);
        expect(resolvePreviewData(snapshot.document)).toEqual(previewData.fields);
        expect(snapshot.document.nodes.root?.name).toBe(original.root.name);
        expect(snapshot.notice?.tone).not.toBe('error');
      }
    } finally {
      for (const adapter of adapters) adapter.destroy();
      await runtime.close();
      project.destroy();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
