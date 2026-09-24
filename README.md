# facadeur

Design-system foundation: a JSON document rendered as real DOM on a zoomable stage, with design tokens and fonts.

A document has a kind (`atom`, `component`, `section`, or `page`) and a tree of `frame`, `text`, `image`, and `instance` nodes. The HTML tag is a property. Instances point at another document and may only override fields and variants. Pages contain sections. The file on disk is nested JSON; the editor's store keeps a flat map of nodes and runs every change as a command.

This repository is the M2 foundation (document model, Yjs store, tokens, fonts) plus the original stage. It is not the product UI yet. The stage injects the default token stylesheet as `<style id="facadeur-tokens">`. Components are not painted from those tokens yet.

## Run the stage

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (http://localhost:5173). From the page you can:

- Scroll over the stage to zoom toward the cursor.
- Drag empty canvas to pan. The dot grid moves and zooms with the stage.
- Click a button, a card, a title inside a card, or a label to select that node.
- Read the selected id, fields, and variants in the sidebar.
- Click empty background, or press Escape, to clear the selection.
- Use **Reset view** to fit the sheet again.

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
packages/renderer-dom   document JSON to DOM
packages/editor         Vite stage (pan, zoom, grid, selection)
examples/               specimen page, section, atoms, and examples/project-template.json
schema/                 generated JSON Schema
docs/dsl.md             the document format
docs/plan.md            milestones
```

The stage still renders the specimen: a page whose only child is a section instance, which instances the atoms and components. React panels and the style engine are later milestones. `examples/project-template.json` is the optional starter (colors, spacing, radius, shadows, Inter, type scale).

To print the default stylesheet:

```bash
pnpm exec tsx -e "import { createProjectTemplate, renderDesignCss } from './packages/tokens/src/index.ts'; console.log(renderDesignCss(createProjectTemplate()))"
```
