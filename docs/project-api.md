# Local project API

`pnpm dev` starts the editor on localhost:3001 and the project server on
127.0.0.1:3002. Run `pnpm dev:server` and `pnpm dev:editor` separately when needed.
The server loads `examples/` and stores authoritative Yjs history in
`.facadeur/default/project.json` (ignored by Git).

## Edits and Save

Browser commands and HTTP commands change the same server-owned document. WebSocket
updates reach other connected editors. Updates are validated against the complete
catalog and persisted before acknowledgement. API edits are remote transactions:
local Undo does not undo somebody else's API edit.

Save is a separate, explicit export of the current shared state to its JSON source.
It does not open a file picker. Export JSON remains a browser download. Code generation
continues to read these JSON sources, so Save before generating updated components.

| Method | Path                                       | Result                                  |
| ------ | ------------------------------------------ | --------------------------------------- |
| GET    | `/api/projects/default`                    | Catalog, design, sources and Yjs states |
| GET    | `/api/projects/default/documents/:id`      | Document and current revision           |
| POST   | `/api/projects/default/documents`          | Create a new document with `{document}` |
| POST   | `/api/projects/default/documents/:id/edit` | Apply `{revision, command}`             |
| POST   | `/api/projects/default/documents/:id/save` | Export using `{revision}`               |

For example, fetch Card's current revision and submit an ordinary Core command:

```http
GET /api/projects/default/documents/card

POST /api/projects/default/documents/card/edit
Content-Type: application/json

{"revision":0,"command":{"type":"setProp","nodeId":"root","prop":"name","value":"Product card"}}
```

Use the actual revision and root ID from GET, not fixed example values. Edit and Save return the new
revision, savedRevision, Yjs state and document. A stale revision returns 409;
reload the document and reconsider the intended edit instead of blindly retrying.
Invalid commands or updates return 400. Changed JSON sources also return 409 and
are never silently overwritten. Storage failures are reported rather than falling
back to a download or pretending the save succeeded.

The editor connects to `/sync?project=default&id=:id` on the server via WebSocket.
It exchanges state vectors, updates and durable acknowledgements; reconnection
merges outstanding tab edits with the server history. Client-generated documents
may include an initial base64 `update` when creating a document, preserving their
Yjs identity instead of seeding two competing histories.

## Boundaries and recovery

- One local project, no authentication or production deployment yet. The server
  binds to loopback and accepts browser origins only from the configured editor.
- Existing documents synchronize live. New catalog entries currently require a
  reload in other tabs before they can be opened or referenced there.
- Importing JSON over an existing project ID is deliberately rejected. Use editor
  commands or the Edit API; replacement/import migration needs its own policy.
- Schema-library management remains browser-local; `examples/schemas.json` is not
  part of the shared document catalog.
- Unsaved **acknowledged** edits survive a server restart. Offline edits remain in
  the current tab until reconnecting; there is no browser-local durable outbox yet.
- Do not delete the state directory to resolve an external JSON conflict: that
  would discard unsaved shared history. Preserve both versions and explicitly
  reconcile them. A server storage failure requires a restart after repair.
- Run only one server process per state directory. This is not a distributed
  database or a multi-process collaboration deployment.

Configuration: `FACADEUR_PROJECT_DIR`, `FACADEUR_STATE_DIR`,
`FACADEUR_SERVER_PORT` (3002), `FACADEUR_EDITOR_PORT` (3001).
For a separately configured editor use `FACADEUR_API_URL` for its HTTP proxy and
`NEXT_PUBLIC_FACADEUR_SYNC_URL` for the browser WebSocket address.
