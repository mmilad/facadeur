import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { IMAGE_ATOM_UUID } from '../src/server/project/catalog-seed';
import {
  initializeProjectFiles,
  readProjectFiles,
  saveProjectFile,
} from '../src/server/project/files';

const card = (text: string): DocumentFile => ({
  version: 1,
  id: 'shared-card',
  name: 'Shared card',
  kind: 'atom',
  root: { id: 'root', type: 'text', text },
});
const starter: DocumentFile = {
  version: 1,
  id: 'new-section',
  name: 'New section',
  kind: 'section',
  root: {
    id: 'root',
    name: 'Frame',
    type: 'frame',
    children: [{ id: 'heading', type: 'text', text: 'Start building here' }],
  },
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
let root: string;
let first: { id: string; directory: string };
let second: { id: string; directory: string };

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'facadeur-project-storage-'));
  vi.stubEnv('FACADEUR_PROJECT_DIR', join(root, 'legacy-examples'));
  first = { id: 'project-one', directory: join(root, 'one') };
  second = { id: 'project-two', directory: join(root, 'two') };
  await initializeProjectFiles(first);
  await initializeProjectFiles(second);
  await writeFile(join(first.directory, 'card.json'), JSON.stringify(card('First')));
  await writeFile(join(second.directory, 'card.json'), JSON.stringify(card('Second')));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

describe('project storage isolation', () => {
  it('loads and saves documents with the same id independently', async () => {
    const firstSnapshot = await readProjectFiles(first);
    const secondSnapshot = await readProjectFiles(second);
    expect(firstSnapshot.id).toBe(first.id);
    expect(secondSnapshot.id).toBe(second.id);
    expect(firstSnapshot.catalog.atoms[IMAGE_ATOM_UUID]?.name).toBe('Image');
    expect(
      firstSnapshot.documents.filter(
        (document) => document.id === 'shared-card' || document.id === 'new-section',
      ),
    ).toEqual([card('First'), starter]);

    const firstEdit = card('First edit');
    await saveProjectFile(
      firstEdit.id,
      {
        document: firstEdit,
        source: firstSnapshot.sources[firstEdit.id]!,
        expectedHash: firstSnapshot.hashes[firstEdit.id]!,
      },
      first,
    );

    expect(
      (await readProjectFiles(first)).documents.find((document) => document.id === 'shared-card')
        ?.root,
    ).toEqual(firstEdit.root);
    expect(await readFile(join(first.directory, 'card.json'), 'utf8')).toContain('First edit');
    expect(await readFile(join(second.directory, 'card.json'), 'utf8')).toContain('Second');
  });

  it('seeds design, section starter, and v2 catalog on init', async () => {
    const snapshot = await readProjectFiles(first);
    expect(snapshot.design.id).toBe('project-template');
    expect(snapshot.documents).toContainEqual(starter);
    expect(snapshot.catalog.atoms[IMAGE_ATOM_UUID]).toBeTruthy();
    expect(snapshot.sources['catalog.json']).toBeUndefined();
  });

  it('materializes starter files when a managed project directory is missing on disk', async () => {
    const directory = join(root, 'missing-on-disk');
    const storage = { id: 'missing-on-disk', directory };
    const snapshot = await readProjectFiles(storage);
    expect(snapshot.id).toBe('missing-on-disk');
    expect(snapshot.design.id).toBe('project-template');
    expect(snapshot.catalog.atoms[IMAGE_ATOM_UUID]?.name).toBe('Image');
  });
});
