# Editor package layout

The editor lives in `apps/editor` (npm name `@facadeur/editor`). This note documents the ownership model after the Next.js migration.

## App shell (`src/app/`)

- Next.js App Router entry: `layout.tsx`, `page.tsx`, `globals.css`
- `EditorBootstrap.tsx` — client session bootstrap (specimen catalog + design template)
- `api/facadeur/examples/route.ts` — dev save fallback (`PUT /__facadeur/examples` via rewrite)

**Routing:** design-domain vs properties uses the `?surface=` query segment (`properties` default; `colors`, `fonts`, etc. for design domains). The iframe stage is unchanged on `/`.

## Domain (`src/domain/`)

Session, editing commands, selection, viewports, style/token edit helpers, files I/O, frame host — no React.

## UI (`src/ui/`)

| Area | Path | Role |
|------|------|------|
| Shell | `shell/` | Top bar, `EditorShell`, tools |
| Stage | `stage/` | Canvas + design-domain stage |
| Form kit | `form/` | Generic form components (unchanged contract) |
| Controls | `controls/<name>/` | Domain controls (`Component.tsx`, `value.ts`, `index.ts`) |
| Sidebar | `sidebar/` | Chrome around the tree and inspector |

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
