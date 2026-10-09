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
| `settings.breakpoints` | no       | UUID-identified viewport widths. Default, when omitted: Phone 375 through Ultra 1760. See Breakpoints.              |
| `tokens`               | no       | UUID-keyed token families. Each token record carries `uuid`, `label`, `group`, `valueType`, and `value`.            |
| `styles`               | no       | Style block for this document: base, states, variants, breakpoints, children.                                       |
| `tokenInterface`       | no       | `reads` and `sets`: tokens this document uses and overrides for descendants.                                        |
| `componentTokens`      | no       | Local tokens owned by this atom, component, or section (not pages).                                                 |
| `root`                 | yes      | The canvas node. Nesting rules apply to what is inside it.                                                          |

Field types are `text`, `richText`, `image`, `link`, `boolean`, `enum`, `number`, and `token`. Enum fields also carry `options`. `richText` is reserved; nothing renders rich text yet.

## Kinds

| Kind        | Root                  | What it may contain                                             |
| ----------- | --------------------- | --------------------------------------------------------------- |
| `atom`      | frame, text, or image | Single root node only — no children. Use a component for trees. |
| `component` | frame, text, or image | Primitives, plus instances of atoms and components.             |
| `section`   | frame, text, or image | Same as a component. Not sections or pages.                     |
| `page`      | frame (the canvas)    | Only instances of sections.                                     |

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
  "layout": {
    "direction": "column",
    "gap": "{token:SPACE_GAP_UUID}",
    "padding": "{token:SPACE_SCALE_4_UUID}",
    "width": { "mode": "fixed", "size": 480 }
  },
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
  "layout": { "width": { "mode": "hug" }, "height": { "mode": "hug" } }
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

There are two related kinds of variants:

- Variant axes are the public values an instance can select. An axis lists its allowed strings. An instance's `variants` object picks one value per axis. Omitted axes use the axis `default`, then the first value. The renderer writes `data-variant-*` on the instance element. The component style block overrides declarations for those values.
- Named document presets are editor/codegen states. `default` is always the base document; additional presets contain sparse overrides and are resolved from that base when selected.

```json
{
  "variants": [
    { "name": "default" },
    {
      "name": "compact",
      "overrides": {
        "fields": { "label": "More" },
        "nodes": {
          "root": { "layout": { "gap": "{token:SPACE_SCALE_2_UUID}" } }
        },
        "removed": ["supporting-copy"]
      }
    }
  ]
}
```

Preset overrides are sparse: fields, node properties, render conditions, bindings, removed nodes, and insertions are stored only when they differ from `default`. New fields remain available in every preset because the base field contract is shared. A removed node is not deleted from the source tree; it is marked as removed for that preset and can be addressed by its stable path or identifier.

Style overrides can be stored directly as the sparse `overrides.styles` block. They merge onto the base style block when the preset is resolved and may contain declarations, states, child styles, variant layers, and breakpoint layers. For backwards compatibility, the editor also understands the existing reserved style axis `styles.variants.variant.<preset>`; that layer is materialized in the same way. Inline node styles remain available through `overrides.nodes.<path>.style` for local one-off changes.

```json
{
  "variants": [
    {
      "name": "compact",
      "overrides": {
        "styles": { "declarations": { "padding": "{token:SPACE_SCALE_2_UUID}" } }
      }
    }
  ],
  "styles": {
    "declarations": { "padding": "{token:SPACE_SCALE_4_UUID}" }
  }
}
```

This keeps one source of truth for styles and preserves the existing cascade model. A document with only `default` does not generate a named variant prop or branch in codegen.

## Layout

Frames render as flexbox. The default direction is `column`, alignment is stretch on the cross axis, and packing starts at the start of the main axis. `layout.position` is `auto` (the normal case) or `absolute`. Absolute is explicit: `x` and `y` are pixel offsets from the parent frame, and the parent frame is the containing block.

`width` and `height` are per-axis sizing, not bare numbers:

