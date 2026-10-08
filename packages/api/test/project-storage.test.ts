import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
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
  it('upgrades older starter catalogs once while preserving edits and custom groups', async () => {
    for (const id of ['content-card', 'fullbleed-teaser']) {
      await unlink(join(first.directory, `${id}.json`));
    }
    const imageAtom = JSON.parse(
      await readFile(join(first.directory, 'image.json'), 'utf8'),
    ) as DocumentFile;
    delete imageAtom.group;
    imageAtom.name = 'Edited image';
    await writeFile(join(first.directory, 'image.json'), JSON.stringify(imageAtom));
    const button = JSON.parse(
      await readFile(join(first.directory, 'button.json'), 'utf8'),
    ) as DocumentFile;
    button.group = 'My actions';
    await writeFile(join(first.directory, 'button.json'), JSON.stringify(button));
    const snapshot = await readProjectFiles(first);
    expect(snapshot.documents.find((document) => document.id === imageAtom.id)).toEqual(imageAtom);
    expect(snapshot.documents.find((document) => document.id === button.id)).toEqual(button);
    expect(
      snapshot.documents.filter(
        (document) => document.group === 'content' && document.kind === 'atom',
      ),
    ).toHaveLength(2);
    await unlink(join(first.directory, 'text-body.json'));
    expect(
      (await readProjectFiles(first)).documents.some((document) => document.id === 'text-body'),
    ).toBe(false);
  });
  it('loads and saves documents with the same id independently', async () => {
    const firstSnapshot = await readProjectFiles(first);
    const secondSnapshot = await readProjectFiles(second);
    expect(firstSnapshot.id).toBe(first.id);
    expect(secondSnapshot.id).toBe(second.id);
    expect(
      firstSnapshot.documents.filter(
        (document) => document.id === 'shared-card' || document.id === 'new-section',
      ),
    ).toEqual([card('First'), starter]);
    expect(
      secondSnapshot.documents.filter(
        (document) => document.id === 'shared-card' || document.id === 'new-section',
      ),
    ).toEqual([card('Second'), starter]);

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

    expect(
      (await readProjectFiles(first)).documents.filter(
        (document) =>
          document.id === 'shared-card' ||
          document.id === 'new-section' ||
          document.id === 'new-card',
      ),
    ).toEqual([firstEdit, starter]);
    expect(
      (await readProjectFiles(second)).documents.filter(
        (document) =>
          document.id === 'shared-card' ||
          document.id === 'new-section' ||
          document.id === 'new-card',
      ),
    ).toEqual([card('Second'), { ...card('Second edit'), id: 'new-card' }, starter]);
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
    expect(
      (await readProjectFiles(first)).documents.filter(
        (document) =>
          document.id === 'shared-card' ||
          document.id === 'new-section' ||
          document.id === 'new-card',
      ),
    ).toEqual([card('First draft'), starter]);
    expect(
      (await readProjectFiles(second)).documents.filter(
        (document) =>
          document.id === 'shared-card' ||
          document.id === 'new-section' ||
          document.id === 'new-card',
      ),
    ).toEqual([card('Second draft'), starter]);
  });

  it('seeds a valid editable document and preserves existing files on reinitialization', async () => {
    const snapshot = await readProjectFiles(first);
    expect(snapshot.design.id).toBe('project-template');
    expect(
      snapshot.documents
        .filter((document) => document.kind === 'atom')
        .map((document) => document.id)
        .sort(),
    ).toEqual([
      'button',
      'image',
      'link',
      'shared-card',
      'text-body',
      'text-heading',
      'video',
    ]);
    const button = snapshot.documents.find((document) => document.id === 'button')!;
    await writeFile(
      join(first.directory, 'button.json'),
      JSON.stringify({ ...button, name: 'My button' }),
    );
    expect(snapshot.documents).toContainEqual(starter);

    const customized = { ...starter, name: 'Keep this section' };
    await writeFile(join(first.directory, 'new-section.json'), JSON.stringify(customized));
    await initializeProjectFiles(first);
    expect((await readProjectFiles(first)).documents).toContainEqual(customized);
    expect(
      (await readProjectFiles(first)).documents.find((document) => document.id === 'button')?.name,
    ).toBe('My button');
    expect(
      (await readProjectFiles(second)).documents.find((document) => document.id === 'button')?.name,
    ).toBe('Button');
  });

  it('refreshes content starter documents when upgrading the starter catalog', async () => {
    const cardPath = join(first.directory, 'content-card.json');
    const card = JSON.parse(await readFile(cardPath, 'utf8')) as DocumentFile;
    const body = card.fields?.find((field) => field.name === 'body');
    if (body) delete body.default;
    await writeFile(cardPath, JSON.stringify(card));
    const starterMarkerDir = join(first.directory, '.facadeur');
    await mkdir(starterMarkerDir, { recursive: true });
    await writeFile(
      join(starterMarkerDir, 'starter-version.json'),
      JSON.stringify({ version: 3 }),
    );

    const snapshot = await readProjectFiles(first);
    expect(
      snapshot.documents
        .find((document) => document.id === 'content-card')
        ?.fields?.find((field) => field.name === 'body')?.default,
    ).toBe('');
    expect(
      snapshot.documents
        .find((document) => document.id === 'text-body')
        ?.fields?.find((field) => field.name === 'text')?.default,
    ).toBe('');
  });

  it('drops stale recovery drafts when starter sources change on disk', async () => {
    const recoveryDir = join(first.directory, '.facadeur');
    await mkdir(recoveryDir, { recursive: true });
    const cardPath = join(first.directory, 'card.json');
    const original = await readFile(cardPath, 'utf8');
    await writeFile(
      join(recoveryDir, 'editor-recovery.json'),
      JSON.stringify({
        documents: [{ ...card('Recovered draft') }],
        sources: { 'shared-card': 'card.json' },
        sourceHashes: { 'shared-card': hash(original) },
      }),
    );
    await writeFile(cardPath, JSON.stringify(card('Changed on disk')));

    const snapshot = await readProjectFiles(first);
    expect(snapshot.documents.find((document) => document.id === 'shared-card')).toEqual(
      card('Changed on disk'),
    );
    expect(snapshot.unsavedDocumentIds).not.toContain('shared-card');
  });

  it('ignores catalog.json sidecar files when loading project documents', async () => {
    await writeFile(
      join(first.directory, 'catalog.json'),
      JSON.stringify({ atoms: {}, components: {}, pages: {} }),
    );

    await expect(readProjectFiles(first)).resolves.toMatchObject({ id: 'project-one' });
  });

  it('materializes starter files when a managed project directory is missing on disk', async () => {
    const directory = join(root, 'missing-on-disk');
    const storage = { id: 'missing-on-disk', directory };
    const snapshot = await readProjectFiles(storage);
    expect(snapshot.id).toBe('missing-on-disk');
    expect(snapshot.design.id).toBe('project-template');
    expect(
      snapshot.documents
        .filter((document) => document.kind === 'atom')
        .map((document) => document.id)
        .sort(),
    ).toEqual(['button', 'image', 'link', 'text-body', 'text-heading', 'video']);
  });
});
