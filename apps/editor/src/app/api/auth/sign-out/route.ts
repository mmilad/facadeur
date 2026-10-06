import { apiController } from '@facadeur/api/server';
import { assertSameOrigin, readSessionToken, respond, sessionCookie } from '../../transport.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  return respond(async () => {
    assertSameOrigin(request);
    await apiController.auth.signOut(readSessionToken(request));
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(null) } });
  });
}
