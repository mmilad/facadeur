# Schema and form responsibilities (working draft)

**Status:** working ownership agreement and inventory. This document does not change the serialized
catalog schema, public APIs, or code behavior. It records the agreed direction and leaves the
remaining API shape questions open for review.

Use this map before changing schema authoring, schema-derived fields, validation, value migration,
or their Editor forms. It describes the current path and marks boundaries that need a decision.

## Lifecycle at a glance

```text
Persisted catalog (@facadeur/domain)
  SchemaSource + shared JsonSchemaObject
  DefinitionConfig: staticFields, instanceFieldConfigs, previewData.fields
  Node data and component/atom references
        │
        ▼
Core schema contract and catalog state (@facadeur/core)
  resolve shared/inline schemas
  compose effective schemas and inherited fields
  resolve catalog $refs and reference targets
  derive contract/query data for Inspector/value consumers
  query catalog-backed candidates (definitions, schemas, icons, tokens)
  provide shared reference lookup and resolution capabilities to domain controllers
  validate catalog structure, schema values, bindings, and reference integrity
  reconcile stored values when a schema change makes them invalid
  commit validated catalog changes
        │
        ├──────────────► Core preview resolution ───────► Editor canvas
        │
        ▼
Editor adapters and interactions (apps/editor)
  schema authoring UI
  Core data/contracts → Editor form configuration
  catalog candidates + schema metadata → controls
  field changes → Editor events → Core mutations
        │
        ▼
Reusable controls (@facadeur/form)
  text, select, array, object, record, transformable, and other generic controls
```

The arrows show intended dependency direction. Core owns catalog data, schema and reference
semantics, validation, and mutations. The Editor owns presentation, form assembly, and translating
user interactions into Core calls. The current implementation has some overlapping projections and
resolution helpers; those are listed below so the diagram is not mistaken for a claim that every
boundary is already clean.

## Persisted inputs and shared contracts

Owner: `@facadeur/domain`.

- `ProjectCatalog.schemas` stores shared `JsonSchemaObject` records.
- `NodeDefinition.schema` is a `SchemaSource`: inline schema or UUID reference to a shared schema.
- `DefinitionConfig` stores static field values, per-instance field configuration, and preview
  defaults. Nodes store instance data separately.
- Core's `JsonSchema` describes JSON Schema behavior; `FieldValue` describes values that can be
  stored in the catalog.

Domain types describe the saved contract. They should not decide how an Editor control looks or
how a form widget handles drafts and commits.

Primary contracts: [`schema-source.ts`](../packages/domain/src/schema-source.ts),
[`catalog.ts`](../packages/domain/src/catalog.ts), and the node/config contracts in
`packages/domain/src`.

## Core: current responsibilities and APIs

Owner: `@facadeur/core`. Core owns schema meaning, catalog invariants, schema-dependent state
transitions, and preview resolution. It must remain independent of Editor and Form packages.

```text
Catalog + definition
├─ resolveJsonSchemaForDefinition(catalog, definition)
│    → JsonSchemaObject | null
├─ effectiveSchemaForDefinition(catalog, definition)
│    → { schema, origins, previewDefaults }
├─ resolveCatalogSchemaReferences(schema, catalog)
│    → expanded schema for consumers
├─ fieldsFromJsonSchema(schema)
│    → JsonSchemaField[]
└─ inspectorInputsForNode(catalog, definition, nodeUuid, instanceData?)
     → { fields, values }

Catalog candidate
├─ validateProjectCatalog(data: unknown)
│    → normalized, validated ProjectCatalog | DocumentError
├─ matchesSchemaValue(value, schema, references?)
│    → boolean
├─ matchesPartialSchemaValue(value, schema, references?)
│    → boolean
├─ assert catalog/reference/effective-field invariants
└─ reconcileCatalogValuesForSchemaChange(previous, next)
     → catalog with incompatible stored values reconciled

CoreController mutations
├─ patchDefinition(kind, uuid, patch)
├─ upsertSchema(uuid, schema)
└─ commitCatalog(candidate)
     → validate, store, publish snapshot
```

Current implementations to know about:

- Schema lookup and catalog record operations are in
  [`catalog/ops.ts`](../packages/core/src/controller/project/catalog/ops.ts). Effective inherited
  contracts and preview defaults are in
  [`catalog/field-contract.ts`](../packages/core/src/controller/project/catalog/field-contract.ts).
