import { apiController } from '@facadeur/api/server';
import type { NodeDefinitionModel } from '@facadeur/core';
import { authenticatedActor, respond } from '../../../../transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const kinds = new Set(['atoms', 'components', 'pages']);

export function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; kind: string }> },
) {
  return respond(async () => {
    const { projectId, kind } = await context.params;
    if (!kinds.has(kind)) {
      return Response.json({ error: 'Invalid catalog kind' }, { status: 400 });
    }
    const definition = (await request.json()) as Omit<NodeDefinitionModel, 'uuid'> & {
      uuid?: string;
    };
    return Response.json(
      await apiController.projects.catalog.createDefinition(
        await authenticatedActor(request),
        projectId,
        kind as 'atoms' | 'components' | 'pages',
        definition,
      ),
    );
  });
}
