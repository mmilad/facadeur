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

| Field                  | Required | Meaning                                                                                                             |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `version`              | yes      | `1`.                                                                                                                |
| `id`                   | yes      | Stable document id. Also the id an instance uses in `component`.                                                    |
| `name`                 | yes      | Human label.                                                                                                        |
| `kind`                 | yes      | `atom`, `component`, `section`, or `page`. The list is configurable in code; the published schema names these four. |
| `fields`               | no       | Variable fields of an atom or component: `name`, `type`, `default`.                                                 |
| `variants`             | no       | Variant axes: `name`, `values`, optional `default`.                                                                 |
| `settings.artboard`    | no       | `{ "width", "height" }` in pixels. The page sheet. Not a node.                                                      |
| `settings.breakpoints` | no       | Viewport widths. Default, when omitted: mobile 375, tablet 768, desktop 1440.                                       |
| `fonts`                | no       | Font families: id, CSS name, weights, source, fallbacks.                                                            |
| `tokens`               | no       | W3C DTCG tree. A token has `$value`; a group does not.                                                              |
| `root`                 | yes      | The canvas node. Nesting rules apply to what is inside it.                                                          |

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

`layout.position` is `auto` (the normal case) or `absolute`. Absolute nodes use `x` and `y` as pixel offsets from the parent frame. `width` and `height` are pixel sizes. Gap, padding, and margin are not stored as numbers on a node. Spacing is a token reference (`space.gap`, `space.inset`, `space.stack` in the default set). The style engine that applies those references is a later milestone.

## Tokens

`tokens` is a [W3C DTCG](https://tr.designtokens.org/format/) tree. An object with `$value` is a token. Any other object is a group. `$type` on a group is inherited by the tokens inside it; a token's own `$type` wins. The same rule applies to `$extensions.facadeur.tier` (`primitive`, `semantic`, or `component`). Tier is metadata for authors. It is not part of the CSS name.

Child names match `[a-z0-9]+` (`blue`, `500`). A reference is the whole string `{color.blue.500}`. The stored value stays unresolved. `@facadeur/tokens` resolves it when building CSS, and the Yjs store rejects a command that introduces a cycle or a missing target.

Supported `$type` values: `color`, `dimension`, `number`, `fontFamily`, `fontWeight`, `shadow`, `typography`.

Per-breakpoint values live in `$extensions.facadeur.breakpoints`. `$value` is the base, which is the breakpoint with the smallest `minWidth`. That base is not wrapped in `@media` — its `minWidth` is the viewport width of the frame (375 for the default mobile breakpoint), not a query threshold. Each larger breakpoint emits `@media (min-width: <px>)`.

```json
{
  "type": {
    "$type": "typography",
    "body": {
      "$value": {
        "fontFamily": "{font.sans}",
        "fontSize": "16px",
        "fontWeight": "{font.weight.regular}",
        "lineHeight": 1.5,
        "letterSpacing": "0"
      },
      "$extensions": {
        "facadeur": {
          "breakpoints": { "tablet": { "fontSize": "17px" }, "desktop": { "fontSize": "18px" } }
        }
      }
    }
  }
}
```

### CSS names

| Source                          | Custom property                                      |
| ------------------------------- | ---------------------------------------------------- |
| Token `color.blue.500`          | `--color-blue-500`                                   |
| Reference `{color.blue.500}`    | `var(--color-blue-500)`                              |
| Font id `sans`                  | `--font-sans`                                        |
| Typography field on `type.body` | `--type-body--font-size`, `--type-body--font-family` |

Segments are joined with a single hyphen, so each path has one name. A typography token expands to one property per field, and the field is separated with a double hyphen. A token path cannot contain `--`, so the field does not collide with another token. A shadow token is one property holding a `box-shadow` value. Declarations sit in a `:root` rule.

`{font.sans}` points at the font with id `sans`, not at a DTCG token. A token must not occupy that same path.

## Fonts

```json
{
  "id": "sans",
  "family": "Inter",
  "weights": [400, 500, 600, 700],
  "source": { "type": "google", "family": "Inter" },
  "fallbacks": ["system-ui", "sans-serif"]
}
```

`source.type` is `google` or `file`. A file source lists `{ weight, style, url, format? }` and must cover every weight and style. `style` is `normal` or `italic`; omitted `styles` means `normal` only. The last fallback must be a CSS generic family (`sans-serif`, `system-ui`, `serif`, …). CSS output is an `@import` for Google Fonts or one `@font-face` per file, plus the `--font-<id>` stack.

## Breakpoints

```json
"settings": {
  "breakpoints": [
    { "id": "mobile", "minWidth": 375 },
    { "id": "tablet", "minWidth": 768 },
    { "id": "desktop", "minWidth": 1440 }
  ]
}
```

Ids match `[a-z][a-z0-9]*`. Widths are positive integers and unique. When the document omits breakpoints, CSS uses the three defaults above. A token may only name breakpoints from that list, and it may not repeat the base id inside `$extensions`.

## Project template

`examples/project-template.json` is an optional starter: the default palette, a 4px spacing scale, radius, shadows, the Inter family, and a type scale. `createProjectTemplate()` in `@facadeur/tokens` returns the same fragment. Spacing steps are `space.0` through `space.24` (the name is the step on a 4px grid, so `space.4` is 16px). `space.gap`, `space.inset`, and `space.stack` are the aliases gap, padding, and margin should use. Component tokens reference those aliases.

## Flat model

```text
{
  id, name, kind, rootId,
  fields, variants, settings,
  tokens, fonts,
  nodes: {
    "<id>": { type, children: ["<child-id>", ...] }
  }
}
```

Only frames have `children`. Ids are unique inside one document. `toFlat` / `toNested` in `@facadeur/core` convert between the two shapes. The token tree is stored as nested maps in the Yjs `tokens` map. Fonts are a map keyed by id, with order kept beside them. Object keys inside the token tree are sorted on the way through memory so a command and a Yjs read-back compare equal. The file round-trip keeps every value.

## Commands

Documents change only through commands. Each command is one transaction in the Yjs store. Undo and redo walk those transactions.

`insert`, `remove`, `move`, `setProp`, `setStyle`, `setField`, `setVariant`, `defineField`, `removeField`, `defineVariant`, `removeVariant`, `setToken`, `removeToken`, `setTokenGroup`, `removeTokenGroup`, `setFont`, `removeFont`, `setBreakpoints`.

`setField` and `setVariant` apply to instances. `setStyle` writes a style map on a primitive node; it does not apply to instances. Painting that map is the style engine's job. `move.index` is the index in the destination child list after the node has been taken out of its current parent. `setToken` replaces one token and creates missing groups along the path. `setBreakpoints` with an empty list clears the document's breakpoints, and CSS falls back to the defaults. The store resolves token references before it commits, so a cycle or a missing target never lands in the document.

## Ids in the DOM

The renderer writes `data-id`.

- A node in the open document uses its id.
- A node inside an expanded instance is prefixed with the instance id: `card-notes/title`.
- Nested instances keep gaining prefixes: `card-signin/email/control`.

## Out of scope here

The style engine (painting token references onto nodes), iframe viewports, slots, codegen, and multiplayer sync. The stage can show the generated custom properties, but it does not apply them to components yet.
