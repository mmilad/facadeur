import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { toNested, type Command, type DocumentFile, type SchemaCatalog } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';
import * as Y from 'yjs';
import { openProject, ProjectError, type ProjectRepository } from '../src/project/index';

const exampleDirectory = fileURLToPath(new URL('../../../examples/', import.meta.url));
const exampleSchemas = JSON.parse(
  readFileSync(join(exampleDirectory, 'schemas.json'), 'utf8'),
) as SchemaCatalog;
const temporary: string[] = [];
const repositories: ProjectRepository[] = [];

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'facadeur-project-'));
  temporary.push(directory);
  for (const filename of readdirSync(exampleDirectory).filter((name) => name.endsWith('.json'))) {
    cpSync(join(exampleDirectory, filename), join(directory, filename));
  }
  return directory;
}

function open(directory: string): ProjectRepository {
  const project = openProject({ directory });
  repositories.push(project);
  return project;
}

function client(project: ProjectRepository, id = 'button') {
  const document =
    id === project.snapshot().design.id
      ? project.snapshot().design
      : project.snapshot().documents.find((file) => file.id === id)!;
  return createDocumentStore(
    document,
    {},
    { update: Buffer.from(project.getState(id).update, 'base64') },
  );
}

function status(operation: () => unknown, expected: number): void {
  try {
    operation();
    throw new Error('Expected ProjectError');
  } catch (error) {
    expect(error).toBeInstanceOf(ProjectError);
    expect((error as ProjectError).status).toBe(expected);
  }
}

