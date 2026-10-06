# Facadeur API

This package owns workspace contracts, application controllers, business rules and persistence.
It depends on Core's document contracts and Tokens' design validation; it never imports apps.

| Entry                  | Responsibility                                                         |
| ---------------------- | ---------------------------------------------------------------------- |
| `@facadeur/api`        | Browser-safe data contracts and domain error codes                     |
| `@facadeur/api/server` | Data-only controller, identity, authorization and trusted JSON storage |
| `@facadeur/api/schema` | Portable legacy schema reconciliation and design validation            |

```ts
import { apiController } from '@facadeur/api/server';

const { user, token } = await apiController.auth.signIn({ email: 'developer@example.com' });
const workspace = await apiController.workspace.load(user);
const project = await apiController.projects.load(user, workspace.projects[0]!.id);
```

Controllers accept typed inputs and a trusted authenticated actor, return data and throw
`DomainError` with semantic codes. They do not accept HTTP requests or own URLs, cookies,
headers, response serialization or status codes. Callers must resolve the actor from a
trusted session; never accept identity or roles from a browser-submitted body.

Next routes in the editor host the HTTP transport: they extract parameters and JSON, resolve
the session cookie, check origin and map domain errors to responses. The separate
[`@facadeur/api-client`](../api-client/README.md) package supplies the browser HTTP SDK.
Applications own React subscriptions, navigation, selection, Undo and unsaved-change prompts.

`server/auth` owns mock identity and sessions; `server/management` owns SQLite, role checks,
organisation/project commands and invitation transactions; `server/project` owns JSON
validation, hashing, atomic writes and recovery. SQL stays private to server modules.
The root contracts and schema entries never import those Node modules.

The boundary preserves endpoint payloads, SQLite tables, storage locations, legacy examples
claim, recovery drafts and role restrictions. See [the HTTP contract](../../docs/project-api.md)
for configuration. Mock authentication remains disabled in production.
