# Organisation and project management

Status: implemented SQLite organisation/project storage with mock authentication, as requested.
Project access and save permissions are enforced by server-side membership and role checks.
Mock sign-in chooses a development identity; it does not prove ownership of an email address.
Keep that adapter separate from management so real authentication can replace it later.

## Ownership and hierarchy

An organisation contains projects. A project owns its document catalog, design settings,
schema catalog, save baselines and recovered drafts. Stable IDs identify organisations and
projects independently of editable display names. Document IDs are unique within a project.
Existing component references remain project-local; shared organisation libraries are separate
future work rather than implicit cross-project references.

Management metadata belongs outside document JSON. Core's ProjectController continues to own
one open project's document commands and Undo. `packages/api` owns project discovery,
persistence, memberships and authorization through typed, data-only controllers. The editor
consumes the HTTP SDK in `packages/api-client` and owns selection, navigation and presentation.
Next routes own HTTP parsing, cookies, origin checks and response/error serialization.

## First management flow

- Organisation/project overview with create, rename and open actions.
- An active organisation/project selector in the editor with navigation back to the overview.
- Project-aware URLs, loading and save endpoints instead of hardcoded `default` requests.
- A new project starts with its own design settings and an initial editable document.
- Switching preserves unsaved work: offer save, cancel, or an explicit discard before replacing
  the session. A failed save must keep the current project open and its changes intact.
- Organisation/project archive is recoverable; permanent deletion and moving projects require
  their own deliberate management flows rather than deleting source directories implicitly.

## Shared accounts and roles

Use server-authenticated user identity; never accept a user ID or role from the browser as
authorization. Each organisation has memberships. The initial role model is owner, admin,
editor and viewer: viewers read projects, editors also save document/design changes, admins
manage projects and invite/manage non-owner members, and owners additionally manage ownership.
Prevent removal or demotion of the last owner. Organisation membership grants project access
initially; project-specific exceptions are a separate feature.

Invitations belong to an organisation, recipient and chosen role, with expiration and a
single-use acceptance flow. Invitation acceptance requires matching authenticated identity.
Use a separate identity/session adapter rather than implementing password/session cryptography
inside the document domain. Authentication is mocked for this initial development flow. Configure delivery separately;
creating an invitation does not authorize sending email until the user chooses that workflow.

Authorize list, read, create, rename, archive and save operations on the server. Protect legacy
default-project routes too, so old endpoints cannot bypass access checks. Legacy examples are
claimed through an explicit initial organisation setup, never automatically exposed to every
new account. Project resolution must derive a trusted storage location after authorization.

Management tables contain users/memberships, organisations, invitations and project metadata.
Document JSON storage remains an adapter behind project identity; recovered drafts, hashes and
write serialization must be scoped to that project. Keep authentication secrets and membership
metadata out of document exports and generated frontend code.

## Refactoring prerequisites

Evidence: project/client.ts hardcodes both loading and saving to `/api/projects/default`;
project/files.ts discovers one environment-configured directory and one recovery file.
EditorBootstrap owns one connection without project identity.

Boundary: introduce explicit selected project identity and resolved storage location at the
existing project loading boundary. Keep source hashing, atomic writes, draft conflict handling
and document validation together in the file adapter. Place management metadata/storage and
overview UI next to their domain; avoid adding organisation membership to document schemas.
The 488-line create-editor-session.ts remains cohesive session wiring and should not absorb
management/discovery or account lifecycle responsibilities.

Compatibility: register the current examples project in place, retaining its source files and
recovery location. Preserve legacy URLs while project-aware navigation is introduced. Preserve
current user staging, document formats, codegen inputs, explicit save behavior and Undo history
within each active project.

Validation: independent project catalogs and schema ownership; management metadata survives
restart; renaming preserves IDs; unknown projects and unsafe storage paths are rejected;
saves and recovered drafts cannot cross project boundaries; cancelled or failed switching
preserves edits; navigation opens the intended project; typecheck, relevant persistence/UI
tests, browser workflows and candidate detector rerun.

## Infrastructure decision before implementation

Use mock authentication and SQLite metadata in Next. Identity has its own API and session
adapter; organisation/project access still uses stored memberships. Mock authentication must
be explicitly identified in the UI and must not silently enable a production deployment.
The legacy server owns Yjs transport and is not the account-management backend. The subsequent
API extraction moves this backend out of editor modules without changing its database or files;
see [the API package](../packages/api/README.md).

## Validation result (2026-10-06)

The full suite passes: 190 test files and 1,091 tests. Source workspace typechecks, scoped
ESLint/Prettier, the isolated editor production build and the affected-path candidate scan pass.
The build retains the existing token-table CSS warning and Node's SQLite experimental notice.
Browser checks used an isolated data directory: organisation/project creation, starter editing,
Keep editing, Save and leave, reopening persisted text, mock sign-out/sign-in, invitation
acceptance and the viewer-only preview all work. Restarting the preview preserved metadata.
Existing source examples, recovery files and staging were not changed by those checks.

Identity remains a development mock, with manual invitation links and no email delivery.
Production authentication and live simultaneous editing are outside this implementation.
