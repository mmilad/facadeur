# Facadeur HTTP client

This package adapts the data contracts in `@facadeur/api` to the editor's HTTP endpoints.
It owns URLs, JSON encoding, cancellation, timeouts and `ApiError` response status handling.
It contains no workspace business rules or persistence.

```ts
import { createApiClient } from '@facadeur/api-client';

const api = createApiClient(); // Same-origin /api; accepts baseUrl and custom fetch.
await api.auth.signIn({ email: 'developer@example.com' });
const workspace = await api.workspace.load();
const project = await api.projects.load(workspace.projects[0]!.id);
```

Browsers supply the session cookie and same-origin mutation header. Other HTTP hosts can
provide a fetch adapter that forwards them; the SDK does not maintain its own cookie jar.
Server callers can instead use the data-only controller in `@facadeur/api/server` directly.
