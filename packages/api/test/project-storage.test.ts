import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import {
  initializeProjectFiles,
  readProjectFiles,
  saveProjectFile,
} from '../src/server/project/files.js';

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
    expect(firstSnapshot.documents).toEqual([card('First'), starter]);
    expect(secondSnapshot.documents).toEqual([card('Second'), starter]);

    const firstEdit = card('First edit');
    await Promise.all([
      saveProjectFile(
        firstEdit.id,
        {
          document: firstEdit,
          source: firstSnapshot.sources[firstEdit.id]!,
          expectedHash: firstSnapshot.hashes[firstEdit.id]!,
        },
        first,
      ),
      saveProjectFile(
        'new-card',
        {
          document: { ...card('Second edit'), id: 'new-card' },
          source: 'new-card.json',
          expectedHash: null,
        },
        second,
      ),
    ]);

    expect((await readProjectFiles(first)).documents).toEqual([firstEdit, starter]);
    expect((await readProjectFiles(second)).documents).toEqual([
      card('Second'),
      { ...card('Second edit'), id: 'new-card' },
      starter,
    ]);
    expect(await readFile(join(first.directory, 'card.json'), 'utf8')).toContain('First edit');
    expect(await readFile(join(second.directory, 'card.json'), 'utf8')).toContain('Second');
  });

  it('uses separate recovery data for each project directory', async () => {
    for (const [storage, label] of [
      [first, 'First draft'],
      [second, 'Second draft'],
    ] as const) {
      const draft = card(label);
      const recovery = join(storage.directory, '.facadeur', 'editor-recovery.json');
      await mkdir(join(storage.directory, '.facadeur'), { recursive: true });
      const sourceHash = hash(await readFile(join(storage.directory, 'card.json'), 'utf8'));
      await writeFile(
        recovery,
        JSON.stringify({
          documents: [draft],
          sources: { [draft.id]: 'card.json' },
          sourceHashes: { [draft.id]: sourceHash },
        }),
      );
    }
    expect((await readProjectFiles(first)).documents).toEqual([card('First draft'), starter]);
    expect((await readProjectFiles(second)).documents).toEqual([card('Second draft'), starter]);
  });

  it('seeds a valid editable document and preserves existing files on reinitialization', async () => {
    const snapshot = await readProjectFiles(first);
    expect(snapshot.design.id).toBe('project-template');
    expect(snapshot.documents).toContainEqual(starter);

    const customized = { ...starter, name: 'Keep this section' };
    await writeFile(join(first.directory, 'new-section.json'), JSON.stringify(customized));
    await initializeProjectFiles(first);
    expect((await readProjectFiles(first)).documents).toContainEqual(customized);
  });
});
