import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('self-hosted management backend', () => {
  let root = '';
  let signIn: typeof import('../src/app/api/auth/sign-in/route.js').POST;
  let signOut: typeof import('../src/app/api/auth/sign-out/route.js').POST;
  let session: typeof import('../src/app/api/auth/session/route.js').GET;
  let workspaceGet: typeof import('../src/app/api/workspace/route.js').GET;
  let workspacePost: typeof import('../src/app/api/workspace/route.js').POST;
  let genericProjectGet: typeof import('../src/app/api/projects/[projectId]/route.js').GET;
  let genericProjectSave: typeof import('../src/app/api/projects/[projectId]/documents/[id]/save/route.js').POST;
  let defaultProjectGet: typeof import('../src/app/api/projects/default/route.js').GET;
  let defaultProjectSave: typeof import('../src/app/api/projects/default/documents/[id]/save/route.js').POST;

  const request = (pathName: string, cookie?: string, body?: unknown) =>
    new Request(`http://localhost:3001${pathName}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        origin: 'http://localhost:3001',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  const signInAs = async (email: string) => {
    const response = await signIn(request('/api/auth/sign-in', undefined, { email }));
    expect(response.status).toBe(200);
    return response.headers.get('set-cookie')!.split(';', 1)[0]!;
  };

  const command = async (cookie: string, value: unknown) =>
    workspacePost(request('/api/workspace', cookie, { command: value }));

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'facadeur-management-'));
    process.env.FACADEUR_MANAGEMENT_DIR = path.join(root, '.facadeur');
    process.env.FACADEUR_PROJECT_DIR = path.join(root, 'examples');
    vi.resetModules();
    ({ POST: signIn } = await import('../src/app/api/auth/sign-in/route.js'));
    ({ POST: signOut } = await import('../src/app/api/auth/sign-out/route.js'));
    ({ GET: session } = await import('../src/app/api/auth/session/route.js'));
    ({ GET: workspaceGet, POST: workspacePost } =
      await import('../src/app/api/workspace/route.js'));
    ({ GET: genericProjectGet } = await import('../src/app/api/projects/[projectId]/route.js'));
    ({ POST: genericProjectSave } =
      await import('../src/app/api/projects/[projectId]/documents/[id]/save/route.js'));
    ({ GET: defaultProjectGet } = await import('../src/app/api/projects/default/route.js'));
    ({ POST: defaultProjectSave } =
      await import('../src/app/api/projects/default/documents/[id]/save/route.js'));
    const files = await import('@facadeur/api/server');
    await files.initializeProjectFiles(files.legacyProjectStorage());
  });

  afterAll(async () => {
    const runtime = (globalThis as unknown as Record<string, { database: { close(): void } }>)[
      '__facadeurManagementRuntime'
    ];
    runtime?.database.close();
    delete (globalThis as unknown as Record<string, unknown>).__facadeurManagementRuntime;
    await rm(root, { recursive: true, force: true });
    delete process.env.FACADEUR_MANAGEMENT_DIR;
    delete process.env.FACADEUR_PROJECT_DIR;
  });

  it('persists mock sessions and enforces project, invitation, and owner boundaries', async () => {
    const anonymous = await session(request('/api/auth/session'));
    expect(anonymous.status).toBe(200);
    expect(await anonymous.json()).toBeNull();
    expect((await workspaceGet(request('/api/workspace'))).status).toBe(401);

    const ownerCookie = await signInAs('owner@example.test');
    const signedIn = await session(request('/api/auth/session', ownerCookie));
    expect((await signedIn.json()).user.email).toBe('owner@example.test');
    const createdOrg = await command(ownerCookie, { type: 'createOrganisation', name: 'Studio' });
    expect(createdOrg.status).toBe(200);
    const orgId = (await createdOrg.json()).snapshot.organisations[0].id as string;

    const createdProject = await command(ownerCookie, {
      type: 'createProject',
      organisationId: orgId,
      name: 'Landing page',
    });
    expect(createdProject.status).toBe(200);
    const projectId = (await createdProject.json()).projectId as string;
    const genericProject = await genericProjectGet(
      request(`/api/projects/${projectId}`, ownerCookie),
      { params: Promise.resolve({ projectId }) },
    );
    expect(genericProject.status).toBe(200);
    const projectSnapshot = await genericProject.json();
    const saveBody = {
      document: projectSnapshot.design,
      source: projectSnapshot.sources[projectSnapshot.design.id],
      expectedHash: projectSnapshot.hashes[projectSnapshot.design.id],
    };
    expect(
      (
        await genericProjectSave(
          request(
            `/api/projects/${projectId}/documents/${projectSnapshot.design.id}/save`,
            ownerCookie,
            saveBody,
          ),
          { params: Promise.resolve({ projectId, id: projectSnapshot.design.id }) },
        )
      ).status,
    ).toBe(200);
    expect((await defaultProjectGet(request('/api/projects/default', ownerCookie))).status).toBe(
      404,
    );
    expect(
      (await command(ownerCookie, { type: 'claimExamples', organisationId: orgId })).status,
    ).toBe(200);
    expect(
      (await command(ownerCookie, { type: 'claimExamples', organisationId: orgId })).status,
    ).toBe(403);
    const defaultSnapshotResponse = await defaultProjectGet(
      request('/api/projects/default', ownerCookie),
    );
    expect(defaultSnapshotResponse.status).toBe(200);
    const defaultSnapshot = await defaultSnapshotResponse.json();
    expect(
      (
        await defaultProjectSave(
          request(
            `/api/projects/default/documents/${defaultSnapshot.design.id}/save`,
            ownerCookie,
            {
              document: defaultSnapshot.design,
              source: defaultSnapshot.sources[defaultSnapshot.design.id],
              expectedHash: defaultSnapshot.hashes[defaultSnapshot.design.id],
            },
          ),
          { params: Promise.resolve({ id: defaultSnapshot.design.id }) },
        )
      ).status,
    ).toBe(200);

    const unrelatedCookie = await signInAs('outside@example.test');

    const invitation = await command(ownerCookie, {
      type: 'inviteMember',
      organisationId: orgId,
      email: 'viewer@example.test',
      role: 'viewer',
    });
    expect(invitation.status).toBe(200);
    const token = (await invitation.json()).invitationToken as string;
    expect(token).toBeTruthy();
    expect((await command(unrelatedCookie, { type: 'acceptInvitation', token })).status).toBe(403);

    const viewerCookie = await signInAs('viewer@example.test');
    expect((await command(viewerCookie, { type: 'acceptInvitation', token })).status).toBe(200);
    const viewerSnapshot = await workspaceGet(request('/api/workspace', viewerCookie));
    expect((await viewerSnapshot.json()).organisations).toHaveLength(1);
    const viewerProject = await genericProjectGet(
      request(`/api/projects/${projectId}`, viewerCookie),
      { params: Promise.resolve({ projectId }) },
    );
    expect(viewerProject.status).toBe(200);

    expect(
      (
        await genericProjectSave(
          request(
            `/api/projects/${projectId}/documents/${projectSnapshot.design.id}/save`,
            viewerCookie,
            saveBody,
          ),
          { params: Promise.resolve({ projectId, id: projectSnapshot.design.id }) },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await defaultProjectSave(
          request(
            `/api/projects/default/documents/${defaultSnapshot.design.id}/save`,
            viewerCookie,
            {
              document: defaultSnapshot.design,
              source: defaultSnapshot.sources[defaultSnapshot.design.id],
              expectedHash: defaultSnapshot.hashes[defaultSnapshot.design.id],
            },
          ),
          { params: Promise.resolve({ id: defaultSnapshot.design.id }) },
        )
      ).status,
    ).toBe(403);
    expect((await command(viewerCookie, { type: 'acceptInvitation', token })).status).toBe(404);

    const ownerSnapshot = await (await workspaceGet(request('/api/workspace', ownerCookie))).json();
    const ownerMemberId = ownerSnapshot.members[orgId][0].id as string;
    expect(
      (
        await command(ownerCookie, {
          type: 'removeMember',
          organisationId: orgId,
          memberId: ownerMemberId,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await command(ownerCookie, {
          type: 'changeMemberRole',
          organisationId: orgId,
          memberId: ownerMemberId,
          role: 'viewer',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await command(ownerCookie, {
          type: 'archiveOrganisation',
          organisationId: orgId,
          archived: 'true',
        })
      ).status,
    ).toBe(400);
    const foreignOrigin = new Request('http://localhost:3001/api/workspace', {
      method: 'POST',
      headers: {
        origin: 'https://attacker.invalid',
        cookie: ownerCookie,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ command: { type: 'createOrganisation', name: 'Nope' } }),
    });
    expect((await workspacePost(foreignOrigin)).status).toBe(403);
    expect(
      (
        await command(ownerCookie, {
          type: 'archiveOrganisation',
          organisationId: orgId,
          archived: true,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await command(ownerCookie, {
          type: 'archiveOrganisation',
          organisationId: orgId,
          archived: false,
        })
      ).status,
    ).toBe(200);
    const reopened = await workspaceGet(request('/api/workspace', ownerCookie));
    expect((await reopened.json()).organisations[0].archived).toBe(false);
    expect((await signOut(request('/api/auth/sign-out', ownerCookie, {}))).status).toBe(200);
    expect(await (await session(request('/api/auth/session', ownerCookie))).json()).toBeNull();
  });
});
