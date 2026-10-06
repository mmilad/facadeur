import { apiController } from '@facadeur/api/server';
import { readSessionToken, respond } from '../../transport.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return respond(async () =>
    Response.json(await apiController.auth.session(readSessionToken(request))),
  );
}
