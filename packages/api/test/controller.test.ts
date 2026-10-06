import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { apiController } from '../src/server/index.js';

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'facadeur-controller-'));
  vi.stubEnv('FACADEUR_MANAGEMENT_DIR', directory);
});
afterEach(async () => {
  const host = globalThis as unknown as Record<string, { database: { close(): void } } | undefined>;
  host.__facadeurManagementRuntime?.database.close();
  delete host.__facadeurManagementRuntime;
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('application controller with data-only inputs', () => {
  it('creates and saves a project with an actor and data, independently of HTTP', async () => {
    const { user, token } = await apiController.auth.signIn({ email: 'owner@controller.test' });
    expect(await apiController.auth.session(token)).toEqual({ user });
    const organisation = await apiController.workspace.command(user, {
      type: 'createOrganisation',
      name: 'Studio',
    });
    expect(organisation.projectId).toBeTruthy();
    expect(organisation.snapshot.projects).toEqual([
      expect.objectContaining({ name: 'Default', organisationId: organisation.snapshot.organisations[0]!.id }),
    ]);
    const project = await apiController.projects.load(user, organisation.projectId!);
    expect(project.access).toEqual({ role: 'owner', canWrite: true });
    const document = project.documents[0]!;
    const input = {
      document: { ...document, name: 'Saved with plain data' },
      source: project.sources[document.id]!,
      expectedHash: project.hashes[document.id]!,
    };
    const saved = await apiController.projects.save(user, project.id, document.id, input);
    expect(saved.document.name).toBe('Saved with plain data');
    expect((await apiController.projects.load(user, project.id)).documents[0]!.name).toBe(
      'Saved with plain data',
    );
    await expect(
      apiController.projects.save(user, project.id, document.id, input),
    ).rejects.toMatchObject({ code: 'conflict' });
    await apiController.auth.signOut(token);
    expect(await apiController.auth.session(token)).toBeNull();
    await expect(apiController.workspace.load(null)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('enforces membership, invitations, read-only saves and last-owner rules with domain errors', async () => {
    const { user: owner } = await apiController.auth.signIn({ email: 'owner@controller.test' });
    const { user: viewer } = await apiController.auth.signIn({ email: 'viewer@controller.test' });
    const { user: outsider } = await apiController.auth.signIn({
      email: 'outside@controller.test',
    });
    const createdOrg = await apiController.workspace.command(owner, {
      type: 'createOrganisation',
      name: 'Studio',
    });
    const organisationId = createdOrg.snapshot.organisations[0]!.id;
    const created = await apiController.workspace.command(owner, {
      type: 'createProject',
      organisationId,
      name: 'Site',
    });
    const projectId = created.projectId!;
    await expect(apiController.projects.load(outsider, projectId)).rejects.toMatchObject({
      code: 'not-found',
    });
    const invite = await apiController.workspace.command(owner, {
      type: 'inviteMember',
      organisationId,
      email: viewer.email,
      role: 'viewer',
    });
    const acceptance = { type: 'acceptInvitation' as const, token: invite.invitationToken! };
    await expect(apiController.workspace.command(outsider, acceptance)).rejects.toMatchObject({
      code: 'forbidden',
    });
    await apiController.workspace.command(viewer, acceptance);
    await expect(apiController.workspace.command(viewer, acceptance)).rejects.toMatchObject({
      code: 'not-found',
    });
    const project = await apiController.projects.load(viewer, projectId);
    const document = project.documents[0]!;
    await expect(
      apiController.projects.save(viewer, projectId, document.id, {
        document,
        source: project.sources[document.id]!,
        expectedHash: project.hashes[document.id]!,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    const memberId = createdOrg.snapshot.members[organisationId]![0]!.id;
    await expect(
      apiController.workspace.command(owner, { type: 'removeMember', organisationId, memberId }),
    ).rejects.toMatchObject({ code: 'conflict' });
    await expect(
      apiController.workspace.command(owner, {
        type: 'changeMemberRole',
        organisationId,
        memberId,
        role: 'viewer',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await apiController.workspace.command(owner, {
      type: 'archiveOrganisation',
      organisationId,
      archived: true,
    });
    await expect(apiController.projects.load(owner, projectId)).rejects.toMatchObject({
      code: 'not-found',
    });
    await apiController.workspace.command(owner, {
      type: 'archiveOrganisation',
      organisationId,
      archived: false,
    });
    expect((await apiController.projects.load(owner, projectId)).id).toBe(projectId);
  });

  it('keeps mock authentication unavailable in production without HTTP status dependencies', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(await apiController.auth.session('some-token')).toBeNull();
    await expect(
      apiController.auth.signIn({ email: 'owner@controller.test' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});
