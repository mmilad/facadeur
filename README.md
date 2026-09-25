# facadeur

Design-system foundation: a JSON document rendered as real DOM on a zoomable stage, with design tokens, fonts, and one iframe per viewport.

A document has a kind (`atom`, `component`, `section`, or `page`) and a tree of `frame`, `text`, `image`, and `instance` nodes. The HTML tag is a property. Instances point at another document and may only override fields and variants. Pages contain sections. The file on disk is nested JSON; the editor's store keeps a flat map of nodes and runs every change as a command.

This repository is the design-system editor through code generation: document model, Yjs store, tokens, fonts, a live style engine, a DOM renderer that patches nodes in place, viewport frames, a React shell around that stage, and a React generator for Next.js. The specimen page is the document that opens first.

## Run the editor

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (http://localhost:5173). The specimen page is open. From there you can:

- Browse the project tree in the left column: Design (Tokens, Schriften), then Atoms, Components, Sections, and Pages. Click an asset to open it on the stage. The layers list under the tree follows the open document. Search filters the tree. **Neu anlegen** adds an empty document of that kind. Drag a row onto the stage to insert an instance when nesting allows it. Nesting rules still apply when a command would break them.
- Three frames sit side by side: mobile 375, tablet 768, desktop 1440. Each iframe is that wide, so real media queries change type size and, on desktop, the card row.
- Scroll over the stage, including over a frame, to zoom toward the cursor. Drag to pan. The dot grid moves with the stage.
- Click an element to select the node that belongs to the open document. A click inside an instance selects that instance. The same id is outlined in every frame. The layers list selects the same node.
- Edit name, tag, text, image source, attributes, style overrides, instance fields and variants, and a root field's default in the properties panel. Each edit is a command.
- Change a project token or font. Every viewport picks up the new CSS variables. **Save design** writes that document.
- Undo with Ctrl+Z (Cmd+Z on macOS) and redo with Ctrl+Shift+Z.
- **Open** reads a document JSON (File System Access API, or a file input). **Save** writes the open document back, or downloads it when the browser has neither the file API nor the dev server.
- Hover shows the click target in the frame under the pointer. Escape clears the selection. **Reset view** fits the frames again.

## Generate React for Next.js

```bash
pnpm codegen
pnpm --filter @facadeur/example-next dev
```

`pnpm codegen` reads the example documents and `examples/project-template.json`, then writes React components and CSS to `examples/next/generated`. The example app imports that output. Open the URL Next prints (http://localhost:3000). The page renders Button (tone and size props), Input, Sign in, and Card from the generated components. Tokens, fonts, and style blocks are the generated stylesheets.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

`pnpm schema` rewrites `schema/document.schema.json` from the TypeBox schema in `@facadeur/core`.

## Layout

```
packages/core           types, JSON Schema, flat model, commands, DocumentStore
packages/store-yjs      Yjs DocumentStore, one transaction per command, undo/redo
packages/tokens         DTCG parser, reference resolution, CSS custom properties, project template
packages/style-engine   live CSSStyleRules, component style blocks, auto layout
packages/renderer-dom   document JSON to DOM, targeted updates from the store
packages/editor         Vite + React shell (stage, layers, properties, assets, tokens, fonts)
packages/codegen-react  React components and CSS from documents
examples/               specimen page, section, atoms, and examples/project-template.json
examples/next           Next.js app that renders the generated components
schema/                 generated JSON Schema
docs/dsl.md             the document format
docs/plan.md            milestones
```

The stage renders the open document: the specimen is a page whose only child is a section instance, which instances the atoms and components. Each viewport frame has its own renderer and style engine, subscribed to the asset stores. Project tokens and fonts live in a design store seeded from `examples/project-template.json` and are pushed into every frame with `setDesign`. Opening an atom, component, or section paints that document's root; a page keeps the root as the unpainted canvas.

To print the default stylesheet:

```bash
pnpm exec tsx -e "import { createProjectTemplate, renderDesignCss } from './packages/tokens/src/index.ts'; console.log(renderDesignCss(createProjectTemplate()))"
```
