# facadeur

Design-system foundation: a JSON document rendered as real DOM on a zoomable stage, with design tokens, fonts, and one iframe per viewport.

A document has a kind (`atom`, `component`, `section`, or `page`) and a tree of `frame`, `text`, `image`, and `instance` nodes. The HTML tag is a property. Instances point at another document and may only override fields and variants. Pages contain sections. The file on disk is nested JSON; the editor's store keeps a flat map of nodes and runs every change as a command.

This repository is the M4 foundation: document model, Yjs store, tokens, fonts, a live style engine, a DOM renderer that patches nodes in place, and viewport frames. It is not the product UI yet. The stage paints the specimen once per breakpoint.

## Run the stage

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (http://localhost:5173). From the page you can:

- Three frames sit side by side: mobile 375, tablet 768, desktop 1440. Each iframe is that wide, so real media queries change type size and, on desktop, the card row.
- Scroll over the stage, including over a frame, to zoom toward the cursor.
- Drag to pan, including over a frame. The dot grid moves and zooms with the stage.
- Click a button, a card, a title, or a label to select that node. The same id is outlined in every frame.
- Hover shows the click target in the frame under the pointer.
- Read the selected id, fields, and variants in the sidebar.
- Click empty background, or press Escape, to clear the selection.
- Use **Reset view** to fit the frames again.

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
packages/editor         Vite stage (pan, zoom, viewport iframes, selection)
examples/               specimen page, section, atoms, and examples/project-template.json
schema/                 generated JSON Schema
docs/dsl.md             the document format
docs/plan.md            milestones
```

The stage renders the specimen: a page whose only child is a section instance, which instances the atoms and components. Each viewport frame has its own renderer and style engine, all subscribed to the same document store. Styles come from each document's style block and the default token set. React panels are a later milestone. `examples/project-template.json` is the optional starter (colors, spacing, radius, shadows, Inter, type scale, breakpoints).

To print the default stylesheet:

```bash
pnpm exec tsx -e "import { createProjectTemplate, renderDesignCss } from './packages/tokens/src/index.ts'; console.log(renderDesignCss(createProjectTemplate()))"
```
