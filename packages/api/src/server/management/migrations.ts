import type { DatabaseSync } from 'node:sqlite';

function hasLegacyIdentityReference(database: DatabaseSync) {
  const keys = database.prepare('PRAGMA foreign_key_list(organisation_members)').all();
  return keys.some((key) => key.from === 'user_id' && key.table === 'user');
}

/** Earlier auth versions used `user`; preserve identities before changing membership references. */
export function migrateLegacyIdentities(database: DatabaseSync) {
  if (!hasLegacyIdentityReference(database)) return;
  database.exec('BEGIN IMMEDIATE');
  try {
    // Another connection may have migrated the database while this one waited for the lock.
    if (hasLegacyIdentityReference(database)) {
      database.exec(`
        INSERT INTO mock_users (id, name, email, created_at)
        SELECT id, name, lower(trim(email)),
          CASE WHEN typeof(createdAt) IN ('integer', 'real')
            THEN strftime('%Y-%m-%dT%H:%M:%fZ', createdAt / 1000.0, 'unixepoch')
            ELSE CAST(createdAt AS TEXT) END
        FROM "user"
        WHERE true
        ON CONFLICT(email) DO NOTHING;

        CREATE TABLE organisation_members_migrated (
          id TEXT PRIMARY KEY,
          organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES mock_users(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
          created_at TEXT NOT NULL,
          UNIQUE (organisation_id, user_id)
        );
        INSERT INTO organisation_members_migrated (id, organisation_id, user_id, role, created_at)
        SELECT m.id, m.organisation_id, current.id, m.role, m.created_at
        FROM organisation_members m
        JOIN "user" legacy ON legacy.id = m.user_id
        JOIN mock_users current ON current.email = lower(trim(legacy.email)) COLLATE NOCASE;

      `);
      const original = database.prepare('SELECT count(*) AS count FROM organisation_members').get();
      const migrated = database
        .prepare('SELECT count(*) AS count FROM organisation_members_migrated')
        .get();
      if (original?.count !== migrated?.count) {
        throw new Error('Legacy memberships could not be migrated safely');
      }
      database.exec(`
        DROP TABLE organisation_members;
        ALTER TABLE organisation_members_migrated RENAME TO organisation_members;
        CREATE INDEX organisation_members_user_idx ON organisation_members(user_id);
      `);
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
