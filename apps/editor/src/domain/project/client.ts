import { CoreController, emptyProjectCatalog, validateProjectCatalog } from '@facadeur/core';
import { createAppService } from '../../app-service';
import { createCatalogPort } from './catalog-port';
import { createEditorSession } from '../session';
import type { ProjectSnapshot } from '@facadeur/api';
import { api } from '../api';
export type { ProjectSnapshot } from '@facadeur/api';

export async function loadProject(
  signal?: AbortSignal,
  projectId = 'default',
): Promise<ProjectSnapshot> {
  const project = await api.projects.load(projectId, { signal });
  if (!project || project.id !== projectId) throw new Error('Invalid project');
  project.catalog = validateProjectCatalog(project.catalog ?? emptyProjectCatalog());
  return project;
}

type EditorProject = Pick<
  ProjectSnapshot,
  'id' | 'name' | 'organisationName' | 'access' | 'catalog'
>;

/** Connect API catalog to {@link CoreController} and editor chrome session. */
export function connectProject(project: EditorProject) {
  const core = new CoreController(project.catalog);
  const catalogPort = createCatalogPort(project.id);
  const session = createEditorSession({ core });
  const app = createAppService({ core, session, catalogPort });
  let catalogBaseline = JSON.stringify(core.getSnapshot().catalog);

  const hasPendingChanges = () => {
    if (project.access?.canWrite === false) return false;
    return JSON.stringify(core.getSnapshot().catalog) !== catalogBaseline;
  };

  const saveAllChanges = async () => {
    if (!hasPendingChanges()) return;
    await app.persistCatalog();
    catalogBaseline = JSON.stringify(core.getSnapshot().catalog);
  };

  return {
    session,
    core,
    app,
    catalogPort,
    project,
    hasPendingChanges,
    saveAllChanges,
    destroy: () => session.destroy(),
  };
}
