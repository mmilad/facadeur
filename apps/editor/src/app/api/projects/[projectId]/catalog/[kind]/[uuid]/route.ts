import { apiController } from '@facadeur/api/server';
import type { NodeDefinitionModel } from '@facadeur/core';
import { authenticatedActor, respond } from '../../../../../transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const kinds = new Set(['atoms', 'components', 'pages']);

export function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; kind: string; uuid: string }> },
) {
  return respond(async () => {
    const { projectId, kind, uuid } = await context.params;
    if (!kinds.has(kind)) {
      return Response.json({ error: 'Invalid catalog kind' }, { status: 400 });
    }
    const patch = (await request.json()) as Partial<NodeDefinitionModel>;
    return Response.json(
      await apiController.projects.catalog.patchDefinition(
        await authenticatedActor(request),
        projectId,
        kind as 'atoms' | 'components' | 'pages',
        uuid,
        patch,
      ),
    );
  });
}

export function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; kind: string; uuid: string }> },
) {
  return respond(async () => {
    const { projectId, kind, uuid } = await context.params;
    if (!kinds.has(kind)) {
      return Response.json({ error: 'Invalid catalog kind' }, { status: 400 });
    }
    return Response.json(
      await apiController.projects.catalog.removeDefinition(
        await authenticatedActor(request),
        projectId,
        kind as 'atoms' | 'components' | 'pages',
        uuid,
      ),
    );
  });
}
