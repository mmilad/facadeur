import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type {
  ManagementCommand,
  ManagementResult,
  ManagementSnapshot,
  OrganisationRole,
} from '../../contracts/management.js';
import type { AuthUser } from '../../contracts/auth.js';
import { DomainError } from '../../errors.js';
import { getManagementDatabase, managementProjectDirectory } from './database.js';
import { requireOrganisationRole } from './access.js';
import { initializeProjectFiles, legacyProjectStorage } from '../project/files.js';

const now = () => new Date().toISOString();
const id = () => randomUUID();
const nameValue = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) {
    throw new DomainError('invalid-input', `${label} must contain 1 to 100 characters`);
  }
  return value.trim();
};
const roles = ['owner', 'admin', 'editor', 'viewer'] as const;

export async function workspaceSnapshot(user: AuthUser | null): Promise<ManagementSnapshot> {
  if (!user) throw new DomainError('unauthenticated', 'Sign in required');
  const db = await getManagementDatabase();
  const organisations = db
    .prepare(
      `
    SELECT o.id, o.name, o.archived, m.role
    FROM organisations o JOIN organisation_members m ON m.organisation_id = o.id
    WHERE m.user_id = ? ORDER BY o.created_at, o.id
  `,
    )
    .all(user.id) as Array<{ id: string; name: string; archived: number; role: OrganisationRole }>;
  const projects = db
    .prepare(
      `
    SELECT p.id, p.organisation_id AS organisationId, p.name, p.archived
    FROM management_projects p JOIN organisation_members m ON m.organisation_id = p.organisation_id
    WHERE m.user_id = ? ORDER BY p.created_at, p.id
  `,
    )
    .all(user.id) as Array<{ id: string; organisationId: string; name: string; archived: number }>;
  const members: ManagementSnapshot['members'] = {};
  const invitations: ManagementSnapshot['invitations'] = {};
  const memberQuery = db.prepare(`
    SELECT m.id, m.user_id AS userId, u.name, u.email, m.role
    FROM organisation_members m JOIN mock_users u ON u.id = m.user_id
    WHERE m.organisation_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name COLLATE NOCASE
  `);
  const inviteQuery = db.prepare(
    `SELECT id, email, role, expires_at AS expiresAt FROM organisation_invitations WHERE organisation_id = ? AND expires_at > ? ORDER BY created_at`,
  );
  for (const organisation of organisations) {
    const memberRows = memberQuery.all(organisation.id) as Array<{
      id: string;
      userId: string;
      name: string;
      email: string;
      role: string;
    }>;
    members[organisation.id] = memberRows.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: roleOrThrow(member.role),
    }));
    if (organisation.role === 'owner' || organisation.role === 'admin') {
      const inviteRows = inviteQuery.all(organisation.id, now()) as Array<{
        id: string;
        email: string;
        role: string;
        expiresAt: string;
      }>;
      invitations[organisation.id] = inviteRows.map((invitation) => ({
        ...invitation,
        role: roleOrThrow(invitation.role) as Exclude<OrganisationRole, 'owner'>,
      }));
    }
  }
  const bootstrap = db.prepare('SELECT id FROM mock_users ORDER BY rowid LIMIT 1').get() as
    { id: string } | undefined;
  const claimed = db
    .prepare("SELECT id FROM management_projects WHERE id = 'default' LIMIT 1")
    .get();
  return {
    user,
    organisations: organisations.map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      archived: !!item.archived,
    })),
    projects: projects.map((item) => ({ ...item, archived: !!item.archived })),
    members,
    invitations,
    canClaimExamples: !!bootstrap && bootstrap.id === user.id && !claimed,
  };
}

function transaction<T>(
  db: Awaited<ReturnType<typeof getManagementDatabase>>,
  operation: () => T,
): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function roleOrThrow(value: unknown): OrganisationRole {
  if (typeof value !== 'string' || !roles.includes(value as OrganisationRole))
    throw new DomainError('invalid-input', 'Invalid organisation role');
  return value as OrganisationRole;
}

function commandObject(value: unknown): ManagementCommand {
  const types = [
    'createOrganisation',
    'renameOrganisation',
    'archiveOrganisation',
    'createProject',
    'renameProject',
    'archiveProject',
    'claimExamples',
    'inviteMember',
    'acceptInvitation',
    'revokeInvitation',
    'changeMemberRole',
    'removeMember',
  ];
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('type' in value) ||
    typeof value.type !== 'string' ||
    !types.includes(value.type)
  ) {
    throw new DomainError('invalid-input', 'Invalid management command');
  }
  return value as ManagementCommand;
}

