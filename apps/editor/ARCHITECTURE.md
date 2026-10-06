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

Session, editing commands, selection, viewports, style/token edit helpers and frame host.
`domain/api.ts` supplies one typed `@facadeur/api-client` HTTP client. Project connection state and browser
recovery migration remain here; HTTP transport, schema reconciliation and file persistence
are consumed through package public APIs. Account hooks subscribe to API session changes.

`session.project` owns live document state. Renderer stores are Core controller views;
they hold history snapshots but no independent live document. Core changes publish after
commit, so selection, dirty state, Undo and rendering observe the same state. The editor
has no Yjs dependency or WebSocket transport. Retired integration files are preserved as
text in `legacy/yjs/`; the separate server and adapter package remain optional legacy code.

## UI (`src/ui/`)

| Area     | Path               | Role                                                      |
| -------- | ------------------ | --------------------------------------------------------- |
| Shell    | `shell/`           | Top bar, `EditorShell`, tools                             |
| Stage    | `stage/`           | Canvas + design-domain stage                              |
| Form kit | `form/`            | Generic form components (unchanged contract)              |
| Controls | `controls/<name>/` | Domain controls (`Component.tsx`, `value.ts`, `index.ts`) |
| Sidebar  | `sidebar/`         | Chrome around the tree and inspector                      |

### Properties inspector (`sidebar/properties/`)

- `PropertiesPanel.tsx`, `RightRail.tsx`, `ViewportEditBar.tsx`
- `content/` — Content tab fields + Data definitions (fields, variants, bindings)
- `style/declarations/` — style block CSS declarations (`CssDeclarationsControl`)
- `style/variants/` — per-layer variant styles
- `style/overrides/` — per-node style overrides (color/typography/shadow controls)
- `layout/` — layout control panel

### Layers & design (`sidebar/layers/`, `sidebar/design/`)

Project tree, viewport list/options, token/font design panels.

## Styles (`src/ui/styles/`)

Co-located CSS chunks imported from `app/globals.css` (base, shell, design, stage, sidebar). `src/styles.css` is a stub.
