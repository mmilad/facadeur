'use client';

import type { OrganisationRole } from '@facadeur/api';
import './management.css';

export function ProjectWorkspaceBar({
  projectName,
  organisationName,
  role,
  onManageProjects,
  onSignOut,
}: {
  projectName: string;
  organisationName: string;
  role: OrganisationRole;
  onManageProjects: () => void;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <nav className="project-workspace-bar" aria-label="Project workspace">
      <div className="project-workspace-context">
        <span>{organisationName}</span>
        <span aria-hidden="true">/</span>
        <strong>{projectName}</strong>
        <span className="project-workspace-role">{role} · mock account</span>
      </div>
      <div className="project-workspace-actions">
        <button type="button" className="management-button subtle" onClick={onManageProjects}>
          Projects
        </button>
        <button type="button" className="management-button subtle" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
