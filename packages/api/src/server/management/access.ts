import path from 'node:path';
import type {
  ManagedProject,
  OrganisationRole,
  OrganisationSummary,
  ProjectStorage,
} from '../../contracts/management';
import type { AuthUser } from '../../contracts/auth';
import { DomainError } from '../../errors';
import { getManagementDatabase } from './database';

function projectStorage(input: {
  id: string;
  directory: string;
  recovery_path: string | null;
}): ProjectStorage {
  return {
    id: input.id,
    directory: path.resolve(input.directory),
    ...(input.recovery_path ? { recoveryPath: path.resolve(input.recovery_path) } : {}),
  };
}

export async function authorizeProject(user: AuthUser | null, projectId: string, write = false) {
  if (!user) throw new DomainError('unauthenticated', 'Sign in required');
  const db = await getManagementDatabase();
  const row = db
    .prepare(
      `
    SELECT p.id, p.organisation_id, p.name, p.archived AS project_archived,
           p.storage_directory, p.recovery_path,
           o.name AS organisation_name, o.archived AS organisation_archived,
           m.role
    FROM management_projects p
    JOIN organisations o ON o.id = p.organisation_id
    JOIN organisation_members m ON m.organisation_id = o.id
    WHERE p.id = ? AND m.user_id = ?
  `,
    )
    .get(projectId, user.id) as
    | {
        id: string;
        organisation_id: string;
        name: string;
        project_archived: number;
        storage_directory: string;
        recovery_path: string | null;
        organisation_name: string;
        organisation_archived: number;
        role: OrganisationRole;
      }
    | undefined;
  if (!row || row.project_archived || row.organisation_archived)
    throw new DomainError('not-found', 'Project not found');
  if (write && row.role === 'viewer') throw new DomainError('forbidden', 'Project is read-only');
  const project: ManagedProject = {
    id: row.id,
    organisationId: row.organisation_id,
    name: row.name,
    archived: false,
  };
  const organisation: OrganisationSummary = {
    id: row.organisation_id,
    name: row.organisation_name,
    role: row.role,
    archived: false,
  };
  return {
    storage: projectStorage({
      id: row.id,
      directory: row.storage_directory,
      recovery_path: row.recovery_path,
    }),
    project,
    organisation,
    user,
  };
}

export function requireOrganisationRole(
  db: Awaited<ReturnType<typeof getManagementDatabase>>,
  userId: string,
  organisationId: string,
  roles: OrganisationRole[],
  includeArchived = false,
) {
  const organisation = db
    .prepare(
      `
    SELECT o.id, o.name, o.archived, m.role
    FROM organisations o JOIN organisation_members m ON m.organisation_id = o.id
    WHERE o.id = ? AND m.user_id = ?
  `,
    )
    .get(organisationId, userId) as
    { id: string; name: string; archived: number; role: OrganisationRole } | undefined;
  if (!organisation || (organisation.archived && !includeArchived))
    throw new DomainError('not-found', 'Organisation not found');
  if (!roles.includes(organisation.role))
    throw new DomainError('forbidden', 'Insufficient organisation role');
  return organisation;
}