| `mode`  | CSS                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------- |
| `hug`   | `fit-content`                                                                                                  |
| `fill`  | `flex: 1` on the parent's main axis, otherwise stretch. A component root with no parent direction uses `100%`. |
| `fixed` | `size` is a pixel number, a token reference, or `{ "unit": "%", "value": 50 }`                                 |

`min` and `max` use the same size value. `gap`, `padding`, and `margin` are global token references (`{token:uuid}`), or a box of `{ top, right, bottom, left }` for padding and margin. A raw length is rejected.

`breakpoints` overrides any of those fields per breakpoint id. The base breakpoint (smallest `minWidth`, Phone at 375 when the document lists none) is not a query. Larger breakpoints become `@media (min-width: Npx)`. Child fill/hug is compiled against the base direction.

## Style block

### Local classes and authored selector rules

Every node may declare a `styleName`, a local CSS class identifier (for example
`checkbox` or `pseudo-checkbox`). Explicit names must be unique within a document.
The root defaults to `root`; other legacy nodes use readable names derived from
their layer name or node id, with deterministic suffixes for collisions. React
codegen imports these local names from CSS Modules; the consuming bundler may
rename their DOM classes. Preview selectors resolve the same element identities.

`styles.rules` is an ordered list of additional selector rules. A rule stores an
id, a selector, class-to-node-id `bindings`, and the same declaration/state/variant/
breakpoint layers as an ordinary style child. Bindings preserve the target when a
class is renamed. Removing a bound node removes affected rules. For example:

```json
{
  "id": "checked-indicator",
  "selector": ".checkbox:checked + .pseudo-checkbox",
  "bindings": { "checkbox": "control", "pseudo-checkbox": "indicator" },
  "declarations": { "background-color": "var(--color-accent)" }
}
```

The editor's **Styles** tab shows expandable selector rows with CSS declaration
drafts and controls to add, remove and reorder rules. Ordinary element rows edit
the same declaration sources as the guided **Style** tab. Invalid drafts remain
visible without changing the saved document. Class names and rule identity/order
are authored in Base; named variants edit sparse declaration layers by rule id.
Preset rule lists merge onto the base list by id rather than replacing its order.
Authored selectors are restricted to
the owning component; every selector group is scoped independently. Local class
references must resolve to nodes in that document. Attribute selectors, combinators,
functional pseudo-classes and pseudo-elements can express additional relationships;
CSS Modules `:global`/`:local` escapes and embedded CSS blocks are not allowed.

`styles` on an atom, component, or section paints that document. `declarations` are the base. `states` are `hover`, `focus-visible`, and `disabled`. `variants` map an axis to a value to a layer of declarations and states. `breakpoints` do the same inside a media query. `children` accepts local node ids, including instance roots, and uses the same layer shape.

For a nested instance root, a child key is its complete rendered path relative to
the containing document root, including local frames but omitting the root itself:
`cards/card-row/card-signin/continue`. The path must cross an instance boundary and
end at an instance root. Private primitive nodes of a referenced master remain
editable through that master. The editor offers Fields and Style tabs for nested
instance roots in Components and Sections; style writes belong to the containing
document. Move and Wrap rebase local path prefixes, Remove prunes affected paths,
and Reset removes the sparse override. States, breakpoints and named owner variants
use the same target path.

Values may contain global token references. `font: "{token:TYPOGRAPHY_BODY_UUID}"` expands to the typography longhands (`font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`). Spacing properties in the block are token references only.

`tokenInterface.reads` lists every **global token UUID** the style block, layout, and component-token defaults use. Global references use `{token:uuid}`. References to this document's own `componentTokens` use `{local.path}` in styles but are not listed in `reads`. Each component-token default that references a global token is listed in `reads`. `tokenInterface.sets` maps either a global token UUID or a component-token public path to an override value. A UUID target resolves to the token's generated CSS custom property, so renaming its label or group does not break the override. A path such as `input.color.border` targets another catalog document's component token when `input` is a document id. Font tokens use the same `{token:uuid}` reference syntax; font weight on a typography token is a number from that font's `weights` (400, 500, 600, 700), not its own token group.

