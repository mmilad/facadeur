'use client';

import { useState } from 'react';
import type {
  ManagementCommand,
  ManagementResult,
  ManagementSnapshot,
  ManagedProject,
  OrganisationRole,
  OrganisationSummary,
} from '@facadeur/api';
import { SelectField, TextField } from '@facadeur/form';

const roles: Exclude<OrganisationRole, 'owner'>[] = ['admin', 'editor', 'viewer'];
export function OrganisationWorkspace({
  organisation,
  projects,
  snapshot,
  canManage,
  busy,
  execute,
  canClaimExamples,
}: {
  organisation: OrganisationSummary;
  projects: ManagedProject[];
  snapshot: ManagementSnapshot;
  canManage: boolean;
  busy: boolean;
  execute: (command: ManagementCommand) => Promise<ManagementResult | undefined>;
  canClaimExamples: boolean;
}) {
  const [projectName, setProjectName] = useState('');
  const members = snapshot.members[organisation.id] ?? [];
  const invitations = snapshot.invitations[organisation.id] ?? [];
  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) return;
    if (await execute({ type: 'createProject', organisationId: organisation.id, name })) {
      setProjectName('');
    }
  };
  const renameOrganisation = async () => {
    const name = window.prompt('New organisation name', organisation.name)?.trim();
    if (name) await execute({ type: 'renameOrganisation', organisationId: organisation.id, name });
  };

  return (
    <>
      <section className="management-panel" aria-labelledby="projects-heading">
        <div className="management-section-heading">
          <div>
            <p className="management-eyebrow">
              {organisation.name} · {organisation.role}
            </p>
            <h2 id="projects-heading">Projects</h2>
          </div>
          {canManage ? (
            <div className="management-actions">
              {canClaimExamples ? (
                <button
                  type="button"
                  className="management-button subtle"
                  onClick={() =>
                    void execute({ type: 'claimExamples', organisationId: organisation.id })
                  }
                  disabled={busy}
                >
                  Add example projects
                </button>
              ) : null}
              <button
                type="button"
                className="management-button subtle"
                onClick={() => void renameOrganisation()}
                disabled={busy}
              >
                Rename organisation
              </button>
              <button
                type="button"
                className="management-button subtle"
                onClick={() =>
                  void execute({
                    type: 'archiveOrganisation',
                    organisationId: organisation.id,
                    archived: !organisation.archived,
                  })
                }
                disabled={busy}
              >
                {organisation.archived ? 'Restore organisation' : 'Archive organisation'}
              </button>
            </div>
          ) : null}
        </div>
        {projects.length ? (
          <ul className="management-project-list">
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                canManage={canManage}
                busy={busy}
                execute={execute}
              />
            ))}
          </ul>
        ) : (
          <p className="management-empty">No projects in this organisation yet.</p>
        )}
        {canManage ? (
          <form className="management-inline-form" onSubmit={(event) => void createProject(event)}>
            <label>
              <span className="sr-only">New project name</span>
              <TextField
                id="project-name"
                label="New project name"
                name="projectName"
                required
                maxLength={100}
                placeholder="Project name"
                value={projectName}
                onChange={setProjectName}
              />
            </label>
            <button type="submit" className="management-button primary" disabled={busy}>
              Create project
            </button>
          </form>
        ) : null}
      </section>

      {canManage ? (
        <section className="management-panel" aria-labelledby="members-heading">
          <div className="management-section-heading">
            <div>
              <p className="management-eyebrow">Access</p>
              <h2 id="members-heading">Members and invitations</h2>
            </div>
          </div>
          <ul className="management-member-list">
            {members.map((member) => (
              <li key={member.id} className="management-member-row">
                <div className="management-member-identity">
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>
                {member.role === 'owner' && organisation.role !== 'owner' ? (
                  <span className="management-role">Owner</span>
                ) : (
                  <>
                    <SelectField
                      id={`member-role-${member.id}`}
                      className="management-role-control"
                      aria-label={`Role for ${member.name}`}
                      value={member.role}
                      disabled={busy}
                      options={[
                        ...(organisation.role === 'owner'
                          ? [{ value: 'owner', label: 'owner' }]
                          : []),
                        ...roles.map((role) => ({ value: role, label: role })),
                      ]}
                      onChange={(role) =>
                        void execute({
                          type: 'changeMemberRole',
                          organisationId: organisation.id,
                          memberId: member.id,
                          role: role as OrganisationRole,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="management-button danger"
                      onClick={() =>
                        void execute({
                          type: 'removeMember',
                          organisationId: organisation.id,
                          memberId: member.id,
                        })
                      }
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <InviteForm organisationId={organisation.id} busy={busy} execute={execute} />
          <div className="management-invitations">
            <h3>Pending invitations</h3>
            {invitations.length ? (
              <ul className="management-member-list">
                {invitations.map((invitation) => (
                  <li key={invitation.id} className="management-member-row">
                    <div className="management-member-identity">
                      <strong>{invitation.email}</strong>
                      <span>
                        {invitation.role} · expires{' '}
                        {new Date(invitation.expiresAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="management-button danger"
                      onClick={() =>
                        void execute({
                          type: 'revokeInvitation',
                          organisationId: organisation.id,
                          invitationId: invitation.id,
                        })
                      }
                      disabled={busy}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="management-empty">No pending invitations.</p>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}

function ProjectRow({
  project,
  canManage,
  busy,
  execute,
}: {
  project: ManagedProject;
  canManage: boolean;
  busy: boolean;
  execute: (command: ManagementCommand) => Promise<ManagementResult | undefined>;
}) {
  return (
    <li className="management-project-row">
      <div className="management-project-name">
        <strong>{project.name}</strong>
        {project.archived ? <span className="management-archived">Archived</span> : null}
      </div>
      <div className="management-actions">
        {canManage ? (
          <>
            <button
              type="button"
              className="management-button subtle"
              disabled={busy}
              onClick={() => {
                const name = window.prompt('New project name', project.name)?.trim();
                if (name) void execute({ type: 'renameProject', projectId: project.id, name });
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="management-button subtle"
              disabled={busy}
              onClick={() =>
                void execute({
                  type: 'archiveProject',
                  projectId: project.id,
                  archived: !project.archived,
                })
              }
            >
              {project.archived ? 'Restore' : 'Archive'}
            </button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function InviteForm({
  organisationId,
  busy,
  execute,
}: {
  organisationId: string;
  busy: boolean;
  execute: (command: ManagementCommand) => Promise<ManagementResult | undefined>;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<OrganisationRole, 'owner'>>('viewer');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await execute({
      type: 'inviteMember',
      organisationId,
      email: email.trim(),
      role,
    });
    if (result) {
      setEmail('');
      setRole('viewer');
    }
  };
  return (
    <form className="management-inline-form invite-form" onSubmit={(event) => void submit(event)}>
      <label>
        <span className="sr-only">Email to invite</span>
        <TextField
          id="invite-email"
          label="Email to invite"
          type="email"
          name="inviteEmail"
          required
          placeholder="person@example.com"
          value={email}
          onChange={setEmail}
        />
      </label>
      <label>
        <span className="sr-only">Invitation role</span>
        <SelectField
          id="invite-role"
          aria-label="Invitation role"
          name="inviteRole"
          value={role}
          options={roles.map((option) => ({ value: option, label: option }))}
          onChange={(next) => setRole(next as Exclude<OrganisationRole, 'owner'>)}
        />
      </label>
      <button type="submit" className="management-button primary" disabled={busy}>
        Create invitation
      </button>
    </form>
  );
}
