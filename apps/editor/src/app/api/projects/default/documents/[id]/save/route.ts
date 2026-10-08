import { apiController } from '@facadeur/api/server';
import type { SaveDocumentRequest } from '@facadeur/api';
import {
  assertSameOrigin,
  readJson,
  authenticatedActor,
  respond,
} from '../../../../../transport';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    assertSameOrigin(request);
    const { id } = await context.params;
    const projectId = 'default';
    const actor = await authenticatedActor(request);
    const body = (await readJson(request)) as SaveDocumentRequest;
    return Response.json(await apiController.projects.save(actor, projectId, id, body));
  });
}
