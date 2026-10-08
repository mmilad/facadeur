import { apiController } from '@facadeur/api/server';
import type { ProjectCatalogModel } from '@facadeur/core';
import { authenticatedActor, respond } from '../../../transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return respond(async () => {
    const { projectId } = await context.params;
    return Response.json(
      await apiController.projects.catalog.load(await authenticatedActor(request), projectId),
    );
  });
}

export function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return respond(async () => {
    const { projectId } = await context.params;
    const catalog = (await request.json()) as ProjectCatalogModel;
    return Response.json(
      await apiController.projects.catalog.save(
        await authenticatedActor(request),
        projectId,
        catalog,
      ),
    );
  });
}
