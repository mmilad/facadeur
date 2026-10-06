import { apiController } from '@facadeur/api/server';
import { authenticatedActor, respond } from '../../transport.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return respond(async () => {
    const { projectId } = await context.params;
    return Response.json(
      await apiController.projects.load(await authenticatedActor(request), projectId),
    );
  });
}