`style` on a primitive node is still the `setStyle` map. It overrides the style block's base declaration for the same property. States, variants, and breakpoints stay above that.

DOM preview selectors (React codegen uses local CSS Module classes):

| Target         | Selector                                               |
| -------------- | ------------------------------------------------------ |
| Component root | `[data-component="button"]`                            |
| Descendant     | `[data-component="button"] [data-node="title"]`        |
| Variant        | `[data-component="button"][data-variant-tone="ghost"]` |
| State          | `[data-component="button"]:hover`                      |

## Tokens

Code snippets use symbolic UUID placeholders such as `TYPOGRAPHY_BODY_UUID`; replace them with IDs declared in the relevant Example `idList.ts` file. `tokens` is grouped by family (`color`, `space`, `radius`, `shadow`, `type`, and `font`). Each family is a map keyed by a stable UUID. The map key must match the record's `uuid`; each record has a display `label`, organizational `group`, `valueType`, and `value`. Optional `extensions` hold namespaced metadata such as tier (`primitive`, `semantic`, or `component`). A reference is the whole string `{token:uuid}`. Changing a label or group does not change the token identity or its references.

The CSS custom-property name is generated from the family, group, and label; it is not stored in the token record. The editor displays the label and keeps the UUID as identity. The stored value stays unresolved. `@facadeur/tokens` resolves references when building CSS, and Core rejects a command that introduces a cycle or a missing target. Legacy DTCG input is converted at the read boundary; `$type`, `$value`, and `$extensions.facadeur` are not the canonical document shape.

Supported `valueType` values: `color`, `dimension`, `number`, `fontFamily`, `fontWeight`, `shadow`, `typography`.

Responsive overrides live in each token's `breakpoints` map, keyed by breakpoint UUID. `value` is the base, associated with the configured breakpoint with the smallest `minWidth`. That base is not wrapped in `@media`; its `minWidth` is the viewport width of the frame, not a query threshold. Each larger breakpoint emits `@media (min-width: <px>)`.

```json
{
  "type": {
    "TYPOGRAPHY_BODY_UUID": {
      "uuid": "TYPOGRAPHY_BODY_UUID",
      "label": "Body",
      "group": "",
      "valueType": "typography",
      "value": {
        "fontFamily": "{token:FONT_INTER_UUID}",
        "fontSize": "16px",
        "fontWeight": 400,
        "lineHeight": 1.5,
        "letterSpacing": "0"
      },
      "breakpoints": {
        "BREAKPOINT_TABLET_UUID": { "fontSize": "17px" },
        "BREAKPOINT_WIDE_UUID": { "fontSize": "18px" }
      }
    }
  }
}
```

### CSS names

| Source                                         | Custom property                                      |
| ---------------------------------------------- | ---------------------------------------------------- |
| Token with family/group/label `color.blue.500` | `--color-blue-500`                                   |
| Reference `{token:uuid}`                       | `var(--generated-custom-property)`                   |
| Font token with label `Inter`                  | `--font-inter`                                       |
| Typography token `Body`                        | `--type-body--font-size`, `--type-body--font-family` |

The generated name uses the family, group, and label, joined with hyphens. A typography token expands to one property per field, and the field is separated with a double hyphen. A shadow token is one property holding a `box-shadow` value. Declarations sit in a `:root` rule. The UUID reference remains stable if the generated name changes after a label or group edit.

### Component tokens

Component files do not store local tokens in the design `tokens` tree. They use `componentTokens`: a flat map from a token path (`color.border`, `padding.x`, …) to `{ type, value }`. The default `value` is a literal with no `{…}`, or exactly one `{token:uuid}` global reference. Local-to-local references in defaults are rejected.

The public path is `<documentId>.<localPath>` (for example `input.color.border`). CSS uses the same hyphenation as global tokens (`--input-color-border`). In the owning document's compiled styles, `{color.border}` becomes `var(--input-color-border, <fallback>)` where the fallback is `var(--generated-global-property)` when the default is a single `{token:uuid}` reference, otherwise the literal. The owning root rule does **not** assign `--input-color-border`; a parent's `tokenInterface.sets` entry emits that variable so inheritance wins and the fallback applies only when the variable is unset.

