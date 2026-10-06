import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { readProjectFiles, saveProjectFile } from '@facadeur/api/server';
import { connectProject } from '../src/domain/project/client.js';

const card: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'atom',
  root: { id: 'root', type: 'text', text: 'Initial' },
};
let workspace: string;
let directory: string;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'facadeur-json-tests-'));
  directory = join(workspace, 'examples');
  await mkdir(directory);
  vi.stubEnv('FACADEUR_PROJECT_DIR', directory);
  await writeFile(
    join(directory, 'project-template.json'),
    JSON.stringify({ ...createProjectTemplateDocument(), schemaCatalog: { schemas: [] } }),
  );
  await writeFile(join(directory, 'actual-card.json'), JSON.stringify(card));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await rm(workspace, { recursive: true, force: true });
});

describe('project JSON persistence', () => {
  it('saves a controller edit through the client and restores it after restarting the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options: RequestInit) => {
        const body = JSON.parse(options.body as string);
        return Response.json(await saveProjectFile(body.document.id, body));
      }),
    );
    const connection = connectProject(await readProjectFiles());
    try {
      const { session } = connection;
      session.project.styles.document(card.id).setStyleBlock({ declarations: { opacity: '0.5' } });
      expect(session.getSnapshot().documentDirty).toBe(true);
      expect(await session.saveOpenDocument()).toBe(true);
      session.undo();
      expect(session.project.styles.document(card.id).styles).toBeUndefined();
      expect(session.getSnapshot().documentDirty).toBe(true);
    } finally {
      connection.destroy();
    }
    const restarted = connectProject(await readProjectFiles());
    try {
      expect(restarted.session.project.styles.document(card.id).styles).toEqual({
        declarations: { opacity: '0.5' },
      });
      expect(restarted.session.getSnapshot().documentDirty).toBe(false);
      expect(restarted.session.boardStores()[0]!.canUndo()).toBe(false);
    } finally {
      restarted.destroy();
    }
  });
  it('reads source filenames and hashes and round-trips saves without changing other documents', async () => {
    const project = await readProjectFiles();
    expect(project.sources.card).toBe('actual-card.json');
    expect(project.hashes.card).toBe(hash(JSON.stringify(card)));
    const designBefore = await readFile(join(directory, 'project-template.json'), 'utf8');
    const edited = { ...card, root: { id: 'root', type: 'text' as const, text: 'Saved' } };
    const saved = await saveProjectFile(card.id, {
      document: edited,
      source: project.sources.card!,
      expectedHash: project.hashes.card!,
    });
    const reloaded = await readProjectFiles();
    expect(reloaded.documents).toEqual([edited]);
    expect(reloaded.hashes.card).toBe(saved.hash);
    expect(await readFile(join(directory, 'project-template.json'), 'utf8')).toBe(designBefore);
    await expect(
      saveProjectFile(card.id, {
        document: card,
        source: saved.source,
        expectedHash: project.hashes.card!,
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect((await readProjectFiles()).documents).toEqual([edited]);
    expect((await readdir(directory)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });

  it('creates a new document with a null source hash and rejects overwriting an existing source', async () => {
    const added = { ...card, id: 'new-card' };
    await expect(
      saveProjectFile(added.id, {
        document: added,
        source: 'actual-card.json',
        expectedHash: null,
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
    const saved = await saveProjectFile(added.id, {
      document: added,
      source: 'new-card.json',
      expectedHash: null,
    });
    const reloaded = await readProjectFiles();
    expect(reloaded.documents).toContainEqual(added);
    expect(reloaded.sources[added.id]).toBe(saved.source);
    expect(reloaded.hashes[added.id]).toBe(saved.hash);
  });

  it('rejects invalid catalog edits and source remapping before writing', async () => {
    const project = await readProjectFiles();
    const body = { document: card, source: 'actual-card.json', expectedHash: project.hashes.card! };
    await expect(
      saveProjectFile(card.id, { ...body, source: 'renamed.json' }),
    ).rejects.toMatchObject({ code: 'conflict' });
    await expect(
      saveProjectFile(card.id, {
        ...body,
        document: {
          ...card,
          kind: 'component',
          root: {
            id: 'root',
            type: 'frame',
            children: [{ id: 'missing', type: 'instance', component: 'missing' }],
          },
        },
      }),
    ).rejects.toThrow('Unknown component');
    await expect(
      saveProjectFile('new-card', {
        document: { ...card, id: 'new-card' },
        source: '../outside.json',
        expectedHash: null,
      }),
    ).rejects.toMatchObject({ code: 'invalid-input' });
    expect(await readFile(join(directory, 'actual-card.json'), 'utf8')).toBe(JSON.stringify(card));
    expect(await readdir(directory)).toEqual(['actual-card.json', 'project-template.json']);
  });

  it('loads recovered drafts and retires only the saved draft while preserving unsaved new documents', async () => {
    const recoveryDirectory = join(workspace, '.facadeur');
    await mkdir(recoveryDirectory);
    const recovered = { ...card, name: 'Recovered' };
    const added = { ...card, id: 'new-card' };
    await writeFile(
      join(recoveryDirectory, 'editor-recovery.json'),
      JSON.stringify({
        documents: [recovered, added],
        sources: { card: 'actual-card.json', 'new-card': 'new-card.json' },
        sourceHashes: { card: hash(JSON.stringify(card)), 'new-card': null },
      }),
    );
    const project = await readProjectFiles();
    expect(project.documents).toContainEqual(recovered);
    expect(project.unsavedDocumentIds).toEqual(['card', 'new-card']);
    expect(project.hashes['new-card']).toBeNull();
    await saveProjectFile(card.id, {
      document: recovered,
      source: 'actual-card.json',
      expectedHash: project.hashes.card!,
    });
    const reloaded = await readProjectFiles();
    expect(reloaded.unsavedDocumentIds).toEqual(['new-card']);
    expect(reloaded.documents).toContainEqual(recovered);
    expect(reloaded.documents).toContainEqual(added);
    const recovery = JSON.parse(
      await readFile(join(recoveryDirectory, 'editor-recovery.json'), 'utf8'),
    );
    expect(recovery.documents).toEqual([added]);
    expect(recovery.sources).toEqual({ 'new-card': 'new-card.json' });
    expect(recovery.sourceHashes).toEqual({ 'new-card': null });
  });

  it('rejects recovery after external source changes without discarding the draft', async () => {
    const recoveryDirectory = join(workspace, '.facadeur');
    await mkdir(recoveryDirectory);
    const draft = JSON.stringify({
      documents: [{ ...card, name: 'Recovered' }],
      sources: { card: 'actual-card.json' },
      sourceHashes: { card: hash(JSON.stringify(card)) },
    });
    await writeFile(join(recoveryDirectory, 'editor-recovery.json'), draft);
    await writeFile(
      join(directory, 'actual-card.json'),
      JSON.stringify({ ...card, name: 'External edit' }),
    );
    await expect(readProjectFiles()).rejects.toMatchObject({ code: 'conflict' });
    expect(await readFile(join(recoveryDirectory, 'editor-recovery.json'), 'utf8')).toBe(draft);
  });
});
