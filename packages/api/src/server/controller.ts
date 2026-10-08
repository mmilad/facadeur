import type { AuthSession, AuthUser } from '../contracts/auth';
import type { ProjectSnapshot, SaveDocumentRequest } from '../contracts/project';
import { resolveUser, mockSignIn, mockSignOut } from './auth/session';
import { authorizeProject } from './management/access';
import { workspaceSnapshot, runManagementCommand } from './management/service';
import {
  createCatalogDefinition,
  deleteCatalogDefinition,
  patchCatalogDefinition,
  readProjectCatalog,
  writeProjectCatalog,
  type CatalogDefinitionKind,
} from './project/catalog';
import { readProjectFiles, saveProjectFile } from './project/files';
import type { NodeDefinitionModel, ProjectCatalogModel } from '@facadeur/core';

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
async function loadCatalog(actor: AuthUser | null, projectId: string) {
  const { storage } = await authorizeProject(actor, projectId);
  return readProjectCatalog(storage);
}

async function saveCatalog(
  actor: AuthUser | null,
  projectId: string,
  catalog: ProjectCatalogModel,
) {
  const { storage } = await authorizeProject(actor, projectId, true);
  return writeProjectCatalog(catalog, storage);
}

async function createDefinition(
  actor: AuthUser | null,
  projectId: string,
  kind: CatalogDefinitionKind,
  definition: Omit<NodeDefinitionModel, 'uuid'> & { uuid?: string },
) {
  const { storage } = await authorizeProject(actor, projectId, true);
  return createCatalogDefinition(kind, definition, storage);
}

async function patchDefinition(
  actor: AuthUser | null,
  projectId: string,
  kind: CatalogDefinitionKind,
  uuid: string,
  patch: Partial<NodeDefinitionModel>,
) {
  const { storage } = await authorizeProject(actor, projectId, true);
  return patchCatalogDefinition(kind, uuid, patch, storage);
}

async function removeDefinition(
  actor: AuthUser | null,
  projectId: string,
  kind: CatalogDefinitionKind,
  uuid: string,
) {
  const { storage } = await authorizeProject(actor, projectId, true);
  return deleteCatalogDefinition(kind, uuid, storage);
}

export const apiController = {
  auth: { session, signIn: mockSignIn, signOut: mockSignOut },
  workspace: { load: workspaceSnapshot, command: runManagementCommand },
  projects: {
    load: loadProject,
    save: saveDocument,
    catalog: {
      load: loadCatalog,
      save: saveCatalog,
      createDefinition,
      patchDefinition,
      removeDefinition,
    },
  },
};
