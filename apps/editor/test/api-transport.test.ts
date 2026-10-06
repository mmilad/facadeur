import { afterEach, expect, it, vi } from 'vitest';
import { DomainError, apiController } from '@facadeur/api/server';
import { respond } from '../src/app/api/transport.js';
import { POST as signIn } from '../src/app/api/auth/sign-in/route.js';
import { POST as workspace } from '../src/app/api/workspace/route.js';

afterEach(() => vi.restoreAllMocks());

it('keeps expected domain failures distinct from internal server failures', async () => {
  const denied = await respond(async () => {
    throw new DomainError('forbidden', 'Read-only project');
  });
  expect(denied.status).toBe(403);
  expect(await denied.json()).toEqual({ error: 'Read-only project' });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const internal = await respond(async () => {
    throw new Error('SQL failure in private/storage.sqlite');
  });
  expect(internal.status).toBe(500);
  expect(await internal.json()).toEqual({ error: 'API operation failed' });
  expect(log).toHaveBeenCalledOnce();
});

it('rejects malformed JSON and invalid sign-in inputs as client errors', async () => {
  const request = (body: string) =>
    new Request('http://localhost:3001/api/auth/sign-in', {
      method: 'POST',
      headers: { origin: 'http://localhost:3001', 'content-type': 'application/json' },
      body,
    });
  expect((await signIn(request('{'))).status).toBe(400);
  expect((await signIn(request('null'))).status).toBe(400);
  expect((await signIn(request('{"email":"invalid"}'))).status).toBe(400);
});

it('rejects a null workspace command body without reporting a server failure', async () => {
  vi.spyOn(apiController.auth, 'session').mockResolvedValue({
    user: { id: 'actor', name: 'Actor', email: 'actor@example.test' },
  });
  const response = await workspace(
    new Request('http://localhost:3001/api/workspace', {
      method: 'POST',
      headers: { origin: 'http://localhost:3001', 'content-type': 'application/json' },
      body: 'null',
    }),
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'Invalid management command' });
});
