import { apiController, DomainError } from '@facadeur/api/server';
import type { DomainErrorCode } from '@facadeur/api';

const sessionCookieName = 'facadeur_mock_session';
const errorStatus: Record<DomainErrorCode, number> = {
  'invalid-input': 400,
  unauthenticated: 401,
  forbidden: 403,
  'not-found': 404,
  conflict: 409,
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) throw new HttpError(403, 'Origin header is required for mutations');
  if (origin !== new URL(request.url).origin)
    throw new HttpError(403, 'Cross-origin request rejected');
}

export function readSessionToken(request: Request) {
  const entry = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(sessionCookieName + '='));
  return entry?.slice(sessionCookieName.length + 1) || null;
}

export async function authenticatedActor(request: Request) {
  return (await apiController.auth.session(readSessionToken(request)))?.user ?? null;
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw new HttpError(400, 'Invalid JSON request body');
    throw error;
  }
}

export function sessionCookie(token: string | null) {
  return `${sessionCookieName}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? 2592000 : 0}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

/** Translate application errors once; route modules own parameter/body extraction. */
export async function respond(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    const status =
      error instanceof DomainError
        ? errorStatus[error.code]
        : error instanceof HttpError
          ? error.status
          : 500;
    if (status === 500) console.error('[facadeur:api]', error);
    return Response.json(
      {
        error:
          error instanceof DomainError || error instanceof HttpError
            ? error.message
            : 'API operation failed',
      },
      { status },
    );
  }
}