- Field metadata is derived by
  [`json-schema-fields.ts`](../packages/core/src/schema/json-schema-fields.ts). Inspector inputs
  are assembled in [`node/config/inspector.ts`](../packages/core/src/controller/project/node/config/inspector.ts).
- Catalog validation and cross-record integrity checks are in
  [`catalog/validate.ts`](../packages/core/src/controller/project/catalog/validate.ts), with JSON
  Schema matching in [`validation/json-schema-value.ts`](../packages/core/src/controller/validation/json-schema-value.ts).
- Schema-change value reconciliation lives in
  [`catalog/schema-values.ts`](../packages/core/src/controller/project/catalog/schema-values.ts)
  and is called by Core catalog mutations in
  [`project/controller.ts`](../packages/core/src/controller/project/controller.ts).
- Preview resolution and Inspector field composition live under
  `packages/core/src/controller/project/node/preview/`.
- Read-only catalog queries are currently collected in
  [`catalog/queries.ts`](../packages/core/src/controller/project/catalog/queries.ts): definition
  summaries, effective node tag names, style suggestions, and token lookup/reference paths. Token
  queries also live in `controller/style/tokens/global/query.ts`. There is no standalone search
  package today.

### Known overlap to resolve

- Catalog `$ref` expansion is implemented by functions named
  `resolveCatalogSchemaReferences` in both
  [`catalog/schema-values.ts`](../packages/core/src/controller/project/catalog/schema-values.ts)
  and [`preview/reference-resolver.ts`](../packages/core/src/controller/project/node/preview/reference-resolver.ts).
  They have related behavior but different input/output typing and are separate implementations.
  Decide on one Core owner and preserve the different caller needs through typed wrappers only if
  those needs are real.
- [`inspector-config-fields.ts`](../packages/core/src/controller/project/node/preview/inspector-config-fields.ts)
  adds catalog icon/component choices by injecting `enum` values into a schema copy. That makes a
  UI choice list look like a schema constraint. The future boundary should carry reference options
  as field metadata/context while keeping reference validity in Core; confirm any callers that
  currently rely on the injected enum before changing it.
- `FieldDefinition` and `JsonSchemaField` are Core exports, but the current `FieldType` union
  includes presentation-oriented kinds such as `richText`, `image`, `link`, and `token`. The
  `FieldDefinition` shape is not part of `ProjectCatalog` persistence; current consumers are the
  Core schema-to-field projection and Editor Inspector mapper. This makes it a real ownership
  question: keep it in Core only if it expresses a stable, non-UI contract used by multiple Core
  consumers; otherwise make the control-oriented descriptor Editor-owned and let Core return
  resolved schema/contracts and value data.
- Validation intentionally has distinct modes: full schema matching, partial object matching for
  sparse catalog values, accepted dynamic bindings, and catalog-target existence checks. A cleanup
  must name and preserve these semantics rather than merging them into one vague `validate` call.
- A schema change is a state transition, not just a schema-record edit: dependent field values and
  bindings may need reconciliation before the candidate catalog can be committed. Keep that work
  inside the Core transaction and make errors identify the affected path and contract.

## Editor: current responsibilities and APIs

Owner: `apps/editor`. The Editor owns authoring interactions, presentation choices, and mapping
user changes to Core commands. It may adapt Core results, but should not independently resolve
`$ref`s or redefine whether a catalog value is valid. Keep UI assembly here; put catalog candidate
discovery and schema validity rules behind Core queries.

```text
Schema authoring
  CatalogSchemaStage + SchemaEditor
  input: resolved/inline JsonSchema, Core-provided shared-schema and target candidates
  output: updated JsonSchema or DefinitionSchemaSet event

Inspector
  Core InspectorFormModel
    → InspectorService / sidebar-view-model / map-inspector-form
    → FormFieldConfig and ConfigField view data
    → Inspector controls
  input: Core contract/value data, bindings, exposure, query results for catalog choices
  output: Core InspectorFieldChange event

Preview/default values
  CatalogPreviewDataStage / CatalogSchemaStage
    → CatalogPreviewFields
    → SchemaValueForm
    → StructuralSchemaValueForm or JsonSchemaContractEditor
  input: resolved schema field, current value, Core query results for valid reference targets
  output: PreviewFieldSet event
```

Current modules include:

- `apps/editor/src/ui/schema/editor/`: schema contract authoring.
- `apps/editor/src/app-service/inspector.ts` and Core's
  `InspectorFormModel`: UI-facing Inspector view model and event boundary.
