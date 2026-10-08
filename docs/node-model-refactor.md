# Node model refactor (draft)

Working notes for a major reshape. **DB and examples may be reset**; do not preserve legacy JSON shapes unless explicitly migrated.

### Phase status

1. **Done:** Legacy `examples/*.json` removed; v2 TypeBox in `@facadeur/core/node-model`; starter project = design + section only; **tests paused** (`vitest` empty include); **legacy inspector removed**; right rail = placeholder UI.
2. **Next:** Catalog API + seed atoms; preview resolver (top-down); renderer v2 ([packages/renderer-dom/V2-RENDERER.md](../packages/renderer-dom/V2-RENDERER.md)); new properties UI on dom/style/schema/data/config.

### TypeBox vs JSON Schema (Ajv)

- **Runtime validation:** Ajv against JSON Schema (already in `@facadeur/core` for documents). v2 catalog and API should validate with **Ajv only**.
- **TypeBox:** convenient schema-as-code + `Static<>` types for **node-model** during the transition. Not mandatory long term — schemas can live as `.json` and types hand-written or generated.
- **Core slim-down:** retire bespoke `validateTree` / TypeBox mirrors as legacy `documentFileSchema` usage disappears; keep one validator pipeline.

### Inspector (removed)

Pre-commit inspector under `apps/editor/src/inspector` targeted the **legacy** document model. Deleted during reset; re-build on v2 `AppService` + schema/data/config, not restored.

### Single contract (target)

| Bucket | Package entry |
|--------|----------------|
| Types + JSON Schema | `@facadeur/core/node-model` |
| Legacy documents | `documentFileSchema` — **frozen**, replace usages incrementally |
| Render | `renderer-dom` → consume v2 `Node` + catalog refs |
| Persist | API `ProjectCatalog` only (no duplicate JSON shapes) |

## Refs only — no duplication

- **Stable `uuid`** identifies every definable thing (atom, component, page, schema, token, prop, tree node in a definition).
- **Display names** (`name`, titles) are mutable metadata; never used as linkage keys.
- Stored graphs **reference** definitions (`ref:uuid`, `schemaRef:uuid`, `componentRef:uuid`, `{prop:uuid}`, `{token:uuid}`) — never embed a second copy of the same schema, DOM subtree, or style rules.
- After cutover, **creates/updates go through API** with shared validation rules so editor, DB, and codegen cannot drift from the TypeBox/JSON Schema source of truth.

## Two shapes: catalog entry vs tree node

**`NodeDefinition`** — one row in the library (`atoms` / `components` / `pages`). Not the same type as a node inside a tree.

**`Node`** — an element in a live graph. **`dom.children`** is an **`Node[]`**; each child has its own **`uuid`**, so siblings never collide.

```ts
type ProjectCatalog = {
  atoms: Record<Uuid, NodeDefinition>;
  components: Record<Uuid, NodeDefinition>;
  pages: Record<Uuid, NodeDefinition>;
  schemas?: Record<Uuid, JsonSchema>; // when schema.kind === 'ref'
  /** DTCG tree — path ids (`color.blue.500`), not uuids; migrated from design `tokens`. */
  tokens?: DesignTokenTree;
  /** `@font-face` / Google families — separate from DTCG (`{font.sans}` paths). */
  fonts?: FontFamilyDefinition[];
  /** Semantic aliases for `{prop:uuid}` in node style maps. */
  props?: Record<Uuid, DesignPropDefinition>;
  /** Global stylesheet block, tokenInterface, breakpoints (from design `styles` / settings). */
  globalStyles?: GlobalStyles;
};

type NodeDefinition = {
  uuid: Uuid;
  name: string;
  kind: 'atom' | 'component' | 'page';
  schema: SchemaSource;
  root: Node; // template tree for this entry (refs to other defs via config.definitionRef)
  style?: StyleRulesRef; // document-level rules, not duplicated on every node
  config?: DefinitionConfig; // includes previewData for **this** definition’s schema
};

type Node = {
  uuid: Uuid;
  dom: DomSpec;
  style?: StyleSpec;
  schema?: SchemaSource; // only when inline on this layer; else from resolved definition
  data?: DataRef | InlineData; // instance overrides only — no copying defaults into data
  config?: NodeConfig; // definitionRef, previewData slice, layout, binds, …
};
```

- **`config.definitionRef`** on a tree **`Node`** → lookup **`NodeDefinition`** in catalog (atom/component).
- UI lists **`name`**; all linkage uses **`uuid`**.

### Schema source (discriminated — no copied schema blobs on instances)

```ts
type SchemaSource =
  | { kind: 'ref'; uuid: Uuid }
  | { kind: 'inline'; schema: JsonSchema };
```

- **`NodeDefinition.schema`**: required — ref to shared schema or inline for this entry only.
- Tree **`Node`**: omit **`schema`** when inherited from **`definitionRef`**; allow inline/ref only for exceptional local contract (validate explicitly).

## Target: one node, four buckets (tree **`Node`**)

