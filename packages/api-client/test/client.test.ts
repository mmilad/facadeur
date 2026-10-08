import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from '../src/index';

describe('API client transport', () => {
  it('accepts anonymous sessions and preserves server error status and message', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(Response.json({ error: 'Project is read-only' }, { status: 403 }));
    const api = createApiClient({ fetch });
    expect(await api.auth.session()).toBeNull();
    await expect(
      api.workspace.command({ type: 'createOrganisation', name: 'Studio' }),
    ).rejects.toEqual(new ApiError(403, 'Project is read-only'));
  });

  it('uses the configured API address and forwards cancellation for project reads', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ id: 'a/b' }));
    const api = createApiClient({ baseUrl: 'https://workspace.example/api/', fetch });
    const abort = new AbortController();
    await api.projects.load('a/b', { signal: abort.signal });
    expect(fetch.mock.calls[0]![0]).toBe('https://workspace.example/api/projects/a%2Fb');
    const signal = fetch.mock.calls[0]![1]!.signal!;
    abort.abort();
    expect(signal.aborted).toBe(true);
  });
});