- [`map-inspector-form.ts`](../apps/editor/src/app-service/map-inspector-form.ts) and
  `sidebar-view-model.ts`: Core Inspector metadata to Form configuration and sidebar view data.
- [`json-schema-form-config.ts`](../apps/editor/src/ui/schema/json-schema-form-config.ts): direct
  JSON Schema to Editor schema-form configuration.
- [`SchemaValueForm.tsx`](../apps/editor/src/ui/controls/data/schema/SchemaValueForm.tsx),
  `StructuralSchemaValueForm.tsx`, and `JsonSchemaContractEditor.tsx`: schema-backed value editing.
- [`CatalogPreviewFields.tsx`](../apps/editor/src/ui/stage/CatalogPreviewFields.tsx) and
  `DefinitionFieldSettings.tsx`: Preview data and static component-field surfaces.

### Known overlap to resolve

- Schema-derived controls have more than one adapter: Core's `fieldsFromJsonSchema`, the Inspector
  mapper, and the direct `formFieldsForSchema` path. They serve different surfaces, but schema
  semantics such as enums, references, defaults, and nested objects should not drift between them.
- Reference options come from the active catalog and Editor context. Keep those options separate
  from the saved JSON Schema and pass them explicitly to field rendering.
- `AppService` coordinates operations, `InspectorService` adapts Inspector data, and view-model
  functions shape controls. When changing an API, identify which layer owns each transformation so
  a convenience helper does not become a second schema engine.

### Reference responsibilities

Reference handling should be centralized in Core as reusable capabilities, rather than reimplemented
inside token, node, style, and other controllers. “Centralized” does not mean every reference syntax
has identical meaning or should pass through one untyped resolver. Keep the shared mechanisms and
the policies that differ clearly separated.

Current reference families have different contracts:

- **JSON Schema `$ref`:** expands/reaches a shared schema definition; recursion and schema typing
  matter.
- **`SchemaSource.kind: 'ref'`:** selects a shared schema record for a definition.
- **`x-facadeur-reference.target`:** constrains a field to a catalog target such as an icon or
  component.
- **Token refs:** `{token: uuid}` and CSS token syntax resolve through the token graph; token type,
  fallback, and cycle rules belong to the token domain.
- **Property/runtime refs:** `{prop: ...}`, `{props: ...}`, `{item-prop: ...}`, `{index: ...}`,
  and `{state: ...}` resolve against a scoped node/preview context.
- **Definition refs:** `definitionRef` and `definitionRefBinding` select definitions and have their
  own graph and inheritance rules.

The Core reference boundary should provide shared identity/codec primitives where formats match,
catalog indexes and typed lookup/query operations, and common diagnostics/dependency traversal where
the same rules apply. Typed domain operations should retain their policy: schema expansion belongs
to schema handling; token evaluation belongs to tokens; runtime property resolution belongs to node
preview; definition resolution belongs to catalog/node composition. Avoid a single catch-all
`resolveReference` API whose behavior depends on hidden context.

Controllers should consume Core lookup or resolution functions when they need to find something.
They should not implement their own catalog traversal. A write API should normally receive an
explicit target (for example a node/definition ID or style context) and perform its domain mutation;
it should not secretly rediscover the owning node as a side effect of writing. If it needs a catalog
record, the shared Core query/index can resolve it. In particular, the Style API can read/write
style data using an explicit style target and consume the shared token/reference capabilities
without owning node discovery itself.

This also distinguishes **candidate lookup** from **reference evaluation**: a query returns valid
typed candidates for a request; a resolver evaluates a selected reference according to that
reference family's rules. The Editor may turn query results into dropdown/autocomplete options, but
does not own either operation's data semantics.

### Query data versus UI options

The word “options” currently hides two different responsibilities:

1. **Candidate discovery and validity (Core):** given the active catalog and a semantic request,
   return matching records or IDs. Examples include shared schemas, components, icons, schema
   fields, prop references, and token candidates. Core knows which candidates exist and which are
   valid for the requested reference target or value type.
2. **Presentation (Editor):** map returned candidates to Form options such as `{ value, label }`,
   grouping, descriptions, placeholder text, disabled state, and labels. Those are UI decisions.

Schema `enum` values are different: they are part of the schema contract and Core should preserve
and expose them as allowed values. A catalog reference's candidate IDs come from a Core query.
The Editor decides whether either becomes a select, autocomplete, or another control.

