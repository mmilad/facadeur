# Facadeur DSL

A facadeur document is JSON. The editor never edits the DOM in place: it runs commands against this document, and the renderer builds DOM from the result. The file on disk is a nested tree. In memory the same document is a flat map of nodes whose children are ordered id lists. Conversion either way is lossless.

Examples live in `examples/`. The JSON Schema generated from `packages/core` is `schema/document.schema.json`.

## Document

```json
{
  "version": 1,
  "id": "button",
  "name": "Button",
  "kind": "atom",
  "fields": [{ "name": "label", "type": "text", "default": "Button" }],
  "variants": [{ "name": "tone", "values": ["primary", "ghost"], "default": "primary" }],
  "root": { "id": "root", "type": "frame", "tag": "button", "children": [] }
}
```

| Field               | Required | Meaning                                                                                                             |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `version`           | yes      | `1`.                                                                                                                |
| `id`                | yes      | Stable document id. Also the id an instance uses in `component`.                                                    |
| `name`              | yes      | Human label.                                                                                                        |
| `kind`              | yes      | `atom`, `component`, `section`, or `page`. The list is configurable in code; the published schema names these four. |
| `fields`            | no       | Variable fields of an atom or component: `name`, `type`, `default`.                                                 |
| `variants`          | no       | Variant axes: `name`, `values`, optional `default`.                                                                 |
| `settings.artboard` | no       | `{ "width", "height" }` in pixels. The page sheet. Not a node.                                                      |
| `root`              | yes      | The canvas node. Nesting rules apply to what is inside it.                                                          |

Field types are `text`, `richText`, `image`, `link`, `boolean`, `enum`, `number`, and `token`. Enum fields also carry `options`. `richText` is reserved; nothing renders rich text yet.

## Kinds

| Kind        | Root                  | What it may contain                                      |
| ----------- | --------------------- | -------------------------------------------------------- |
| `atom`      | frame, text, or image | Only primitives: `frame`, `text`, `image`. No instances. |
| `component` | frame, text, or image | Primitives, plus instances of atoms and components.      |
| `section`   | frame, text, or image | Same as a component. Not sections or pages.              |
| `page`      | frame (the canvas)    | Only instances of sections.                              |

The page root is the canvas, not a section. Its children are the sections. A page does not store the section's inner nodes; those live in the section document.

## Nodes

Every node has a stable `id`. The HTML tag is a property, `tag`, not a separate node type.

### frame

A container. Children are nested in the file and stored as an ordered id list in memory. A `text` binding on the frame itself writes that string onto the element, which is how a button keeps its label without an extra child.

```json
{
  "id": "root",
  "type": "frame",
  "tag": "section",
  "attributes": { "class": "hero" },
  "layout": { "position": "absolute", "x": 56, "y": 64, "width": 480 },
  "children": []
}
```

### text

```json
{ "id": "title", "type": "text", "tag": "h1", "text": "Specimen" }
```

`text` is the literal string. A binding can replace it when the node sits inside an atom or component.

### image

```json
{ "id": "photo", "type": "image", "tag": "img", "src": "cover.png", "alt": "Cover" }
```

### instance

A reference to another document. An instance may override field values and variant values, and it may be placed with `layout`. It has no children, no attributes, and no style of its own. There is no detach.

```json
{
  "id": "btn-primary",
  "type": "instance",
  "component": "button",
  "fields": { "label": "Primary" },
  "variants": { "tone": "primary", "size": "md" },
  "layout": { "position": "absolute", "x": 56, "y": 232 }
}
```

`component` is the target document id. It can point at an atom, a component, or — on a page — a section, following the kind rules above.

## Fields and bindings

A field is defined on the document that owns the nodes. A child node binds to it:

```json
{ "field": "label", "target": "text" }
{ "field": "value", "target": "attribute", "name": "value" }
```

`target` is `text`, `attribute`, `style`, `visible`, `src`, or `alt`. `attribute` and `style` require `name`. Attribute names that start with `on` are rejected, so a document cannot install event handlers.

An instance's `fields` object replaces those defaults for that instance only. Omitted fields use the definition's `default`.

## Variants

An axis lists its allowed strings. An instance's `variants` object picks one value per axis. Omitted axes use the axis `default`, then the first value. Variants are data in this milestone. The specimen stage reflects them with `data-variant-*` attributes. The style engine that turns axes into style overrides comes later.

## Layout

`layout.position` is `auto` (the normal case) or `absolute`. Absolute nodes use `x` and `y` as pixel offsets from the parent frame. `width` and `height` are pixel sizes. Gap, padding, and margin are not in the schema: spacing will be tokens, and tokens are a later milestone.

## Flat model

```text
{
  id, name, kind, rootId,
  fields, variants, settings,
  nodes: {
    "<id>": { type, children: ["<child-id>", ...] }
  }
}
```

Only frames have `children`. Ids are unique inside one document. `toFlat` / `toNested` in `@facadeur/core` convert between the two shapes.

## Commands

Documents change only through commands. Each command is one transaction in the Yjs store. Undo and redo walk those transactions.

`insert`, `remove`, `move`, `setProp`, `setStyle`, `setField`, `setVariant`, `defineField`, `removeField`, `defineVariant`, `removeVariant`.

`setField` and `setVariant` apply to instances. `setStyle` writes a style map on a primitive node; it does not apply to instances. Painting that map is the style engine's job. `move.index` is the index in the destination child list after the node has been taken out of its current parent.

## Ids in the DOM

The renderer writes `data-id`.

- A node in the open document uses its id.
- A node inside an expanded instance is prefixed with the instance id: `card-notes/title`.
- Nested instances keep gaining prefixes: `card-signin/email/control`.

## Out of scope here

Tokens, the style engine, iframe viewports, slots, codegen, and multiplayer sync. The Yjs document already reserves empty `tokens` and `fonts` maps so those can arrive without a new top-level shape.
