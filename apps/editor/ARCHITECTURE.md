# Editor package layout

The editor lives in `apps/editor` (npm name `@facadeur/editor`). This note documents the ownership model after the Next.js migration.

## App shell (`src/app/`)

- Next.js App Router entry: `layout.tsx`, `page.tsx`, `globals.css`
- `EditorBootstrap.tsx` — account gate and selected project workspace
- `api/auth/`, `api/workspace/`, `api/projects/` — thin Next hosting adapters for `@facadeur/api/server`
- Routes own HTTP parsing, cookies, origin checks and responses; controllers receive typed data and a trusted actor
- `packages/api` — backend ownership: mock identity, memberships, permissions, invitations,
  SQLite and JSON persistence; no SQL or management business rules live in editor modules

**Routing:** design-domain vs properties uses the `?surface=` query segment (`properties` default; `colors`, `fonts`, etc. for design domains). The iframe stage is unchanged on `/`.

## Domain (`src/domain/`)

Session, selection, viewport and tool state live in `src/domain/session/`. The session owns a
`CoreController`; the active `ProjectCatalogModel` and open definition are read and mutated through
that controller. `AppService` connects catalog persistence and definition operations to the
`EditorCatalogPort`. React UI state such as selection, viewport focus, drag state and zoom remains
in `EditorSession`.

`domain/api.ts` supplies the typed `@facadeur/api-client` client. HTTP transport, schema
reconciliation and file persistence are consumed through package public APIs. Account hooks
subscribe to API session changes. The Editor itself has no Yjs dependency or WebSocket transport.

`EditorSnapshot.design` contains only the Catalog-backed token tree, optional icon definitions,
and active breakpoints. There is no synthetic `FlatDocument` projection in the active Catalog
session. Retired integration files are preserved as text in `legacy/yjs/`, and the separate server
and adapter package remain optional legacy code.

## UI (`src/ui/`)

| Area         | Path                     | Role                                                             |
| ------------ | ------------------------ | ---------------------------------------------------------------- |
| Shell        | `shell/`                 | Top bar, `EditorShell`, tools                                    |
| Stage        | `stage/`                 | Catalog-backed canvas + design-domain stage                      |
| Form binding | `controls/form-binding/` | Catalog/path adapters over reusable fields from `@facadeur/form` |
| Controls     | `controls/<name>/`       | Editor controls composed from shared form fields                 |
| Sidebar      | `sidebar/`               | Chrome around the Catalog tree and inspector                     |

### Properties inspector (`sidebar/properties/`)

- `PropertiesPanel.tsx`, `RightRail.tsx`
- Catalog-backed content and data controls live with their owning sidebar/settings domains.
- The active inspector is `CatalogNodeInspector`. The old DocumentFile structured style inspector
  and guided grid UI were retired because they had no product callers; their controls are not
  claimed as Catalog feature parity. Active CSS declaration editing remains in `controls/`.

### Layers & design (`sidebar/layers/`, `design/`)

The project tree and viewport list/options live in `sidebar/layers/`; design-domain panels live in
`design/`. Reusable form elements live in `@facadeur/form`; Editor controls may wrap them to bind
catalog values and commits.

## Styles (`src/ui/styles/`)

Co-located CSS chunks imported from `app/globals.css` (base, shell, design, stage, sidebar).