This keeps `AppService` thin without making `@facadeur/form` or Core depend on Editor UI types. The
Editor can mostly read Core view/query data and map user events to Core commands, while its
schema-to-control adapter remains responsible for presentation.

There is no evidence yet for a generic, cross-domain “search package.” Core already has query
modules with different owners (`catalog/queries.ts` and token queries), while `catalog/queries.ts`
also currently includes token and style-suggestion reads. Keep shared lookup/index capabilities
central and reusable, but keep domain query APIs with the data owners (catalog candidates with
catalog, token candidates with tokens). If a common search algorithm later serves multiple domains,
share that algorithm without merging their data ownership or returning UI-specific option shapes.

## Form package

Owner: `@facadeur/form`.

- Reusable controls and generic `FormFieldConfig` rendering live in `packages/form/src`.
- Form owns input rendering, local drafts where applicable, accessibility, and generic value-change
  callbacks.
- It should not import Core, know `ProjectCatalog`, resolve schema references, or decide whether an
  icon/component ID exists in the active catalog.

Editor may use Form's public API and supply typed options, values, disabled states, and event
handlers. Editor-specific field interpretation belongs in the Editor adapter layer.

## Downstream consumers

- Core preview uses effective contracts and reference resolution to produce renderable element
  configurations. It is a consumer of the same Core semantics, not an alternate catalog validator.
- Editor canvas consumes Core preview output.
- Codegen consumes catalog definitions and emits target code. It must preserve the saved schema and
  field-binding contracts, but UI field layout remains Editor-owned.
- `@facadeur/examples` supplies reusable sample catalogs; it does not own schema resolution or
  validation behavior.

## Agreed ownership direction and remaining proposal

1. **Domain:** keep saved data contracts and schema source unions; do not add runtime form logic.
2. **Core:** own catalog data, schema/reference semantics, validation, queries, reconciliation, and
   mutations. Provide reusable typed lookup/resolution capabilities to domain controllers. Keep
   algorithm details private where possible and return domain/query data rather than UI `SelectOption`
   or `FormFieldConfig` types.
3. **Editor:** own schema form construction, schema-field-to-control mapping, presentation choices,
   and interaction state. It consumes resolved Core schema/data and Core query results, then adds UI
   context (labels, grouping, bindings, exposure, placeholders). Reuse adapters across Inspector and
   Preview where semantics match while allowing different layouts.
4. **Form:** retain generic controls and rendering only. Do not move catalog or JSON Schema meaning
   into this package.
5. **No new package or saved-format change is proposed by this inventory.** First establish which
   public Core functions are the supported contract and which existing helpers can become private.

## Remaining decisions for review

- Should Core expose neutral schema field metadata, or should control-oriented `FieldDefinition`
  move behind the Editor schema adapter? `fieldsFromJsonSchema` is exported from `@facadeur/core`
  today, but the type is not persisted and includes Editor-oriented field kinds.
- What is the smallest stable public Core reference/query API that lets controllers reuse lookup
  without creating one monolithic resolver or exposing implementation internals?
- Which Core module owns catalog `$ref` expansion for validation, preview, and field derivation?
- Should reference choice lists be explicit metadata rather than temporary `enum` schema keywords?
- Which catalog-backed candidate queries belong on the Core read API, and what stable domain result
  types should they return before the Editor maps them to control options?
- Which validation result shape gives the Editor a useful field path and reason without duplicating
  Core validation logic?
- Which schema-change operations must reconcile dependent values and bindings before commit, and
  what undo/redo behavior must each preserve?

## Suggested order after review

1. Keep the persisted schema format unchanged and use the ownership direction above for new work.
2. Specify typed reference families and the shared Core lookup boundary before moving behavior.
3. Consolidate one demonstrated duplicate, starting with catalog `$ref` resolution, with focused
   compatibility checks for validation and preview.
4. Unify schema-to-control interpretation in the Editor while preserving separate Inspector and
   Preview layouts.
5. Review Core catalog validation and schema-change reconciliation boundaries; split only where
   independent responsibilities and stable inputs/outputs are clear.
6. Add behavioral coverage around schema changes, `$ref`s, icon/component targets, sparse values,
   dynamic bindings, preview defaults, instances, and undo/redo as each path is consolidated.

This is a map and a proposal, not a mandate to implement every item. Update it as ownership
decisions are accepted, and use it as an entry point for agents before schema-related edits.
