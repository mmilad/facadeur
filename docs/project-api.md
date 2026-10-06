# Organisation, project and JSON API

The editor runs on localhost:3001. `packages/api` owns development identity, organisation membership, authorization, project discovery and JSON persistence. Its controllers receive typed data and a trusted actor. Next routes parse HTTP inputs, resolve cookies, check origin and serialize controller results or domain errors. The editor consumes the typed HTTP SDK in `packages/api-client`; Core's ProjectController still owns live editing state and snapshot Undo/Redo. No separate server or Yjs runtime is required.

## Development account and workspace

Sign in with an email address and optional display name. This is explicitly **mock authentication**: there is no password or email verification. Sessions use an opaque HttpOnly, SameSite=Lax cookie whose token hash is stored in SQLite. Mock login and session lookup are disabled when `NODE_ENV=production`; a real identity provider is future work.

Create an organisation, then create a project or choose **Add example projects**. The latter registers the existing examples directory in place, preserving source files and recovered drafts. Only the first development account can claim it, once, into an organisation it manages. The examples are inaccessible through project routes before this explicit claim.

| Method | Path                                        | Result                                                                                 |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| GET    | /api/auth/session                           | `{ user }`, or `null` when signed out                                                  |
| POST   | /api/auth/sign-in                           | Mock sign-in with `{ email, name? }`                                                   |
| POST   | /api/auth/sign-out                          | Revoke the current session and clear its cookie                                        |
| GET    | /api/workspace                              | Current user, organisations, projects, members and permitted invitations               |
| POST   | /api/workspace                              | Execute `{ command }` and return the updated snapshot                                  |
| GET    | /api/projects/:projectId                    | Design, documents, source filenames, hashes, recovered unsaved IDs and access metadata |
| POST   | /api/projects/:projectId/documents/:id/save | Explicitly write a document JSON snapshot                                              |

Workspace commands create/rename/archive/restore organisations and projects, claim examples, invite/accept/revoke invitations, and change/remove memberships. See `packages/api/src/contracts/management.ts` for exact payloads. Invitation creation returns a link token for manual sharing; it does not send email. Tokens expire after seven days, are single-use, and require signing in with the invited email address.

Every project request checks the session and current organisation membership on the server. Viewers can preview documents and generated code; editors can also save. Admins manage projects and non-owner memberships. Owners can manage ownership, with the last owner protected from removal or demotion. Archived projects/organisations cannot be opened until restored. Unknown or inaccessible projects return 404; disallowed operations return 403; signed-out requests return 401. Mutations require a same-origin `Origin` header.

`/api/projects/default` and its save route remain compatible aliases for the explicitly claimed examples project and enforce the same access checks. The editor uses `?project=<id>` to select a project. Leaving an edited project offers **Save and leave**, **Discard and leave**, or **Keep editing**; failed saves retain the active session.

## Storage and explicit saves

Use Node.js 22.13 or later for built-in SQLite support. `FACADEUR_MANAGEMENT_DIR` sets the metadata/storage directory, defaulting to `.facadeur` under the editor process's working directory (`apps/editor/.facadeur` with `pnpm dev`). It contains `management.sqlite` and `projects/<projectId>/`. New projects start with independent design settings and a starter section. Their recovery file is scoped to the project directory.

Databases from the earlier auth implementation migrate membership references from `user` to
`mock_users` automatically. Existing identities are matched by normalized email; membership IDs,
roles, organisations and projects are retained. Legacy auth tables remain intact.

`FACADEUR_PROJECT_DIR` selects the legacy examples directory, defaulting to repository `examples/` when running the editor package. Its historical recovery file remains `.facadeur/editor-recovery.json` beside that directory. Back up both metadata and project JSON when moving a workspace; metadata records trusted absolute storage locations.

Save accepts `{ document, source, expectedHash }`. Use the source/hash from GET; a new document uses its chosen JSON filename and a null hash. The document ID must match the URL. Validation includes the current catalog and design schema. Saves are serialized and files are replaced atomically. A source changed externally returns 409. Saving a snapshot only clears the dirty baseline for that exact snapshot, preserving later edits.

Editing stays in the browser until Save. Export JSON remains a browser download. Code generation reads the exported files, so save before generating components. There is currently no cross-tab collaboration, remote command API, or automatic persistence of new edits.

During the Yjs removal, 13 unsaved documents (including new-atom) were recovered into ignored `.facadeur/editor-recovery.json`. GET overlays these drafts onto unchanged source files and marks them unsaved. Save removes only the successfully exported draft from recovery. `.facadeur/yjs-retirement-snapshot.json` preserves the full prior catalog; original durable Yjs data is untouched. A conflicting source is reported instead of silently overriding either version.

Discarding an in-memory session does not delete source files or recovered drafts. The former server and sync adapter remain outside the editor runtime as reference code; see [the legacy API](project-api-yjs-legacy.md).
