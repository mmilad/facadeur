# facadeur

Design-system foundation: a JSON document rendered as real DOM on a zoomable stage.

A document has a kind (`atom`, `component`, `section`, or `page`) and a tree of `frame`, `text`, `image`, and `instance` nodes. The HTML tag is a property. Instances point at another document and may only override fields and variants. Pages contain sections. The file on disk is nested JSON; the editor's store keeps a flat map of nodes and runs every change as a command.

This repository is the M1 foundation plus the original stage. It is not the product UI yet.

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
packages/renderer-dom   document JSON to DOM
packages/editor         Vite stage (pan, zoom, grid, selection)
examples/               specimen page, section, and the button, input, card, sign-in documents
schema/                 generated JSON Schema
docs/dsl.md             the document format
docs/plan.md            milestones
```

The stage still renders the specimen: a page whose only child is a section instance, which instances the atoms and components. React panels, tokens, and the style engine are later milestones.