At an atom, component, or section root, the editor's Tokens tab also lists exposed
tokens from reachable descendant components. Editing them writes
`tokenInterface.sets` on the containing root, affecting matching descendants;
Reset removes that set and restores the component fallback. Local token defaults
and descendant overrides remain separate controls. No internal alias variable is
needed. Root sets are base-document values; scoped state/breakpoint/instance
overrides belong to the style block.

Allowed kinds: atom, component, and section. Pages cannot define `componentTokens`. Commands: `setComponentToken`, `removeComponentToken`. Before `setComponentToken`, the editor should call `assertComponentTokenDefault(value, globalTokenUuids)` with UUIDs from the design document.

## Font tokens

```json
{
  "font": {
    "FONT_INTER_UUID": {
      "uuid": "FONT_INTER_UUID",
      "label": "Inter",
      "group": "",
      "valueType": "fontFamily",
      "value": {
        "family": "Inter",
        "weights": [400, 500, 600, 700],
        "source": { "type": "google", "family": "Inter" },
        "fallbacks": ["system-ui", "sans-serif"]
      }
    }
  }
}
```

Font family definitions use the same UUID-keyed record contract as other tokens. Typography tokens refer to them with `{token:uuid}`; font source details, weights, and fallbacks live in the token value.

`source.type` is `google` or `file`. A file source lists `{ weight, style, url, format? }` and must cover every weight and style. `style` is `normal` or `italic`; omitted `styles` means `normal` only. The last fallback must be a CSS generic family (`sans-serif`, `system-ui`, `serif`, …). CSS output is an `@import` for Google Fonts or one `@font-face` per file, plus the `--font-<id>` stack.

## Breakpoints

```json
"settings": {
  "breakpoints": [
    { "id": "xs", "label": "Phone", "minWidth": 375 },
    { "id": "sm", "label": "Tablet", "minWidth": 768 },
    { "id": "md", "label": "Laptop", "minWidth": 1024 },
    { "id": "lg", "label": "Desktop", "minWidth": 1200 },
    { "id": "xl", "label": "Wide", "minWidth": 1440 },
    { "id": "xxl", "label": "Ultra", "minWidth": 1760 }
  ]
}
```

Ids match `[a-z][a-z0-9]*` and stay in token overrides and CSS. `label` is the name the editor shows; omit it and a known id still uses its default name. Widths are positive integers and unique. When the document omits breakpoints, CSS uses these defaults. A token may only name breakpoints from that list, and it may not repeat the base id inside `$extensions`.

## Project template

`examples/project-template.json` is an optional starter: the default palette, a 4px spacing scale, radius, shadows, the Inter family, and a type scale. `createProjectTemplate()` in `@facadeur/tokens` returns the same fragment. Spacing steps are `space.0` through `space.24` (the name is the step on a 4px grid, so `space.4` is 16px). `space.gap`, `space.inset`, and `space.stack` are the aliases gap, padding, and margin should use. Palette tokens stay in the design file; atoms and components own their local tokens in `componentTokens` (see above).

A new project also starts with two atoms, listed by `starterAtomIds`: `button` and `link`. The form controls `input` and `textarea` are listed separately by `starterFormIds` and live in the `form` group (`examples/button.json`, `examples/link.json`, `examples/input.json`, `examples/textarea.json`). They define fields and, where it matters, variant axes. `link` binds `label` and `href`. `textarea` follows `input`, adds a `rows` field, and uses a `resize` axis on the control.

## Flat model

```text
{
  id, name, kind, rootId,
  fields, variants, settings,
  tokens, styles, tokenInterface, componentTokens,
  nodes: {
    "<id>": { type, children: ["<child-id>", ...] }
  }
}
```

Only frames have `children`. Ids are unique inside one document. `toFlat` / `toNested` in `@facadeur/core` convert between the two shapes. Each token family is stored as a UUID-keyed map in the Yjs `tokens` map, including fonts. Object keys inside the token tree are sorted on the way through memory so a command and a Yjs read-back compare equal. The file round-trip keeps every value.

