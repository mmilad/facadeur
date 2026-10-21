# facadeur

Design-system editor for a versioned component catalog, with tokenized design settings and responsive preview frames.

A catalog contains atoms, components, pages, schemas, tokens, and global styles. Core owns the catalog model and editing state; the React editor renders previews and Style Engine produces design and component CSS.

This repository contains the editor and its catalog-to-project generation packages. The standalone DOM renderer is deprecated; the active canvas is React-based.

## Run the editor preview

```bash
corepack pnpm install
corepack pnpm dev
```

Use Node.js 22.13 or later. `package.json` pins pnpm 10.33.3; Corepack reads that pin, so use
`corepack pnpm` for repository commands. Open http://localhost:3001 (Next.js) for the local
example-backed editor preview, or run `corepack pnpm storybook` to browse the component and editor stories. The local
preview uses an in-memory catalog; Storybook and tests share catalog fixtures from
`packages/examples`.

From an open project you can:

- Browse the project tree in the left column: Design (Tokens, Schriften), then Atoms, Components, Sections, and Pages. Click an asset to open it on the stage. The layers list under the tree follows the open document. Search filters the tree. **Neu anlegen** adds an empty document of that kind. Drag a row onto the stage to insert an instance when nesting allows it. Nesting rules still apply when a command would break them.
- Three frames sit side by side: mobile 375, tablet 768, desktop 1440. Each iframe is that wide, so real media queries change type size and, on desktop, the card row.
- Scroll over the stage, including over a frame, to zoom toward the cursor. Drag to pan. The dot grid moves with the stage.
- Click an element to select the node that belongs to the open document. A click inside an instance selects that instance. The same id is outlined in every frame. The layers list selects the same node.
- Edit name, tag, text, image source, attributes, style overrides, instance fields and variants, and a root field's default in the properties panel. Each edit is a command.
- Change a catalog token or font. Every viewport picks up the new CSS variables.
- Undo with Ctrl+Z (Cmd+Z on macOS) and redo with Ctrl+Shift+Z.
- **Save catalog** updates the in-memory preview. **Export catalog** downloads the current catalog as JSON.
- Hover shows the click target in the frame under the pointer. Escape clears the selection. **Reset view** fits the frames again.

CoreController owns the active catalog and editing state. Save in the local preview updates the
in-memory catalog; use **Export catalog** to download a JSON copy.

## Documentation

- [Document DSL and styling contracts](docs/dsl.md)
- [Schema, preview data, variants and events](docs/editor-data.md)
- [Editor form primitives](docs/editor-form.md)
- [Editor package boundaries](apps/editor/ARCHITECTURE.md)
- [Current plan and recorded decisions](docs/plan.md)
- [Archived implementation history and dated decisions](docs/plan-history.md)

## Code generation and Storybook

The editor's Storybook runs with:

```bash
corepack pnpm storybook
```

`packages/codegen` owns React project generation from a canonical `ProjectCatalog`. Run
`corepack pnpm codegen --catalog catalog.json --workspace ./generated-project`; see the
[Codegen guide](packages/codegen/README.md) for component-only output and options. The generator
accepts canonical `ProjectCatalog` JSON.

## Checks

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
```

`corepack pnpm schema` rewrites `schema/catalog.schema.json` from the TypeBox schema in `@facadeur/core`.

## Layout

```
apps/editor             Next.js + React shell (stage, layers, properties, assets, tokens, fonts)
packages/core           catalog controller, document contracts, validation, and editing commands
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
corepack pnpm exec tsx -e "import { createProjectTemplate } from '@facadeur/examples'; import { renderDesignCss } from '@facadeur/style-engine'; console.log(renderDesignCss(createProjectTemplate()))"
```

# API reference

The generated Core API reference is available in [`docs/api/core`](docs/api/core/README.md).
Regenerate it after changing the public Core entry point or its TSDoc comments with
`corepack pnpm docs:api`.
