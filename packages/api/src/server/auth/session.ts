import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getManagementDatabase } from '../management/database';
import { DomainError } from '../../errors';
import type { MockSignIn } from '../../contracts/auth';
import type { AuthUser } from '../../contracts/auth';

function disabledInProduction() {
  return process.env.NODE_ENV === 'production';
}

export async function resolveUser(token: string | null): Promise<AuthUser | null> {
  if (disabledInProduction()) return null;
  if (!token) return null;
  const db = await getManagementDatabase();
  const row = db
    .prepare(
      `
    SELECT u.id, u.name, u.email
    FROM mock_sessions s JOIN mock_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>?
  `,
    )
    .get(createHash('sha256').update(token).digest('hex'), new Date().toISOString()) as
    AuthUser | undefined;
  return row ?? null;
}

export async function mockSignIn(input: MockSignIn) {
  if (disabledInProduction())
    throw new DomainError('forbidden', 'Mock authentication is disabled in production');
  if (!input || typeof input !== 'object')
    throw new DomainError('invalid-input', 'Invalid sign-in request');
  const { email: rawEmail, name: rawName } = input as { email?: unknown; name?: unknown };
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new DomainError('invalid-input', 'Enter a valid email address');
  const name =
    typeof rawName === 'string' && rawName.trim()
      ? rawName.trim().slice(0, 100)
      : email.split('@')[0]!;
  const db = await getManagementDatabase();
  let user = db.prepare('SELECT id,name,email FROM mock_users WHERE email=?').get(email) as
    AuthUser | undefined;
  if (!user) {
    user = { id: randomUUID(), name, email };
    db.prepare('INSERT INTO mock_users (id,name,email,created_at) VALUES (?,?,?,?)').run(
      user.id,
      user.name,
      user.email,
      new Date().toISOString(),
    );
  }
  const token = randomBytes(32).toString('base64url');
  db.prepare(
    'INSERT INTO mock_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)',
  ).run(
    createHash('sha256').update(token).digest('hex'),
    user.id,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    new Date().toISOString(),
  );
  return { user, token };
}

export async function mockSignOut(token: string | null) {
  if (!token) return;
  const db = await getManagementDatabase();
  db.prepare('DELETE FROM mock_sessions WHERE token_hash=?').run(
    createHash('sha256').update(token).digest('hex'),
  );
}
