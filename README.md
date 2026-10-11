# facadeur

Design-system editor for a versioned component catalog, with tokenized design settings and responsive preview frames.

A catalog contains atoms, components, pages, schemas, tokens, and global styles. Core owns the catalog model and editing state; the React editor renders previews and Style Engine produces design and component CSS.

This repository contains the editor and its catalog-to-project generation packages. The standalone DOM renderer is deprecated; the active canvas is React-based.

## Run the editor

```bash
pnpm install
pnpm dev
```

Use Node.js 22.13 or later. Open http://localhost:3001 (Next.js). `pnpm dev` starts only the
editor. Sign in with any development email address, create an organisation, then create a
project. The first account can choose **Add example projects** to open the existing examples
and recovered drafts. Mock authentication is labelled in the UI and disabled in production.
Invite another development account with a copied invitation link and choose admin, editor or
viewer access. Organisation/project metadata is persisted in SQLite; document JSON stays
project-local. See the [project API](docs/project-api.md) for storage configuration and roles.

From an open project you can:

- Browse the project tree in the left column: Design (Tokens, Schriften), then Atoms, Components, Sections, and Pages. Click an asset to open it on the stage. The layers list under the tree follows the open document. Search filters the tree. **Neu anlegen** adds an empty document of that kind. Drag a row onto the stage to insert an instance when nesting allows it. Nesting rules still apply when a command would break them.
- Three frames sit side by side: mobile 375, tablet 768, desktop 1440. Each iframe is that wide, so real media queries change type size and, on desktop, the card row.
- Scroll over the stage, including over a frame, to zoom toward the cursor. Drag to pan. The dot grid moves with the stage.
- Click an element to select the node that belongs to the open document. A click inside an instance selects that instance. The same id is outlined in every frame. The layers list selects the same node.
- Edit name, tag, text, image source, attributes, style overrides, instance fields and variants, and a root field's default in the properties panel. Each edit is a command.
- Change a project token or font. Every viewport picks up the new CSS variables. **Save design** writes that document.
- Undo with Ctrl+Z (Cmd+Z on macOS) and redo with Ctrl+Shift+Z.
- **Open** imports a document JSON into the controller. **Save** writes its current snapshot to project JSON without a file picker. **Export JSON** downloads it. New edits stay in memory until Save.
- Hover shows the click target in the frame under the pointer. Escape clears the selection. **Reset view** fits the frames again.

CoreController owns the active catalog and editing state. The [project API](docs/project-api.md)
loads JSON and saves explicitly, with source-hash checks. Yjs synchronization is deferred.

## Documentation

- [Document DSL and styling contracts](docs/dsl.md)
- [Schema, preview data, variants and events](docs/editor-data.md)
- [Editor form primitives](docs/editor-form.md)
- [Local project API and recovery](docs/project-api.md)
- [Editor package boundaries](apps/editor/ARCHITECTURE.md)
- [Current plan and recorded decisions](docs/plan.md)
- [Archived implementation history and dated decisions](docs/plan-history.md)

## Code generation and Storybook

The editor's Storybook runs with:

```bash
pnpm storybook
```

`packages/codegen` owns React project generation from a canonical `ProjectCatalog`. Run
`pnpm codegen --catalog catalog.json --workspace ./generated-project`; see the
[Codegen guide](packages/codegen/README.md) for component-only output and options. Legacy
`DocumentFile` JSON inputs are no longer supported.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

`pnpm schema` rewrites `schema/document.schema.json` from the TypeBox schema in `@facadeur/core`.

## Layout

```
apps/editor             Next.js + React shell (stage, layers, properties, assets, tokens, fonts)
apps/server             retained legacy Yjs server; not started by pnpm dev
packages/core           catalog controller, document contracts, validation, and editing commands
packages/api            data contracts and controllers (auth, roles, SQL, JSON storage)
packages/api-client     typed HTTP SDK for the editor's API routes
packages/store-yjs      retained legacy adapter; not used by the editor
packages/style-engine   live CSSStyleRules, component style blocks, auto layout
packages/codegen       Shared code-generation entry point; React output engine
packages/examples       shared fixture catalogs for Storybook and tests
schema/                 generated JSON Schema
docs/dsl.md             the document format
docs/plan.md            milestones
```

The Editor renders its canvas with React. Core owns the active catalog and editing state; Style Engine compiles and injects design and component styles. Shared catalogs and token fixtures live in `packages/examples` and are reused by Storybook and tests.

To print the default stylesheet:

```bash
pnpm exec tsx -e "import { createProjectTemplate } from '@facadeur/examples'; import { renderDesignCss } from '@facadeur/style-engine'; console.log(renderDesignCss(createProjectTemplate()))"
```
