import { apiController } from '@facadeur/api/server';
import type { MockSignIn } from '@facadeur/api';
import { assertSameOrigin, readJson, respond, sessionCookie } from '../../transport';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  return respond(async () => {
    assertSameOrigin(request);
    const { user, token } = await apiController.auth.signIn(
      (await readJson(request)) as MockSignIn,
    );
    return Response.json({ user }, { headers: { 'Set-Cookie': sessionCookie(token) } });
  });
}