| Bucket | Purpose |
|--------|---------|
| **`dom`** | How this layer maps to HTML/DOM |
| **`style`** | Authoring-time CSS declarations (camelCase keys) |
| **`schema`** | Trustworthy contract: JSON Schema (or `$ref`) — shape, types, required, titles. **Not** editor samples. |
| **`data`** | Values that **validate against `schema`** (instance overrides, authored props). Runtime / composition truth. |
| **`config`** | Framework & editor: layout, binds, **`componentRef`**, repeat/switch, **`previewData`**, variant preview overrides, etc. |

**`dom.children: Node[]`** is the tree; layer **`uuid`** is the graph identity (≠ HTML `dom.attributes.id`).

## `dom` shape (aligned with [example-framework](https://github.com/mmilad/example-framework))

Recursive `buildElement(config)` idea: **`tagName`**, optional **`children`**, plus three DOM-facing maps:

```ts
dom: {
  tagName: string;
  attributes?: Record<string, string>;  // setAttribute: src, alt, href, title, role, aria-*, type, …
  data?: Record<string, string>;        // data-* (keys without the `data-` prefix)
  properties?: Record<string, unknown>; // IDL / live DOM: textContent, innerHTML, value, checked, …
  event?: Record<string, …>;            // semantic → handlers (Facadeur event contract, not raw functions in JSON)
}
```

**Conventions**

- **`attributes`**: serializable HTML attributes (`src`, `alt`, `href`, `hidden` when modeled as attribute, etc.).
- **`data`**: `data-testid` → `data: { testid: "…" }`.
- **`properties`**: things that are not round-tripped as attributes — **`textContent`**, **`innerHTML`**, form control **`.value`** / **`.checked`** when authoring live state. Prefer attributes when the source of truth is markup; prefer properties when mirroring DOM property semantics (editor/renderer applies the right API).
- Do **not** use Facadeur names on `dom`: no `tag`, `classes`, `attributes` blob at top level — use **`class`** or **`className`** policy TBD (`classList` as string[] vs space-separated `class` attribute); pick one and validate per `tagName`.
- Layer **`id`** in the graph ≠ HTML `id` in `dom.attributes.id`.

## `style` (aligned with [style-controller](https://github.com/mmilad/style-controller))

- Stored as **camelCase** property names (`aspectRatio`, `backgroundColor`, …).
- Document-level rules (selectors, variants, breakpoints) remain the job of the style engine; node **`style`** is the inline/override slice the renderer merges.
- **Reference syntax** (replaces path-like `{space.4}` tokens):

  - **`{prop:uuid}`** — semantic / design prop registry (lookup in props catalog only)
  - **`{token:uuid}`** — DTCG token registry (lookup in tokens only)
  - **No bare `{uuid}`** — avoids scanning multiple registries and id collisions across namespaces
  - Plain literals stay unwrapped strings (or an explicit `{literal:…}` only if we ever need disambiguation)

## What we are replacing

- **`nestedNodeSchema` union** (`frame` | `text` | `image` | …) with special-case props (`image.src` only).
- Duplicate contract storage (`previewData` on document root, node props, `fieldBindings`, `bindings`) → **`schema` + `data`**, with **preview samples in `config`** (not in `schema`).
- Legacy **`examples/`** and dependent tests — drop on cutover.

## Preview resolution (top-down, no copied values)

Preview is **read-time only** — never copy sample values into **`data`** or **`schema`**.

Walk the tree from the open **page/component root**:

1. **Tree node** at this path (unique **`uuid`** in `dom.children[]`).
2. If **`config.definitionRef`**: load **`NodeDefinition`** from catalog.
3. **Effective schema** = resolve **`NodeDefinition.schema`** (`ref` → catalog schema, or `inline`).
4. **Effective preview** for that schema = merge layers, outer → inner:
   - ancestor **`Node.config.previewData`** (scoped to this subtree path, if present)
   - **`NodeDefinition.config.previewData`** for the referenced def
   - optional **`Node.config.previewData`** on the instance node (sparse override)

Same two **`image`** defs under one parent = **two child objects** in **`dom.children`**, each with its own **`uuid`** and optional instance preview — no flat map keyed by definition uuid.

**Flow:** root → child in **`dom.children`** → **`definitionRef`** → **`NodeDefinition`** → **`SchemaSource`** → validate/read fields for Content + canvas.

## Inspector / editor (follow-up)

- Content fields from resolved **`schema`**; live values from **`data`**; canvas from **preview resolver** (above).
- Schema tab edits **`schema`** (or schema ref) only; preview edits write **`config.previewData`**; production/instance edits write **`data`**.

## API (post-reset)

- **Single write path** for new atoms/components/pages: validate `NodeDefinition`, refs resolve, no orphan uuids, preview validates against referenced schemas in sample mode.
- Read paths return the same shapes; editor never inventing parallel document types.

## Open decisions

- `classList: string[]` vs single `class` attribute string.
- Whether `text` nodes are `tagName: "span"` + `properties.textContent` or a dedicated authoring shortcut in **config** only.
- Event JSON shape (`event` vs `events`) and multi-handler arrays (see example-framework).
