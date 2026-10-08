// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ProjectSnapshot } from '@facadeur/api';
import { ProjectWorkspace } from '../src/ui/projects/ProjectWorkspace';
import { createProjectTemplateDocument } from '@facadeur/tokens';

const routing = vi.hoisted(() => ({
  search: 'project=first',
  router: { push: vi.fn(), replace: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(routing.search),
  useRouter: () => routing.router,
}));
vi.mock('../src/ui/shell/EditorShell.js', () => ({
  EditorShell: () => <button>Edit current project</button>,
}));
vi.mock('../src/ui/management/ManagementHome.js', () => ({
  ManagementHome: () => <div>Management</div>,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  routing.search = 'project=first';
});

function project(id: string): ProjectSnapshot {
  return {
    id,
    name: id,
    design: { ...createProjectTemplateDocument(), schemaCatalog: { schemas: [] } },
    documents: [
      {
        version: 1,
        id: 'section',
        name: 'Section',
        kind: 'section',
        root: { id: 'root', type: 'frame', children: [] },
      },
    ],
    sources: {},
    hashes: {},
    access: { role: 'owner', canWrite: true },
  };
}

it('pauses editing while a replacement project loads, and resumes the previous project on failure', async () => {
  let finish!: (response: Response) => void;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json(project('first')))
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
  vi.stubGlobal('fetch', fetch);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const view = render(<ProjectWorkspace />);
  await screen.findByRole('button', { name: 'Edit current project' });
  routing.search = 'project=second';
  view.rerender(<ProjectWorkspace />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('button', { name: 'Edit current project' })).not.toBeInTheDocument();
  expect(screen.getByText('Loading project…')).toBeInTheDocument();
  await act(async () => finish(Response.json({ error: 'Project unavailable' }, { status: 503 })));
  expect(await screen.findByRole('button', { name: 'Edit current project' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Project unavailable');
});
