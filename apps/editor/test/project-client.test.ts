import { afterEach, describe, expect, it, vi } from 'vitest';
import { toNested, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { connectProject, loadProject, type ProjectSnapshot } from '../src/domain/project/client';

const card: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'atom',
  root: { id: 'root', type: 'text', text: 'Initial' },
};
function snapshot(): ProjectSnapshot {
  const design = { ...createProjectTemplateDocument(), schemaCatalog: { schemas: [] } };
  return {
    id: 'default',
    design,
    documents: [structuredClone(card)],
    sources: { [design.id]: 'project-template.json', card: 'actual-card.json' },
    hashes: { [design.id]: 'design-hash', card: 'initial-hash' },
  };
}
const connections: ReturnType<typeof connectProject>[] = [];
function connect(project = snapshot()) {
  const connection = connectProject(project);
  connections.push(connection);
  return connection;
}
afterEach(() => {
  connections.splice(0).forEach((connection) => connection.destroy());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('local project JSON client', () => {
  it('forwards load cancellation and rejects failed or invalid responses', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(snapshot()));
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    await loadProject(controller.signal);
    const signal = fetch.mock.calls[0]![1].signal as AbortSignal;
    controller.abort();
    expect(signal.aborted).toBe(true);
    fetch.mockResolvedValueOnce(Response.json({ error: 'Project unavailable' }, { status: 503 }));
    await expect(loadProject()).rejects.toThrow('Project unavailable');
    fetch.mockResolvedValueOnce(Response.json({ ...snapshot(), hashes: null }));
    await expect(loadProject()).rejects.toThrow('Invalid project catalog');
  });
  it('loads shared schemas before validating schema-backed preview data', async () => {
    const project = snapshot();
    project.design.schemaCatalog = {
      schemas: [
        {
          id: 'card-schema',
          name: 'Card',
          schema: { type: 'object', properties: { eyebrow: { type: 'string' } } },
        },
      ],
    };
    project.documents[0]!.schemaUse = { direct: { kind: 'schema', schemaId: 'card-schema' } };
    project.documents[0]!.previewData = { fields: { eyebrow: 'Featured' } };
    const fetch = vi.fn().mockResolvedValue(Response.json(project));
    vi.stubGlobal('fetch', fetch);
    const loaded = await loadProject();
    const { session } = connect(loaded);
    expect(session.project.document(card.id).fields.get('eyebrow')).toMatchObject({
      name: 'eyebrow',
    });
    session.execute({ type: 'setPreviewData', previewData: { fields: { eyebrow: 'Edited' } } });
    expect(session.project.document(card.id).manifest.previewData).toEqual({
      fields: { eyebrow: 'Edited' },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe('/api/projects/default');
  });

  it('loads and saves using the selected project identity', async () => {
    const project = { ...snapshot(), id: 'another-project' };
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(project));
    vi.stubGlobal('fetch', fetch);
    const loaded = await loadProject(undefined, project.id);
    const connection = connect(loaded);
    expect(fetch.mock.calls[0]![0]).toBe('/api/projects/another-project');
    expect(connection.hasPendingChanges()).toBe(false);
    connection.session.execute({
      type: 'setProp',
      nodeId: 'root',
      prop: 'text',
      value: 'Edited project',
    });
    expect(connection.hasPendingChanges()).toBe(true);
    fetch.mockImplementationOnce((_url: string, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(
        Response.json({ document: body.document, source: body.source, hash: 'saved' }),
      );
    });
    await connection.saveAllChanges();
    expect(fetch.mock.calls[1]![0]).toBe('/api/projects/another-project/documents/card/save');
    expect(connection.hasPendingChanges()).toBe(false);
    fetch.mockResolvedValueOnce(Response.json(snapshot()));
    await expect(loadProject(undefined, 'another-project')).rejects.toThrow(
      'Invalid project catalog',
    );
  });

  it('explicitly saves recovered drafts before leaving, while preserving failed saves', async () => {
    const project = snapshot();
    project.unsavedDocumentIds = [card.id];
    const connection = connect(project);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: 'Source conflict' }, { status: 409 }));
    vi.stubGlobal('fetch', fetch);
    expect(connection.hasPendingChanges()).toBe(true);
    await expect(connection.saveAllChanges()).rejects.toThrow('Source conflict');
    expect(connection.hasPendingChanges()).toBe(true);
    fetch.mockImplementationOnce((_url: string, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(
        Response.json({ document: body.document, source: body.source, hash: 'saved' }),
      );
    });
    await connection.saveAllChanges();
    expect(connection.hasPendingChanges()).toBe(false);
    expect(connection.session.getSnapshot().documentDirty).toBe(false);
  });

  it('does not write a view-only project even if its local controller changes', async () => {
    const connection = connect({ ...snapshot(), access: { role: 'viewer', canWrite: false } });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    connection.session.execute({
      type: 'setProp',
      nodeId: 'root',
      prop: 'text',
      value: 'Local edit',
    });
    expect(connection.hasPendingChanges()).toBe(false);
    await expect(connection.saveAllChanges()).rejects.toThrow('viewing this project only');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('saves the captured snapshot and keeps edits made during the request dirty', async () => {
    const { session } = connect();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    let complete!: (response: Response) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    session.project.updateDocument(card.id, {
      type: 'setProp',
      nodeId: 'root',
      prop: 'text',
      value: 'Saved edit',
    });
    const saving = session.saveOpenDocument();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetch.mock.calls[0]![1].body as string);
    expect(body).toMatchObject({
      source: 'actual-card.json',
      expectedHash: 'initial-hash',
      document: { root: { text: 'Saved edit' } },
    });
    session.project.updateDocument(card.id, {
      type: 'setProp',
      nodeId: 'root',
      prop: 'text',
      value: 'Newer edit',
    });
    complete(Response.json({ document: body.document, source: body.source, hash: 'saved-hash' }));
    expect(await saving).toBe(true);
    expect(session.getSnapshot().documentDirty).toBe(true);
    expect(session.project.document(card.id).manifest.nodes.root).toMatchObject({
      text: 'Newer edit',
    });
    fetch.mockImplementationOnce((_url: string, options: RequestInit) => {
      const next = JSON.parse(options.body as string);
      expect(next.expectedHash).toBe('saved-hash');
      return Promise.resolve(
        Response.json({ document: next.document, source: next.source, hash: 'newer-hash' }),
      );
    });
    expect(await session.saveOpenDocument()).toBe(true);
    expect(session.getSnapshot().documentDirty).toBe(false);
    session.undo();
    expect(session.project.document(card.id).manifest.nodes.root).toMatchObject({
      text: 'Saved edit',
    });
    expect(session.getSnapshot().documentDirty).toBe(true);
  });

  it('retains dirty edits on a source conflict and permits a subsequent save', async () => {
    const { session } = connect();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: 'Source changed' }, { status: 409 }));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    session.execute({ type: 'setProp', nodeId: 'root', prop: 'text', value: 'Unsaved' });
    expect(await session.saveOpenDocument()).toBe(false);
    expect(session.getSnapshot()).toMatchObject({
      documentDirty: true,
      notice: { tone: 'error', text: 'Source changed' },
    });
    fetch.mockResolvedValueOnce(
      Response.json({
        document: toNested(session.project.document(card.id).manifest),
        source: 'actual-card.json',
        hash: 'saved',
      }),
    );
    expect(await session.saveOpenDocument()).toBe(true);
    const retry = JSON.parse(fetch.mock.calls[1]![1].body as string);
    expect(retry.expectedHash).toBe('initial-hash');
    expect(session.getSnapshot().documentDirty).toBe(false);
  });

  it('persists only changed controller documents and leaves untouched recovered drafts for explicit saving', async () => {
    const project = snapshot();
    project.unsavedDocumentIds = [card.id];
    const { session, persistPendingChanges } = connect(project);
    const fetch = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      return Promise.resolve(
        Response.json({ document: body.document, source: body.source, hash: 'updated' }),
      );
    });
    vi.stubGlobal('fetch', fetch);
    expect(session.getSnapshot().documentDirty).toBe(true);
    await persistPendingChanges();
    expect(fetch).not.toHaveBeenCalled();
    session.project.styles.setGlobalToken('color', {
      uuid: testUuid30,
      label: 'Primary',
      group: '',
      valueType: 'color',
      value: '#123456',
    });
    await persistPendingChanges();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toContain('/project-template/save');
    expect(session.getSnapshot()).toMatchObject({ documentDirty: true, designDirty: false });
    await persistPendingChanges();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
