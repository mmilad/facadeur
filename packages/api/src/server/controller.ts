import type { AuthSession, AuthUser } from '../contracts/auth.js';
import type { ProjectSnapshot, SaveDocumentRequest } from '../contracts/project.js';
import { resolveUser, mockSignIn, mockSignOut } from './auth/session.js';
import { authorizeProject } from './management/access.js';
import { workspaceSnapshot, runManagementCommand } from './management/service.js';
import { readProjectFiles, saveProjectFile } from './project/files.js';

async function session(token: string | null): Promise<AuthSession> {
  const user = await resolveUser(token);
  return user ? { user } : null;
}

async function loadProject(actor: AuthUser | null, projectId: string): Promise<ProjectSnapshot> {
  const { storage, project, organisation } = await authorizeProject(actor, projectId);
  return {
    ...(await readProjectFiles(storage)),
    name: project.name,
    organisationId: organisation.id,
    organisationName: organisation.name,
    access: { role: organisation.role, canWrite: organisation.role !== 'viewer' },
  };
}

async function saveDocument(
  actor: AuthUser | null,
  projectId: string,
  documentId: string,
  input: SaveDocumentRequest,
) {
  const { storage } = await authorizeProject(actor, projectId, true);
  return saveProjectFile(documentId, input, storage);
}

/** Trusted callers provide the authenticated actor, never browser-submitted identity/roles. */
export const apiController = {
  auth: { session, signIn: mockSignIn, signOut: mockSignOut },
  workspace: { load: workspaceSnapshot, command: runManagementCommand },
  projects: { load: loadProject, save: saveDocument },
};
