import { afterEach, describe, expect, it, vi } from 'vitest';
import { createExampleCatalog } from '@facadeur/examples';
import { connectProject, loadProject } from '../src/domain/project/client';

function project() {
  return { id: 'project-1', catalog: createExampleCatalog() };
}

const connections: ReturnType<typeof connectProject>[] = [];
function connect(input = project()) {
  const connection = connectProject(input);
  connections.push(connection);
  return connection;
}

afterEach(() => {
  connections.splice(0).forEach((connection) => connection.destroy());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Catalog project client', () => {
  it('loads a project catalog with cancellation and rejects failed or invalid responses', async () => {
    const input = project();
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(input));
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();

    await expect(loadProject(controller.signal, input.id)).resolves.toMatchObject(input);
    const signal = fetch.mock.calls[0]![1].signal as AbortSignal;
    controller.abort();
    expect(signal.aborted).toBe(true);

    fetch.mockResolvedValueOnce(Response.json({ error: 'Project unavailable' }, { status: 503 }));
    await expect(loadProject()).rejects.toThrow('Project unavailable');

    fetch.mockResolvedValueOnce(Response.json({ ...input, id: 'another-project' }));
    await expect(loadProject(undefined, input.id)).rejects.toThrow('Invalid project');

    fetch.mockResolvedValueOnce(
      Response.json({
        ...input,
        catalog: { atoms: {}, components: {}, pages: {}, props: 'invalid' },
      }),
    );
    await expect(loadProject(undefined, input.id)).rejects.toThrow('/props Expected object');
  });

  it('tracks Catalog changes and persists them through the project Catalog endpoint', async () => {
    const connection = connect();
    const fetch = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      return Response.json(JSON.parse(options.body as string));
    });
    vi.stubGlobal('fetch', fetch);

    expect(connection.hasPendingChanges()).toBe(false);
    const prop = connection.app.upsertDesignProp({ name: 'surface', value: 'var(--surface)' });
    expect(connection.hasPendingChanges()).toBe(true);

    await connection.saveAllChanges();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe('/api/projects/project-1/catalog');
    expect(fetch.mock.calls[0]![1].method).toBe('PUT');
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string).props).toMatchObject({
      [prop.uuid]: {
        name: 'surface',
        value: 'var(--surface)',
      },
    });
    expect(connection.hasPendingChanges()).toBe(false);

    await connection.saveAllChanges();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps Catalog changes pending after a failed save', async () => {
    const connection = connect();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: 'Catalog conflict' }, { status: 409 }));
    vi.stubGlobal('fetch', fetch);
    connection.app.upsertDesignProp({ name: 'surface', value: 'var(--surface)' });

    await expect(connection.saveAllChanges()).rejects.toThrow('Catalog conflict');
    expect(connection.hasPendingChanges()).toBe(true);
  });

  it('does not persist local changes for a view-only project', async () => {
    const connection = connect({ ...project(), access: { role: 'viewer', canWrite: false } });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    connection.app.upsertDesignProp({ name: 'surface', value: 'var(--surface)' });

    expect(connection.hasPendingChanges()).toBe(false);
    await connection.saveAllChanges();
    expect(fetch).not.toHaveBeenCalled();
  });
});