## Commands

Documents change only through commands. Each command is one transaction in the Yjs store. Undo and redo walk those transactions.

`insert`, `remove`, `move`, `wrap`, `setProp`, `setStyle`, `setField`, `setVariant`, `defineField`, `removeField`, `defineVariant`, `removeVariant`, `setToken`, `removeToken`, `setBreakpoints`, `setStyleBlock`, `setVariantStyleBlock`, `setTokenInterface`, `setComponentToken`, `removeComponentToken`, `renameComponentTokenPath`. `wrap` puts the node in a new frame at the same index. A command that introduces a token reference (`insert`, layout, `setStyle`, `setStyleBlock`, `setVariantStyleBlock`) adds its UUID to `tokenInterface.reads` when it is global; local component token references are omitted. `setComponentToken` adds any global UUID referenced by its default to `reads`. `removeField` also drops bindings that named the field. `removeVariant`, and `defineVariant` when a value disappears, drop the matching style-block layers on the root and on children. Sections and pages cannot define fields or variant axes.

`setField` and `setVariant` apply to instances. `setStyle` writes a style map on a primitive node; it does not apply to instances. `setStyleBlock` replaces the document style block. `setVariantStyleBlock` replaces one named preset's sparse `overrides.styles` block and removes that preset's backwards-compatible reserved style layer. `setTokenInterface` replaces `reads` / `sets`. Global UUID set keys resolve to generated custom properties; component-token public-path keys set descendant component tokens. `move.index` is the index in the destination child list after the node has been taken out of its current parent. `setToken` replaces one UUID-identified record in a family map. `setBreakpoints` with an empty list clears the document's breakpoints, and CSS falls back to the defaults. The store resolves token references before it commits, so a cycle or a missing target never lands in the document.

## Ids in the DOM

The renderer writes `data-id`. The document root frame is the canvas and is not an element, so its children are not prefixed with `root`.

- A node in the open document uses its id. A nested frame adds its own segment: `intro/heading`.
- A node inside an expanded instance is prefixed with the instance id: `card-notes/title`. The component root frame is that instance element, so it does not add a second `root` segment.
- Nested instances and frames keep gaining prefixes: `card-signin/email/control`, `specimen-section/intro/heading`.

## Viewports

The editor shows one same-origin iframe per breakpoint. The iframe's width is that breakpoint's `minWidth`, so the `@media (min-width)` rules from tokens and style blocks match the frame. Frame height follows the content. Selection and hover are drawn by the editor above the iframes.

## Codegen

`@facadeur/codegen` reads these documents and emits one directory per React component through its default React engine.
Each directory separates `component.tsx`, `types.ts`, `style.module.css`, and its public `index.ts`.
Props are the fields and variant axes. The component root sets `data-component` and
`data-variant-*`. Children set `data-node`. An instance becomes a call to the generated component,
with that instance's field and variant overrides. `nodeId` is the instance id and is written to
`data-node`, so the style rules address the same element the renderer paints. Each
element gets a local CSS Module class; instance classes are passed to the child component root,
which merges them with its own generated class and any caller or document classes.

Tokens and fonts become the global design stylesheet (`styles/tokens.css`). Style blocks and layout
are compiled per component with `address: 'instance'` and use the same local class mapping as the
generated JSX. Nested instance overrides keep their `data-node` path selectors anchored to the
owning component's local root class. Generated component rules are ordered in cascade layers:
component styles, direct instance overrides, then nested instance overrides. Authored selector
rules share the direct instance layer and preserve their list order there. `css-modules.d.ts`
declares the generated stylesheet import.
`pnpm codegen` writes these files to `dist/facadeur/packages/ui`. Generated CSF3 stories land under
`dist/facadeur/apps/storybook/src/stories/generated`. Run `pnpm storybook` to preview them. The Next.js example
in `dist/facadeur/apps/next` imports `@facadeur/ui`.

## Out of scope here

Slots and multiplayer sync.
