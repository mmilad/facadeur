# Facadeur DSL

A page is a JSON document. The renderer walks it and builds DOM. There are two node kinds: **elements** and **component instances**. Component instances expand through a catalog of JSON templates. The JSON contains data only — no functions, and no events.

The demo page is `examples/demo-page.json`. The catalog is `examples/components.json`. The schema for a page, a node, and a catalog is `schema/node.schema.json`.

## Page

```json
{
  "id": "specimen",
  "name": "Specimen",
  "artboard": { "width": 1040, "height": 860 },
  "children": []
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | no | Page id. Not rendered as a DOM id. |
| `name` | yes | Label shown in the demo chrome. |
| `artboard` | no | `{ "width", "height" }` in stage pixels. The demo draws this as the sheet behind the nodes. It is not itself a node. |
| `children` | yes | Top-level nodes, painted on the artboard. |

## Element

A literal HTML element.

```json
{
  "id": "heading",
  "tagName": "h1",
  "text": "Specimen",
  "attributes": { "class": "spec-title" },
  "x": 56,
  "y": 64,
  "width": 480,
  "children": []
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | no | Stable id. Written to `data-id`. Generated (`n1`, `n2`, …) when omitted. |
| `tagName` | no | HTML tag. Defaults to `div`. |
| `text` | no | Text content, inserted before children. |
| `attributes` | no | Map of attribute name to string. Applied with `setAttribute`. |
| `children` | no | Nested nodes, elements or component instances. |
| `x`, `y` | no | Stage position in pixels. Sets `position: absolute; left; top`. |
| `width`, `height` | no | Pixel size, written as inline style. |

`tagName`, `text`, `attributes`, and `children` are the whole element vocabulary. The renderer does not read an `events` field. Attribute names that start with `on` are skipped, so the JSON cannot install handlers.

## Component instance

A reference to a catalog entry, plus the data that fills it.

```json
{
  "id": "btn-primary",
  "type": "button",
  "props": { "label": "Primary" },
  "variants": { "tone": "primary", "size": "md" },
  "x": 56,
  "y": 232,
  "children": []
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | no | Stable id of the instance root. |
| `type` | yes | Catalog key, such as `button`, `card`, or `input`. |
| `props` | no | Map of string, number, or boolean values. |
| `variants` | no | Map of axis name to string, for example `{ "tone": "ghost", "size": "sm" }`. |
| `children` | no | Extra nodes appended after the template's own children. |
| `x`, `y`, `width`, `height` | no | Same placement fields as an element, applied to the instance root. |

`props` and `variants` are data. They are not a place for callbacks.

An unknown `type` still renders a selectable element whose text is `Unknown component: …`.

## Catalog

`examples/components.json` is an object keyed by component type:

```json
{
  "button": {
    "defaults": { "label": "Button", "tone": "primary", "size": "md" },
    "template": {
      "tagName": "button",
      "attributes": {
        "class": "ds-button ds-button--{{tone}} ds-button--{{size}}",
        "type": "button"
      },
      "text": "{{label}}"
    }
  }
}
```

The template is an element tree. Strings may contain `{{name}}` placeholders. The renderer fills them from `defaults`, then instance `props`, then instance `variants`. A missing name becomes an empty string. Numbers and booleans are stringified. Placeholder names are `[A-Za-z0-9_-]` plus dots.

Class names in the templates are styled by `src/styles.css` in this demo. There is no token system.

## Ids

Every rendered element gets a `data-id`.

- A page node uses its `id` as written: `btn-primary`, `card-notes`.
- A node inside a component template is prefixed with the instance id: template id `title` on instance `card-notes` becomes `card-notes/title`.
- Nested template nodes keep gaining prefixes: `card-notes/footer/note`.
- Children supplied on the instance keep the ids the author wrote: `signin-email`, `signin-continue`.
- Their own template nodes are still prefixed: `signin-email/control`.

Ids should be unique in the document. Prefer an explicit `id` on anything you expect to select.

## Selection

Selection is a viewer concern, not a field in the JSON. Click a rendered node to read its `data-id`. Component instances show the authored `props` and `variants` from the page. Elements show tag, text, and attributes. Template nodes also record the instance id they sit inside.

## Out of scope

Events, triggers, multi-select, resize behavior, inline editing, design tokens, code generation, persistence, undo, and collaboration are not part of this DSL. Do not add them to a node and expect the renderer to honor them.
