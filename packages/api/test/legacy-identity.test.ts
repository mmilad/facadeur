import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiController } from '../src/server/index.js';
import { getManagementDatabase } from '../src/server/management/database.js';

let directory: string;
function closeRuntime() {
  const host = globalThis as unknown as Record<string, { database: DatabaseSync } | undefined>;
  host.__facadeurManagementRuntime?.database.close();
  delete host.__facadeurManagementRuntime;
}
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'facadeur-legacy-identity-'));
  vi.stubEnv('FACADEUR_MANAGEMENT_DIR', directory);
});
afterEach(async () => {
  closeRuntime();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

function seedLegacyDatabase(existingMockAccount: boolean, missingLegacyUser = false) {
  const db = new DatabaseSync(path.join(directory, 'management.sqlite'));
  if (missingLegacyUser) db.exec('PRAGMA foreign_keys = OFF');
  db.exec(`
    CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, createdAt INTEGER);
    INSERT INTO "user" VALUES ('legacy-owner', 'Owner', 'OWNER@example.test', 1700000000000);
    CREATE TABLE organisations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    INSERT INTO organisations VALUES ('legacy-org', 'Existing studio', 0, '2023-11-14T00:00:00Z');
    CREATE TABLE organisation_members (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
      created_at TEXT NOT NULL,
      UNIQUE (organisation_id, user_id)
    );
    INSERT INTO organisation_members VALUES (
      'legacy-member', 'legacy-org', '${missingLegacyUser ? 'missing' : 'legacy-owner'}',
      'owner', '2023-11-14T00:00:00Z'
    );
  `);
  if (existingMockAccount) {
    db.exec(`
      CREATE TABLE mock_users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        created_at TEXT NOT NULL
      );
      INSERT INTO mock_users VALUES ('current-owner', 'Current owner', 'owner@example.test', '2026-10-01T00:00:00Z');
    `);
  }
  db.close();
}

it.each([false, true])(
  'preserves legacy memberships and creates organisations (existing mock account: %s)',
  async (existingMockAccount) => {
    seedLegacyDatabase(existingMockAccount);
    const { user, token } = await apiController.auth.signIn({ email: 'owner@example.test' });
    expect(user.id).toBe(existingMockAccount ? 'current-owner' : 'legacy-owner');
    expect(await apiController.auth.session(token)).toEqual({ user });
    const workspace = await apiController.workspace.load(user);
    expect(workspace.organisations).toContainEqual({
      id: 'legacy-org',
      name: 'Existing studio',
      role: 'owner',
      archived: false,
    });
    expect(workspace.members['legacy-org']![0]).toMatchObject({
      id: 'legacy-member',
      userId: user.id,
      role: 'owner',
    });
    const result = await apiController.workspace.command(user, {
      type: 'createOrganisation',
      name: 'New studio',
    });
    expect(result.snapshot.organisations).toHaveLength(2);
    expect(result.snapshot.projects.some((project) => project.organisationId === 'legacy-org')).toBe(
      false,
    );
    expect(
      result.snapshot.projects.some(
        (project) =>
          project.organisationId ===
          result.snapshot.organisations.find((organisation) => organisation.name === 'New studio')
            ?.id,
      ),
    ).toBe(true);
    const created = await apiController.workspace.command(user, {
      type: 'createProject',
      organisationId: 'legacy-org',
      name: 'Existing workspace project',
    });
    expect((await apiController.projects.load(user, created.projectId!)).access?.role).toBe(
      'owner',
    );
    const db = await getManagementDatabase();
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(db.prepare('PRAGMA foreign_key_list(organisation_members)').all()).toContainEqual(
      expect.objectContaining({ table: 'mock_users', from: 'user_id' }),
    );
    expect(db.prepare('SELECT count(*) AS count FROM "user"').get()?.count).toBe(1);
    closeRuntime();
    expect(await apiController.auth.session(token)).toEqual({ user });
    expect((await apiController.workspace.load(user)).organisations).toHaveLength(2);
  },
);

it('rolls back rather than discarding a membership whose legacy identity is missing', async () => {
  seedLegacyDatabase(false, true);
  await expect(getManagementDatabase()).rejects.toThrow(
    'Legacy memberships could not be migrated safely',
  );
  const db = new DatabaseSync(path.join(directory, 'management.sqlite'));
  try {
    expect(db.prepare('SELECT user_id FROM organisation_members').get()?.user_id).toBe('missing');
    expect(db.prepare('SELECT count(*) AS count FROM mock_users').get()?.count).toBe(0);
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE name='organisation_members_migrated'").get(),
    ).toBeUndefined();
  } finally {
    db.close();
  }
});
