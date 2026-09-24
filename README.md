# facadeur

Design-system foundation: a JSON DSL rendered as real DOM on a zoomable stage.

A page is data. Each node is either an element (`tagName`, `text`, `attributes`, `children`) or a component instance (`type`, `props`, optional `variants`). The renderer expands component instances through JSON templates, then builds DOM the same way a small `buildElement(config)` would. The result sits on a stage you can pan and zoom. Nodes stay selectable because they are elements, not pixels on a canvas.

This is a proof of concept. It is meant to show that the substrate can work, not to be a product.

## Run the demo

ES modules do not load from `file://`. Serve the repository root:

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080>.

Any static file server works the same way. From the page you can:

- Scroll over the stage to zoom toward the cursor.
- Drag empty canvas to pan. The dot grid moves and zooms with the stage, like a camera over an infinite surface.
- Click a button, a card, a title inside a card, or a label to select that node.
- Read the selected `data-id`, props, and variants in the sidebar.
- Click empty background, or press Escape, to clear the selection.
- Use **Reset view** to fit the sheet again.

## Layout

```
index.html              demo shell
src/main.js             loads the page and wires the stage
src/render.js           JSON tree → DOM
src/stage.js            pan and zoom
src/selection.js        hit testing, outline, sidebar
src/styles.css
examples/demo-page.json specimen page
examples/components.json  button, input, and card templates
docs/dsl.md             what a node may contain
schema/node.schema.json page, node, and catalog
```

## DSL

See [docs/dsl.md](docs/dsl.md). The schema matches the fields the renderer reads: element fields, component `type` / `props` / `variants`, placement (`x`, `y`, `width`, `height`), and the component catalog. Strings in a template may use `{{prop}}` placeholders. The page JSON itself has no functions.

Three components ship with the demo:

- **button** — label, plus `tone` and `size` variants
- **input** — label, value, placeholder, and name (static; the field is read-only)
- **card** — eyebrow, title, and body, with optional child nodes

## Not in this POC

Events and triggers, multi-select, resize behavior, inline editing, design tokens, codegen to React or Web Components, persistence, undo, and collaboration. The runtime does not grow hooks for those.