export async function runManagementCommand(
  user: AuthUser | null,
  rawCommand: ManagementCommand,
): Promise<ManagementResult> {
  if (!user) throw new DomainError('unauthenticated', 'Sign in required');
  const command = commandObject(rawCommand);
  const db = await getManagementDatabase();
  let invitationToken: string | undefined;
  let projectId: string | undefined;

  switch (command.type) {
    case 'createOrganisation': {
      const name = nameValue(command.name, 'Organisation name');
      transaction(db, () => {
        const orgId = id();
        db.prepare('INSERT INTO organisations (id,name,created_at) VALUES (?,?,?)').run(
          orgId,
          name,
          now(),
        );
        db.prepare(
          'INSERT INTO organisation_members (id,organisation_id,user_id,role,created_at) VALUES (?,?,?,?,?)',
        ).run(id(), orgId, user.id, 'owner', now());
      });
      break;
    }
    case 'renameOrganisation': {
      const name = nameValue(command.name, 'Organisation name');
      requireOrganisationRole(db, user.id, command.organisationId, ['owner', 'admin']);
      db.prepare('UPDATE organisations SET name = ? WHERE id = ?').run(
        name,
        command.organisationId,
      );
      break;
    }
    case 'archiveOrganisation': {
      if (typeof command.archived !== 'boolean')
        throw new DomainError('invalid-input', 'archived must be a boolean');
      requireOrganisationRole(
        db,
        user.id,
        command.organisationId,
        ['owner', 'admin'],
        !command.archived,
      );
      db.prepare('UPDATE organisations SET archived = ? WHERE id = ?').run(
        command.archived ? 1 : 0,
        command.organisationId,
      );
      break;
    }
    case 'createProject': {
      const name = nameValue(command.name, 'Project name');
      requireOrganisationRole(db, user.id, command.organisationId, ['owner', 'admin']);
      projectId = id();
      const directory = managementProjectDirectory(projectId);
      const storage = { id: projectId, directory };
      await initializeProjectFiles(storage);
      db.prepare(
        'INSERT INTO management_projects (id,organisation_id,name,storage_directory,created_at) VALUES (?,?,?,?,?)',
      ).run(projectId, command.organisationId, name, directory, now());
      break;
    }
    case 'renameProject': {
      const name = nameValue(command.name, 'Project name');
      const project = db
        .prepare('SELECT organisation_id FROM management_projects WHERE id = ?')
        .get(command.projectId) as { organisation_id: string } | undefined;
      if (!project) throw new DomainError('not-found', 'Project not found');
      requireOrganisationRole(db, user.id, project.organisation_id, ['owner', 'admin']);
      db.prepare('UPDATE management_projects SET name = ? WHERE id = ?').run(
        name,
        command.projectId,
      );
      break;
    }
    case 'archiveProject': {
      if (typeof command.archived !== 'boolean')
        throw new DomainError('invalid-input', 'archived must be a boolean');
      const project = db
        .prepare('SELECT organisation_id FROM management_projects WHERE id = ?')
        .get(command.projectId) as { organisation_id: string } | undefined;
      if (!project) throw new DomainError('not-found', 'Project not found');
      requireOrganisationRole(db, user.id, project.organisation_id, ['owner', 'admin']);
      db.prepare('UPDATE management_projects SET archived = ? WHERE id = ?').run(
        command.archived ? 1 : 0,
        command.projectId,
      );
      break;
    }
    case 'claimExamples': {
      const legacy = legacyProjectStorage();
      transaction(db, () => {
        const first = db.prepare('SELECT id FROM mock_users ORDER BY rowid LIMIT 1').get() as
          { id: string } | undefined;
        if (
          !first ||
          first.id !== user.id ||
          db.prepare("SELECT id FROM management_projects WHERE id='default'").get()
        )
          throw new DomainError(
            'forbidden',
            'Examples can only be claimed once by the initial account',
          );
        requireOrganisationRole(db, user.id, command.organisationId, ['owner', 'admin']);
        db.prepare(
          'INSERT INTO management_projects (id,organisation_id,name,storage_directory,recovery_path,legacy_default,created_at) VALUES (?,?,?,?,?,?,?)',
        ).run(
          'default',
          command.organisationId,
          'Examples',
          legacy.directory,
          legacy.recoveryPath ?? null,
          1,
          now(),
        );
      });
      break;
    }
    case 'inviteMember': {
      requireOrganisationRole(db, user.id, command.organisationId, ['owner', 'admin']);
      const email = typeof command.email === 'string' ? command.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new DomainError('invalid-input', 'Enter a valid email address');
      const role = roleOrThrow(command.role);
      if (role === 'owner')
        throw new DomainError('invalid-input', 'Owner invitations are not allowed');
      invitationToken = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      transaction(db, () => {
        const existingUser = db
          .prepare('SELECT id FROM mock_users WHERE lower(email) = ?')
          .get(email);
        if (
          existingUser &&
          db
            .prepare('SELECT id FROM organisation_members WHERE organisation_id=? AND user_id=?')
            .get(command.organisationId, (existingUser as { id: string }).id)
        )
          throw new DomainError('conflict', 'User is already a member');
        const duplicate = db
          .prepare(
            'SELECT id FROM organisation_invitations WHERE organisation_id=? AND email=? AND expires_at>?',
          )
          .get(command.organisationId, email, now());
        if (duplicate) throw new DomainError('conflict', 'An invitation is already pending');
        db.prepare(
          'INSERT INTO organisation_invitations (id,organisation_id,email,role,token_hash,expires_at,created_at) VALUES (?,?,?,?,?,?,?)',
        ).run(
          id(),
          command.organisationId,
          email,
          role,
          createHash('sha256').update(invitationToken!).digest('hex'),
          expiresAt,
          now(),
        );
      });
      break;
    }
    case 'acceptInvitation': {
      if (
        typeof command.token !== 'string' ||
        command.token.length < 32 ||
        command.token.length > 200
      )
        throw new DomainError('invalid-input', 'Invalid invitation token');
      const tokenHash = createHash('sha256').update(command.token).digest('hex');
      transaction(db, () => {
        const invitation = db
          .prepare(
            'SELECT id,organisation_id,email,role,expires_at FROM organisation_invitations WHERE token_hash=?',
          )
          .get(tokenHash) as
          | {
              id: string;
              organisation_id: string;
              email: string;
              role: Exclude<OrganisationRole, 'owner'>;
              expires_at: string;
            }
          | undefined;
        if (!invitation || invitation.expires_at <= now())
          throw new DomainError('not-found', 'Invitation is invalid or expired');
        if (invitation.email.toLowerCase() !== user.email.toLowerCase())
          throw new DomainError('forbidden', 'Sign in with the invited email address');
        const organisation = db
          .prepare('SELECT archived FROM organisations WHERE id=?')
          .get(invitation.organisation_id) as { archived: number } | undefined;
        if (!organisation || organisation.archived)
          throw new DomainError('not-found', 'Organisation not found');
        if (
          db
            .prepare('SELECT id FROM organisation_members WHERE organisation_id=? AND user_id=?')
            .get(invitation.organisation_id, user.id)
        )
          throw new DomainError('conflict', 'You are already a member');
        db.prepare(
          'INSERT INTO organisation_members (id,organisation_id,user_id,role,created_at) VALUES (?,?,?,?,?)',
        ).run(id(), invitation.organisation_id, user.id, invitation.role, now());
        db.prepare('DELETE FROM organisation_invitations WHERE id=?').run(invitation.id);
      });
      break;
    }
    case 'revokeInvitation': {
      requireOrganisationRole(db, user.id, command.organisationId, ['owner', 'admin']);
      db.prepare('DELETE FROM organisation_invitations WHERE organisation_id=? AND id=?').run(
        command.organisationId,
        command.invitationId,
      );
      break;
    }
    case 'changeMemberRole': {
      const organisation = requireOrganisationRole(db, user.id, command.organisationId, [
        'owner',
        'admin',
      ]);
      const role = roleOrThrow(command.role);
      transaction(db, () => {
        const target = db
          .prepare('SELECT user_id,role FROM organisation_members WHERE organisation_id=? AND id=?')
          .get(command.organisationId, command.memberId) as
          { user_id: string; role: OrganisationRole } | undefined;
        if (!target) throw new DomainError('not-found', 'Member not found');
        const ownerCount = (
          db
            .prepare(
              "SELECT count(*) AS count FROM organisation_members WHERE organisation_id=? AND role='owner'",
            )
            .get(command.organisationId) as { count: number }
        ).count;
        if (
          (organisation.role !== 'owner' && (target.role === 'owner' || role === 'owner')) ||
          (target.role === 'owner' && role !== 'owner' && ownerCount < 2)
        ) {
          throw new DomainError(
            'forbidden',
            'Only an owner can change ownership, and the organisation must retain an owner',
          );
        }
        db.prepare('UPDATE organisation_members SET role=? WHERE organisation_id=? AND id=?').run(
          role,
          command.organisationId,
          command.memberId,
        );
      });
      break;
    }
    case 'removeMember': {
      const organisation = requireOrganisationRole(db, user.id, command.organisationId, [
        'owner',
        'admin',
      ]);
      transaction(db, () => {
        const target = db
          .prepare('SELECT user_id,role FROM organisation_members WHERE organisation_id=? AND id=?')
          .get(command.organisationId, command.memberId) as
          { user_id: string; role: OrganisationRole } | undefined;
        if (!target) throw new DomainError('not-found', 'Member not found');
        if (organisation.role !== 'owner' && target.role === 'owner')
          throw new DomainError('forbidden', 'Admins cannot manage owners');
        if (
          target.role === 'owner' &&
          (
            db
              .prepare(
                "SELECT count(*) AS count FROM organisation_members WHERE organisation_id=? AND role='owner'",
              )
              .get(command.organisationId) as { count: number }
          ).count < 2
        )
          throw new DomainError('conflict', 'The last owner cannot be removed');
        db.prepare('DELETE FROM organisation_members WHERE organisation_id=? AND id=?').run(
          command.organisationId,
          command.memberId,
        );
      });
      break;
    }
    default:
      throw new DomainError('invalid-input', 'Unknown management command');
  }
  return {
    snapshot: await workspaceSnapshot(user),
    ...(invitationToken ? { invitationToken } : {}),
    ...(projectId ? { projectId } : {}),
  };
}
