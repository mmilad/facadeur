import { apiController } from '@facadeur/api/server';
import type { ManagementCommand } from '@facadeur/api';
import { assertSameOrigin, readJson, authenticatedActor, respond } from '../transport';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return respond(async () =>
    Response.json(await apiController.workspace.load(await authenticatedActor(request))),
  );
}

export function POST(request: Request) {
  return respond(async () => {
    assertSameOrigin(request);
    const actor = await authenticatedActor(request);
    const body = (await readJson(request)) as { command: ManagementCommand };
    return Response.json(await apiController.workspace.command(actor, body?.command));
  });
}