afterEach(() => {
  for (const project of repositories.splice(0)) project.destroy();
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('durable project repository', () => {
  it('loads the complete catalog with actual source filenames and state vectors', () => {
    const directory = fixture();
    const renamed = join(directory, 'actual button.v1.json');
    cpSync(join(directory, 'button.json'), renamed);
    rmSync(join(directory, 'button.json'));
    const project = open(directory);
    const snapshot = project.snapshot();
    expect(snapshot.id).toBe('default');
    expect(snapshot.design.id).toBe('project-template');
    expect(snapshot.documents.length).toBeGreaterThan(10);
    expect(snapshot.sources.button).toBe('actual button.v1.json');
    expect(snapshot.states.button).toEqual(project.getState('button'));
    const store = client(project);
    expect(Buffer.from(Y.encodeStateVector(store.doc)).toString('base64')).toBe(
      project.getState('button').stateVector,
    );
    store.destroy();
    project.destroy();
    expect(open(directory).snapshot().sources.button).toBe('actual button.v1.json');
  });

  it('commits edits before notification, restores unsaved state, and saves to the source', () => {
    const directory = fixture();
    let project = open(directory);
    const original = readFileSync(join(directory, 'button.json'), 'utf8');
    const unsubscribe = project.subscribe((id, state) => {
      expect(id).toBe('button');
      const durable = JSON.parse(readFileSync(join(directory, '.facadeur/project.json'), 'utf8'));
      expect(durable.entries[id].revision).toBe(state.revision);
    });
    const state = project.edit(
      'button',
      { type: 'setProp', nodeId: 'root', prop: 'name', value: 'Server root' },
      0,
    );
    expect(state).toMatchObject({ revision: 1, savedRevision: 0 });
    expect(readFileSync(join(directory, 'button.json'), 'utf8')).toBe(original);
    unsubscribe();
    project.destroy();
    project = open(directory);
    expect(project.getState('button')).toEqual(state);
    expect(project.snapshot().documents.find((file) => file.id === 'button')!.root.name).toBe(
      'Server root',
    );
    expect(project.save('button', 1)).toMatchObject({ revision: 1, savedRevision: 1 });
    expect(JSON.parse(readFileSync(join(directory, 'button.json'), 'utf8')).root.name).toBe(
      'Server root',
    );
    project.destroy();
    expect(open(directory).getState('button')).toMatchObject({ revision: 1, savedRevision: 1 });
  });

  it('restores schema-backed documents with the complete project resolver context', () => {
    const directory = fixture();
    let project = open(directory);
    const catalog = {
      schemas: [
        ...exampleSchemas.schemas.filter((schema) => schema.id !== 'card'),
        {
          id: 'card',
          name: 'Canonical card override',
          schema: {
            type: 'object',
            properties: {
              eyebrow: { type: 'string' },
              title: { type: 'string' },
              body: { type: 'string' },
              canonicalBadge: { type: 'string' },
            },
          },
        },
      ],
    };
    project.edit('project-template', { type: 'setSchemaCatalog', schemaCatalog: catalog }, 0);
    project.edit(
      'card',
      {
        type: 'setSchemaUse',
        schemaUse: {
          direct: { kind: 'schema', schemaId: 'card' },
          defaults: { canonicalBadge: 'Canonical wins' },
        },
      },
      0,
    );
    project.destroy();

    project = open(directory);
    const snapshot = project.snapshot();
    expect(snapshot.design.schemaCatalog).toEqual(catalog);
    expect(snapshot.documents.find((file) => file.id === 'card')?.schemaUse).toEqual({
      direct: { kind: 'schema', schemaId: 'card' },
      defaults: { canonicalBadge: 'Canonical wins' },
    });
  });

  it('uses the legacy schemas.json catalog to validate durable schemaUse without embedding it', () => {
    const directory = fixture();
    let project = open(directory);
    const schemaUse = {
      direct: { kind: 'schema' as const, schemaId: 'card' },
      defaults: { eyebrow: 'Featured story' },
    };
    project.edit('card', { type: 'setSchemaUse', schemaUse }, 0);
    project.destroy();

    project = open(directory);
    const snapshot = project.snapshot();
    expect(snapshot.design.schemaCatalog).toBeUndefined();
    expect(snapshot.documents.find((file) => file.id === 'card')?.schemaUse).toEqual(schemaUse);
  });

  it('augments a legacy schema from local fields before restoring preview data', () => {
    const directory = fixture();
    let project = open(directory);
    const schemaUse = {
      direct: { kind: 'schema' as const, schemaId: 'input' },
      defaults: { disabled: false },
    };
    project.edit('form-input', { type: 'setSchemaUse', schemaUse }, 0);
    project.destroy();

    project = open(directory);
    const snapshot = project.snapshot();
    expect(snapshot.design.schemaCatalog).toBeUndefined();
    expect(snapshot.documents.find((file) => file.id === 'form-input')?.schemaUse).toEqual(
      schemaUse,
    );
  });

  it('projects legacy fields for a union schema only in the compatibility fallback', () => {
    const directory = fixture();
    let project = open(directory);
    const schemaUse = {
      direct: { kind: 'schema' as const, schemaId: 'media' },
      defaults: { kind: 'image' },
    };
    project.edit('media', { type: 'setSchemaUse', schemaUse }, 0);
    project.destroy();

    project = open(directory);
    const snapshot = project.snapshot();
    expect(snapshot.design.schemaCatalog).toBeUndefined();
    expect(snapshot.documents.find((file) => file.id === 'media')?.schemaUse).toEqual(schemaUse);
  });

  it('permits stale expose collisions only for schemaUse backed by the legacy fallback', () => {
    const directory = fixture();
    let project = open(directory);
    const schemaUse = {
      direct: { kind: 'schema' as const, schemaId: 'input' },
      fields: [{ name: 'label', type: { kind: 'type' as const, type: 'string' as const } }],
    };
    project.edit('input', { type: 'setSchemaUse', schemaUse }, 0);
    project.destroy();

    project = open(directory);
    const snapshot = project.snapshot();
    const input = snapshot.documents.find((file) => file.id === 'input')!;
    expect(snapshot.design.schemaCatalog).toBeUndefined();
    expect(input.schemaUse).toEqual(schemaUse);
    expect(input.expose?.fields).toEqual({
      value: 'control.value',
      placeholder: 'control.placeholder',
      name: 'control.name',
    });
  });

  it('keeps canonical schemaCatalog expose-collision validation strict', () => {
    const project = open(fixture());
    project.edit(
      'project-template',
      {
        type: 'setSchemaCatalog',
        schemaCatalog: {
          schemas: [
            ...exampleSchemas.schemas.filter((schema) => schema.id !== 'input'),
            {
              id: 'input',
              name: 'Canonical input',
              schema: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  value: { type: 'string' },
                  placeholder: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          ],
        },
      },
      0,
    );

    status(
      () =>
        project.edit(
          'input',
          {
            type: 'setSchemaUse',
            schemaUse: { direct: { kind: 'schema', schemaId: 'input' } },
          },
          0,
        ),
      400,
    );
    expect(project.snapshot().documents.find((file) => file.id === 'input')?.schemaUse).toEqual({
      fields: [{ name: 'label', type: { kind: 'type', type: 'string' } }],
    });
  });

  it('merges API and concurrent Yjs edits, returns differential updates, and ignores replay', () => {
    const project = open(fixture());
    const store = client(project);
    const initialVector = Y.encodeStateVector(store.doc);
    store.execute({ type: 'setProp', nodeId: 'root', prop: 'name', value: 'Client name' });
    const update = Y.encodeStateAsUpdate(store.doc, initialVector);
    project.edit('button', { type: 'setProp', nodeId: 'root', prop: 'tag', value: 'a' }, 0);
    const state = project.applyUpdate('button', update);
    expect(state.revision).toBe(2);
    Y.applyUpdate(store.doc, project.getUpdate('button', Y.encodeStateVector(store.doc)));
    expect(toNested(store.getDocument())).toEqual(
      project.snapshot().documents.find((file) => file.id === 'button'),
    );
    expect(store.getNode('root')).toMatchObject({ name: 'Client name', tag: 'a' });
    expect(project.applyUpdate('button', update)).toEqual(state);
    store.destroy();
  });

  it('rejects stale revisions, malformed commands, unknown ids and unsafe paths without publication', () => {
    const project = open(fixture());
    const initial = project.getState('button');
    let published = 0;
    project.subscribe(() => published++);
    status(() => project.edit('button', { type: 'remove', nodeId: 'root' }, 3), 409);
    status(() => project.save('button', -1), 400);
    for (const command of [
      null,
      {},
      { type: 'wat' },
      { type: 'defineField' },
      { type: 'setPreviewData' },
      { type: 'setProp', nodeId: 'root', prop: 'tag', value: 4 },
      { type: 'insert', parentId: 'root', node: null },
      { type: 'createVariantPreset', name: 'new', label: null },
    ]) {
      status(() => project.edit('button', command as Command, 0), 400);
    }
    status(() => project.getState('../button'), 400);
    status(() => project.getState('missing'), 404);
    expect(project.getState('button')).toEqual(initial);
    expect(published).toBe(0);
  });

  it('rejects invalid raw updates and immutable ids before mutating live or durable state', () => {
    const directory = fixture();
    const project = open(directory);
    const original = project.getState('button');
    const disk = readFileSync(join(directory, '.facadeur/project.json'), 'utf8');
    status(() => project.applyUpdate('button', new Uint8Array([255])), 400);
    for (const [key, value] of [
      ['id', 'renamed'],
      ['kind', 'unknown'],
    ] as const) {
      const store = client(project);
      store.doc.getMap('meta').set(key, value);
      status(() => project.applyUpdate('button', Y.encodeStateAsUpdate(store.doc)), 400);
      store.destroy();
    }
    expect(project.getState('button')).toEqual(original);
    expect(readFileSync(join(directory, '.facadeur/project.json'), 'utf8')).toBe(disk);
  });

  it('validates all dependent documents and token resolution on each mutation', () => {
    const project = open(fixture());
    status(() => project.edit('button', { type: 'removeField', name: 'label' }, 0), 400);
    status(
      () =>
        project.edit(
          'project-template',
          {
            type: 'setToken',
            path: 'invalid',
            token: { $type: 'color', $value: '{does.not.exist}' },
          },
          0,
        ),
      400,
    );
    const document: DocumentFile = {
      version: 1,
      id: 'new-component',
      name: 'New component',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'child', type: 'instance', component: 'does-not-exist' }],
      },
    };
    status(() => project.create(document), 400);
  });

  it('refuses an external file change at Save and rehydrates from disk on restart', () => {
    const directory = fixture();
    const project = open(directory);
    const path = join(directory, 'button.json');
    const external = JSON.parse(readFileSync(path, 'utf8'));
    external.name = 'External name';
    writeFileSync(path, JSON.stringify(external));
    status(() => project.save('button', 0), 409);
    expect(JSON.parse(readFileSync(path, 'utf8')).name).toBe('External name');
    project.destroy();
    const restored = open(directory);
    expect(restored.snapshot().documents.find((file) => file.id === 'button')!.name).toBe(
      'External name',
    );
    restored.destroy();
  });

  it('creates durable unsaved documents and preserves their Yjs history through restart and Save', () => {
    const directory = fixture();
    let project = open(directory);
    const document: DocumentFile = {
      version: 1,
      id: 'created',
      name: 'Created',
      kind: 'atom',
      root: { id: 'root', type: 'frame' },
    };
    const store = createDocumentStore(document);
    store.execute({ type: 'setProp', nodeId: 'root', prop: 'name', value: 'Shared root' });
    const state = project.create(document, Y.encodeStateAsUpdate(store.doc));
    expect(state).toMatchObject({ revision: 1, savedRevision: 0 });
    store.destroy();
    project.destroy();
    project = open(directory);
    expect(project.getState('created')).toEqual(state);
    expect(project.snapshot().documents.find((file) => file.id === 'created')!.root.name).toBe(
      'Shared root',
    );
    status(() => project.save('created', 0), 409);
    expect(project.save('created', 1)).toMatchObject({ revision: 1, savedRevision: 1 });
    expect(JSON.parse(readFileSync(join(directory, 'created.json'), 'utf8')).root.name).toBe(
      'Shared root',
    );
    status(() => project.create(document), 409);
    status(() => project.create({ ...document, id: '../escape' }), 400);
  });

  it('restores a saved parent referencing a newly created unsaved catalog document', () => {
    const directory = fixture();
    let project = open(directory);
    project.create({
      version: 1,
      id: 'new-atom',
      name: 'New atom',
      kind: 'atom',
      root: { id: 'root', type: 'frame' },
    });
    project.edit(
      'card',
      { type: 'insert', parentId: 'root', node: { type: 'instance', component: 'new-atom' } },
      0,
    );
    project.save('card', 1);
    const before = project.snapshot();
    project.destroy();
    project = open(directory);
    expect(project.snapshot()).toEqual(before);
    expect(project.getState('new-atom')).toMatchObject({ revision: 1, savedRevision: 0 });
  });

  it('rejects supplied creation updates with pending structs or delete dependencies', () => {
    const directory = fixture();
    const project = open(directory);
    const document: DocumentFile = {
      version: 1,
      id: 'incomplete',
      name: 'Incomplete',
      kind: 'atom',
      root: { id: 'root', type: 'frame' },
    };
    const before = project.snapshot();
    const path = join(directory, '.facadeur/project.json');
    const durable = readFileSync(path, 'utf8');
    let notifications = 0;
    project.subscribe(() => notifications++);
    const store = createDocumentStore(document);
    try {
      for (const deletion of [false, true]) {
        const donor = new Y.Doc();
        try {
          donor.getMap('pending').set('first', 'missing dependency');
          const vector = Y.encodeStateVector(donor);
          if (deletion) donor.getMap('pending').delete('first');
          else donor.getMap('pending').set('second', 'pending struct');
          const update = Y.mergeUpdates([
            Y.encodeStateAsUpdate(store.doc),
            Y.encodeStateAsUpdate(donor, vector),
          ]);
          status(() => project.create(document, update), 400);
          expect(project.snapshot()).toEqual(before);
          expect(readFileSync(path, 'utf8')).toBe(durable);
          expect(notifications).toBe(0);
        } finally {
          donor.destroy();
        }
      }
    } finally {
      store.destroy();
    }
  });

  it('rejects raw Yjs changes that invalidate a dependent component contract', () => {
    const project = open(fixture());
    const before = project.getState('button');
    const store = client(project);
    store.execute({ type: 'removeField', name: 'label' });
    status(() => project.applyUpdate('button', Y.encodeStateAsUpdate(store.doc)), 400);
    expect(project.getState('button')).toEqual(before);
    store.destroy();
  });

  it('recovers a save journal interrupted before or after the JSON export', () => {
    for (const alreadyExported of [false, true]) {
      const directory = fixture();
      const project = open(directory);
      project.edit(
        'button',
        { type: 'setProp', nodeId: 'root', prop: 'name', value: 'Journal root' },
        0,
      );
      const document = project.snapshot().documents.find((file) => file.id === 'button')!;
      project.destroy();
      const path = join(directory, '.facadeur/project.json');
      const durable = JSON.parse(readFileSync(path, 'utf8'));
      const entry = durable.entries.button;
      const content = `${JSON.stringify(document, null, 2)}\n`;
      entry.pending = { previousHash: entry.hash, content };
      entry.hash = createHash('sha256').update(content).digest('hex');
      entry.savedRevision = entry.revision;
      writeFileSync(path, JSON.stringify(durable));
      if (alreadyExported) writeFileSync(join(directory, 'button.json'), content);
      expect(open(directory).getState('button')).toMatchObject({ revision: 1, savedRevision: 1 });
      expect(readFileSync(join(directory, 'button.json'), 'utf8')).toBe(content);
      expect(JSON.parse(readFileSync(path, 'utf8')).entries.button.pending).toBeUndefined();
    }
  });

  it('does not publish a failed persistence write and isolates listener errors', () => {
    const directory = fixture();
    const project = open(directory);
    const initial = project.getState('button');
    let notifications = 0;
    project.subscribe(() => {
      notifications++;
      throw new Error('Listener failure');
    });
    const path = join(directory, '.facadeur/project.json');
    rmSync(path);
    mkdirSync(path);
    status(
      () =>
        project.edit('button', { type: 'setProp', nodeId: 'root', prop: 'name', value: 'Lost' }, 0),
      500,
    );
    expect(project.getState('button')).toEqual(initial);
    expect(notifications).toBe(0);
    rmSync(path, { recursive: true });
    expect(
      project.edit(
        'button',
        { type: 'setProp', nodeId: 'root', prop: 'name', value: 'Committed' },
        0,
      ).revision,
    ).toBe(1);
    expect(notifications).toBe(1);
  });
});
