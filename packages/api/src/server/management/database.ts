import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrateLegacyIdentities } from './migrations.js';

type Runtime = { database: DatabaseSync; directory: string };
const runtimeKey = '__facadeurManagementRuntime';
const runtimeHost = globalThis as unknown as Record<string, Runtime | Promise<Runtime> | undefined>;

export function managementDirectory() {
  return path.resolve(process.env.FACADEUR_MANAGEMENT_DIR ?? path.join(process.cwd(), '.facadeur'));
}

export function managementProjectDirectory(projectId: string) {
  return path.join(managementDirectory(), 'projects', projectId);
}

async function createRuntime(): Promise<Runtime> {
  const directory = managementDirectory();
  await mkdir(directory, { recursive: true });
  const database = new DatabaseSync(path.join(directory, 'management.sqlite'));
  try {
    database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS mock_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mock_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES mock_users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS organisations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS organisation_members (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES mock_users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
      created_at TEXT NOT NULL,
      UNIQUE (organisation_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS management_projects (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      storage_directory TEXT NOT NULL,
      recovery_path TEXT,
      legacy_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS organisation_invitations (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','editor','viewer')),
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS organisation_members_user_idx ON organisation_members(user_id);
    CREATE INDEX IF NOT EXISTS management_projects_org_idx ON management_projects(organisation_id);
    CREATE INDEX IF NOT EXISTS organisation_invitations_org_idx ON organisation_invitations(organisation_id);
    `);
  } catch (error) {
    database.close();
    throw error;
  }
  return { database, directory };
}

async function runtime() {
  let instance = runtimeHost[runtimeKey];
  if (!instance) {
    instance = createRuntime();
    runtimeHost[runtimeKey] = instance;
  }
  try {
    const resolved = await instance;
    if (runtimeHost[runtimeKey] === instance) runtimeHost[runtimeKey] = resolved;
    return resolved;
  } catch (error) {
    if (runtimeHost[runtimeKey] === instance) delete runtimeHost[runtimeKey];
    throw error;
  }
}

export async function getManagementDatabase() {
  const { database } = await runtime();
  // Also covers a connection retained across development hot reloads.
  migrateLegacyIdentities(database);
  return database;
}
