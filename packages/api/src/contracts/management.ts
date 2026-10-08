import type { AuthUser } from './auth';

export type OrganisationRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface OrganisationSummary {
  id: string;
  name: string;
  role: OrganisationRole;
  archived: boolean;
}

export interface ManagedProject {
  id: string;
  organisationId: string;
  name: string;
  archived: boolean;
}

export interface OrganisationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrganisationRole;
}

export interface OrganisationInvitation {
  id: string;
  email: string;
  role: Exclude<OrganisationRole, 'owner'>;
  expiresAt: string;
}

export interface ManagementSnapshot {
  user: AuthUser;
  organisations: OrganisationSummary[];
  projects: ManagedProject[];
  members: Record<string, OrganisationMember[]>;
  invitations: Record<string, OrganisationInvitation[]>;
  canClaimExamples: boolean;
}

export type ManagementCommand =
  | { type: 'createOrganisation'; name: string }
  | { type: 'renameOrganisation'; organisationId: string; name: string }
  | { type: 'archiveOrganisation'; organisationId: string; archived: boolean }
  | { type: 'createProject'; organisationId: string; name: string }
  | { type: 'renameProject'; projectId: string; name: string }
  | { type: 'archiveProject'; projectId: string; archived: boolean }
  | { type: 'claimExamples'; organisationId: string }
  | {
      type: 'inviteMember';
      organisationId: string;
      email: string;
      role: Exclude<OrganisationRole, 'owner'>;
    }
  | { type: 'acceptInvitation'; token: string }
  | { type: 'revokeInvitation'; organisationId: string; invitationId: string }
  | { type: 'changeMemberRole'; organisationId: string; memberId: string; role: OrganisationRole }
  | { type: 'removeMember'; organisationId: string; memberId: string };

export interface ManagementResult {
  snapshot: ManagementSnapshot;
  invitationToken?: string;
  projectId?: string;
}

export interface ProjectStorage {
  id: string;
  directory: string;
  recoveryPath?: string;
}
