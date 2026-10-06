# facadeur

Design-system foundation: a JSON document rendered as real DOM on a zoomable stage, with design tokens, fonts, and one iframe per viewport.

A document has a kind (`atom`, `component`, `section`, or `page`) and a tree of `frame`, `text`, `image`, and `instance` nodes. The HTML tag is a property. Instances point at another document and may only override fields and variants. Pages contain sections. The file on disk is nested JSON; the editor's store keeps a flat map of nodes and runs every change as a command.

This repository is the design-system editor through code generation: document model, controller-owned state, tokens, fonts, a live style engine, a DOM renderer that patches nodes in place, viewport frames, a React shell around that stage, and a React generator for Next.js. The specimen page is the document that opens first.

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

ProjectController owns editing state and snapshot Undo/Redo. The [project API](docs/project-api.md)
loads JSON and saves explicitly, with source-hash checks. Yjs synchronization is deferred.

## Documentation

- [Document DSL and styling contracts](docs/dsl.md)
- [Schema, preview data, variants and events](docs/editor-data.md)
- [Editor form primitives](docs/editor-form.md)
- [Local project API and recovery](docs/project-api.md)
- [Editor package boundaries](apps/editor/ARCHITECTURE.md)
- [Current plan and recorded decisions](docs/plan.md)
- [Archived implementation history and dated decisions](docs/plan-history.md)

## Generate React and Storybook

```bash
pnpm codegen
pnpm --dir dist/facadeur install
pnpm storybook
```

`pnpm codegen` reads the example documents, `examples/project-template.json`, and the shared schema library `examples/schemas.json` through `--schemas`, then writes:

- **`dist/facadeur/packages/ui`** — React components, shared schema types, exports and CSS (`@facadeur/ui`)
- **`dist/facadeur/apps/storybook`** — Storybook configuration and CSF3 stories
- **`dist/facadeur/apps/next`** — Next.js demonstration app

`dist/facadeur` is an independent pnpm monorepo with its own manifests and TypeScript configuration. It has no runtime dependencies on the Facadeur editor or source packages. Install its dependencies separately; the output can be copied to another directory. Generated output is ignored by Git. Regeneration replaces managed files and removes obsolete generated files while preserving additional custom files and the generated workspace lockfile.

For other document collections, use `--workspace <directory>` instead of `--out`/`--storybook`. `--next-example` includes the bundled Next demo, which uses the example Card, Input, SignIn and Button components.

Storybook opens at http://localhost:6006 and lists every generated atom, component, section, and page.

The thin Next.js sample still consumes the same package:

```bash
pnpm --dir dist/facadeur next
```

Open the URL Next prints (http://localhost:3000). The page renders Button (tone and size props), Input, Sign in, and Card from `@facadeur/ui`. The input demo displays the semantic event name, native event type and typed data as you edit. Generated native controls use initial defaults, so they are editable without application state.

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
packages/core           types, JSON Schema, flat model, commands, DocumentStore
packages/api            data contracts and controllers (auth, roles, SQL, JSON storage)
packages/api-client     typed HTTP SDK for the editor's API routes
packages/store-yjs      retained legacy adapter; not used by the editor
packages/tokens         DTCG parser, reference resolution, CSS custom properties, project template
packages/style-engine   live CSSStyleRules, component style blocks, auto layout
packages/renderer-dom   document JSON to DOM, targeted updates from the store
packages/codegen       Shared code-generation entry point; React output engine
examples/               specimen page, section, atoms, and examples/project-template.json
dist/facadeur/          standalone generated monorepo (UI, Storybook, Next.js)
schema/                 generated JSON Schema
docs/dsl.md             the document format
docs/plan.md            milestones
```

The stage renders the open document: the specimen is a page whose only child is a section instance, which instances the atoms and components. Each viewport frame has its own renderer and style engine, subscribed to the asset stores. Project tokens and fonts live in a design store seeded from `examples/project-template.json` and are pushed into every frame with `setDesign`. Opening an atom, component, or section paints that document's root; a page keeps the root as the unpainted canvas.

To print the default stylesheet:

```bash
pnpm exec tsx -e "import { createProjectTemplate, renderDesignCss } from './packages/tokens/src/index.ts'; console.log(renderDesignCss(createProjectTemplate()))"
```
