import type {
  AuthSession,
  AuthUser,
  MockSignIn,
  ManagementCommand,
  ManagementResult,
  ManagementSnapshot,
  ProjectSnapshot,
  SaveDocumentRequest,
  SaveDocumentResult,
} from '@facadeur/api';

export interface ApiClientOptions {
  /** Relative for same-origin browser requests, absolute for other consumers. */
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Shared transport only: application state and document commands belong to consumers. */
export function createApiClient(options: ApiClientOptions = {}) {
  const base = (options.baseUrl ?? '/api').replace(/\/$/, '');
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 10000);
    const response = await (options.fetch ?? globalThis.fetch)(base + path, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
      headers: {
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : `API request failed (${response.status})`;
      throw new ApiError(response.status, message);
    }
    if (body === undefined)
      throw new ApiError(response.status, 'The server returned an empty response');
    return body as T;
  }
  const post = <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return {
    auth: {
      session: () => request<AuthSession>('/auth/session'),
      signIn: (input: MockSignIn) => post<{ user: AuthUser }>('/auth/sign-in', input),
      signOut: () => post<{ ok: true }>('/auth/sign-out'),
    },
    workspace: {
      load: () => request<ManagementSnapshot>('/workspace'),
      command: (command: ManagementCommand) => post<ManagementResult>('/workspace', { command }),
    },
    projects: {
      load: (projectId: string, init: { signal?: AbortSignal } = {}) =>
        request<ProjectSnapshot>('/projects/' + encodeURIComponent(projectId), init),
      save: (projectId: string, documentId: string, body: SaveDocumentRequest) =>
        post<SaveDocumentResult>(
          '/projects/' +
            encodeURIComponent(projectId) +
            '/documents/' +
            encodeURIComponent(documentId) +
            '/save',
          body,
        ),
    },
  };
}
