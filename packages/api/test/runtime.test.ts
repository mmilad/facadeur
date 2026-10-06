import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, expect, it, vi } from 'vitest';
import { apiController } from '../src/server/index.js';
import { getManagementDatabase } from '../src/server/management/database.js';

let directory: string | undefined;
afterEach(async () => {
  const host = globalThis as unknown as Record<string, { database: DatabaseSync } | undefined>;
  host.__facadeurManagementRuntime?.database.close();
  delete host.__facadeurManagementRuntime;
  vi.unstubAllEnvs();
  if (directory) await rm(directory, { recursive: true, force: true });
});

it('retries database startup after a broken file is repaired and closes the failed connection', async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'facadeur-runtime-'));
  vi.stubEnv('FACADEUR_MANAGEMENT_DIR', directory);
  const filename = path.join(directory, 'management.sqlite');
  await writeFile(filename, 'Not a SQLite database');
  await expect(getManagementDatabase()).rejects.toThrow();
  // Windows cannot remove this file if the failed connection is left open.
  await rm(filename);
  const { user } = await apiController.auth.signIn({ email: 'retry@example.test' });
  const result = await apiController.workspace.command(user, {
    type: 'createOrganisation',
    name: 'Studio',
  });
  expect(result.snapshot.organisations[0]?.name).toBe('Studio');
  expect(result.snapshot.projects).toEqual([
    expect.objectContaining({ name: 'Default' }),
  ]);
  expect(result.projectId).toBeTruthy();
});
