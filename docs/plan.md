# facadeur – Plan

## Editor form ownership cleanup

- [x] Refactor: move global-token selection queries from Editor into Core.
  - Evidence: `apps/editor/src/domain/token-references.ts` re-indexes the Core token tree to filter
    tokens by value type, encode UUID references, and find font-family records. Active token/font
    panels and tests consume these helpers, while `editing.ts` also re-exports them as if they were
    Editor-owned behavior.
  - Action: add focused token-query functions beside Core's global token-tree owner; migrate the
    Editor panels/tests to `@facadeur/core`, then delete the Editor helper and forwarding exports.
  - Scope: current package-ownership cleanup. Keep token editing commands and presentation labels
    in Editor; do not touch API/API-client or Store Yjs.
  - Contracts: preserve type filtering, sorted UUID reference strings, font token identity/order,
    and font weights consumed by typography controls.
  - Validation: Core token-query tests, focused token/font UI suites, Editor/Core typechecks,
    consumer search, detector, formatting, and `git diff --check`.
  - Result: `tokenReferencesByType` and `fontFamilyTokens` now live in Core's global-token query
    module and public API. Token/font panels and font tests consume Core directly; deleted the
    Editor query module and its `editing.ts` forwarding exports. Core parse/query, font-domain,
    and token-table suites pass 28 tests; Core and Editor typechecks and scoped formatting pass.
    The older `apps/editor/test/editing.test.ts` had imported removed root-level JSON fixtures;
    its token-query assertions were migrated to Core, and the remaining active interaction tests
    have since been rewritten against current behavior and added to the Vitest allowlist.

- [x] Refactor: route Editor UI Catalog operations through `AppService`.
  - Evidence: active stage, shell, and layer UI calls `app.core` directly for Core node building,
    schema/inspector reads, style edits, and tree mutations, even though `AppService` is documented
    as the UI-facing coordinator. This exposes Core's full controller API to presentation code.
  - Action: make the Core reference private to `AppService` and add named UI-facing forwarding
    methods for the current operations; migrate those callers. Keep session-owned selection,
    viewport, and navigation state in `EditorSession`, and keep Core snapshot reads behind the
    existing `getCoreSnapshot()` API.
  - Scope: current architecture cleanup. Do not alter API/API-client or Store Yjs.
  - Contracts: preserve existing Core operations, errors, event ordering, persistence, selection,
    and rendered output; no Catalog or persisted data changes.
  - Validation: focused Editor shell/layer/navigation tests, Editor typecheck, import audit, detector,
    formatting, and `git diff --check`.
  - Result: Core is private on `AppService`; UI stage and layer callers use named service methods
    for element/schema/inspector reads, style changes, and Catalog tree mutations. Document title,
    layer title, and navigation now use the existing Editor/Core snapshots rather than reaching
    through `EditorSession.core`. `session.core` remains only in the Shell composition root where
    it constructs the service and its in-memory Catalog port. Focused Editor validation passes
    5 suites / 13 tests; Editor typecheck, scoped Prettier, detector, import audit, and
    `git diff --check` pass.

- [x] Remove token-label forwarding shim
  - Evidence: `ui/design/tokens/token-labels.ts` only re-exports `tokenLeafLabel` and `tokenTitle`
    from `ui/controls/token-presentation.ts`; its three consumers can import that owner directly.
    The source-only `ComponentTokensPanel` is also in this consumer list and will be reviewed
    separately for reachability before any broader token UI cleanup.
  - Boundary: remove only the forwarding module and update imports. Keep token presentation
    behavior in its existing shared Editor owner; do not move or duplicate formatting logic.
  - Contracts: preserve rendered token labels and search/title strings. Do not touch the
    `@facadeur/tokens` package: API and Store Yjs then imported it, and those packages were outside
    that task's edit scope. The facade has since been removed with the user's explicit approval.
  - Validation: token-label and relevant token tests, typecheck, import audit, detector, and
    `git diff --check`.
  - Result: active token tables import the shared presentation functions directly; deleted the
    forwarding module. The unmounted component-token panel was later removed after a separate
    consumer audit. The full
    root suite passes 36 files / 125 tests. Editor typecheck was not rerun in this small import-only
    change; its two pre-existing diagnostics remain documented above. The removed module has no
    remaining imports.
- [x] Remove unused layer-policy forwarding exports
  - Evidence: `canEditLayerItem` and its Catalog-renamed alias were re-exported from action/policy
    modules but had no consumers; the policy implementation itself is used internally by delete
    and insert capability checks.
  - Boundary: remove only the two unconsumed forwarding exports. Keep the shared predicate and
    both legacy-document and Catalog layer actions unchanged.
  - Contracts: preserve context-menu capabilities and insert/delete behavior. No API, API-client,
    or Store Yjs changes.
  - Validation: root tests, Editor typecheck, export/import audit, detector, formatting, and diff
    check.
  - Result: removed both dead exports; root tests pass 36 files / 125 tests. Editor typecheck
    reports only the previously documented `CatalogPreviewDataStage` nullability mismatch and
    missing `jsonjoy-builder` declaration. No imports remain for either removed export.

- [x] Refactor: remove redundant Editor forwarding modules.
  - Evidence: `ui/sidebar/properties/layout/style-field.ts` only re-exports `layoutStyleField`
    from its parent owner, and `ui/controls/layout/spacing-field.tsx` only renames and re-exports
    `SpacingControl` plus `boxWith`; `SpacingEditor` has no consumers. `LayoutPanel` and the
    layout-control test can import the real owners directly.
  - Action: removed both forwarding modules, updated `LayoutPanel` to import `layoutStyleField`
    from the existing parent
    module, import `boxWith` from the spacing owner in its test, and remove the unused spacing
    helper re-export from the layout barrel. Keep the actual layout and spacing implementations.
  - Scope: current no-shims cleanup; preserve active behavior and the public form package boundary.
  - Contracts: no rendered control or command behavior changes; preserve `boxWith` semantics and
    LayoutPanel's use of the shared style command owner. Do not touch API/API-client or Store Yjs.
  - Validation: focused `layout-control.test.ts` passes 7 tests using a temporary config because
    the root Vitest allowlist excludes the legacy suite; the full root suite passes 37 files / 128
    tests. Editor typecheck has only the two known
    diagnostics (`CatalogPreviewDataStage` FieldValue nullability and missing jsonjoy TypeEditor
    declaration). Import audit finds no forwarding-module references; detector reports the existing
    511-line `LayoutPanel` review signal; `git diff --check` passes.
- [x] Refactor: remove the unused DocumentFile test-store adapter.
  - Evidence: `apps/editor/test/controller-store.ts` converts a legacy `DocumentFile` to
    `ProjectController`/`ControllerStore`, but its exported `createTestDocumentStore` has no
    imports anywhere in source or tests; the helper itself is also outside the current test
    allowlist.
  - Action: deleted the unreferenced adapter rather than retaining a test-only compatibility path.
  - Scope: current no-shims/test-fixture cleanup; no product or fixture data change.
  - Contracts: no callers or tested behavior depend on this helper; do not change Core's legacy
    controller API or persisted documents.
  - Validation: repository-wide consumer search found only this plan entry after deletion; root
    suite passes 37 files / 128 tests; candidate detector reports no size candidates; `git diff --check` passes.
- [x] Refactor: keep text-field draft state in the shared Form package.
  - Evidence: `packages/form` `TextField` owns its draft, but `apps/editor` `TextControl` mirrors the
    same value in another local state. Shared `TextArea` is controlled-only, so its Editor binding
    wrapper duplicates draft and commit behavior with `useDraftCommit`.
  - Action: make package `TextArea` own draft/reset/blur-commit behavior like `TextField`; keep the
    Editor `TextArea` as a thin form-path and commit adapter, and remove the duplicate draft mirror
    from `TextControl`. Keep `SearchInput`'s Editor draft adapter because package `SearchField` has
    no commit contract.
  - Scope: form ownership cleanup; preserve live form updates, commit-on-blur semantics, reset on
    external value changes, and existing Editor callbacks.
  - Contracts: package fields remain the only native input owner; Editor continues to bind field
    paths and distinguish live change from commit. Do not touch API/API-client or Store Yjs.
  - Validation: activated the Editor form integration suite and migrated its stale `Field` and
    `RecordField` imports/expectations to the current owners. Added a textarea draft/blur-commit
    assertion. Form typecheck passes; Editor typecheck retains only the two unrelated known
    diagnostics in `CatalogPreviewDataStage` nullability and the missing `jsonjoy-builder`
    declaration. The full root suite passes 41 files / 143 tests. The candidate detector reports
    no size candidates; native-control search confirms no direct `<input>`, `<select>`, or
    `<textarea>` elements in Editor source; `git diff --check` passes.
- [x] Correct Editor architecture and Form test documentation.
  - Evidence: `apps/editor/ARCHITECTURE.md` still described `session.project` as the live model
    and framed Core/renderer history ownership around the removed DocumentFile editor path.
    `docs/editor-form.md` said the Form suites needed a coverage decision after both were active.
  - Boundary: document current Catalog/Core/AppService ownership, identify the remaining synthetic
    design `FlatDocument` projection as a compatibility seam, and update the active test status.
  - Contracts: documentation only; do not change behavior or treat the projection as a second
    source of truth. Track its removal/migration separately.
  - Validation: checked claims against `EditorSession`, `CoreController`, `AppService`, and the
    active Vitest allowlist; `git diff --check` passes.
- [x] Review: retire the unmounted legacy style inspector surface.
  - Evidence: `StyleInspector` and `NestedStyleInspector` had no product imports; `LayoutPanel`
    was imported only by `StyleInspector`. The active `PropertiesPanel` renders
    `CatalogNodeInspector`; active CSS declaration editing remains through
    `CssDeclarationsControl` and `StyleDeclarationField`. The structured axis, breakpoint, and
    guided-grid inspector was only represented by paused DocumentFile tests and had no Catalog
    inspector route.
  - Boundary: remove the unreachable DocumentFile inspector and its tests as retired UI, while
    retaining active Catalog CSS declaration editing, Core style semantics, and layout controls
    that still have product callers. Do not claim parity for the retired structured UI; restoring
    it would require a separately scoped Catalog feature migration.
  - Contracts: no reachable Catalog behavior or persisted data changed. No shim or legacy
    inspector import remains.
  - Validation: source import audit confirms the removed inspector had no active consumers;
    current PropertiesPanel/CatalogNodeInspector and CSS declaration import paths were checked.
    The legacy interaction suites were retired, not counted as passing. The last root-suite run
    for that cleanup passed 42 files / 143 tests; focused token-table validation passed 16 tests.

- [x] Remove unused viewport-chrome compatibility helpers.
  - Evidence: `viewport-chrome.ts` had no production imports; its only consumers were direct unit
    tests. `FrameHost.setPreviewChrome` likewise had no production callers and accepted an ignored
    padding value; iframe padding and alignment defaulted to the same behavior at mount.
  - Boundary: remove the unreferenced title/storage resolver and ignored setter API; keep iframe
    zero-padding defaults and current viewport title rendering in `createViewportBoard`.
  - Contracts: retain the active stage's rendered title, iframe sizing, and zero-padding behavior.
    There was no active caller for content alignment overrides or the retired helper API.
  - Validation: repository-wide import search shows no remaining helper or setter references;
    focused FrameHost test passes; detector reports no size candidates; `git diff --check` passes.

- [x] Remove dormant per-DocumentFile token-reference adapters from the Editor.
  - Evidence: the `*TokenRefsForDocument` functions only read `FlatDocument.componentTokens`; no
    product UI or active Catalog path imported them. `editing.ts` re-exported those helpers without
    consumers. Global token-reference functions remain used by the Catalog design panels.
  - Boundary: remove the document-specific helper functions and re-exports; keep Core component
    token records and global token reference resolution unchanged for legacy/API/store consumers.
  - Contracts: preserve token suggestions used by active Catalog token and font panels. This
    removes only unreferenced Editor exports that depend on the retired DocumentFile path.
  - Validation: repository import audit found no consumers; active token-table and form tests are
    in the root suite. The former direct `editing.test.ts` invocation is outside the root Vitest
    allowlist because it depends on removed root JSON fixtures; no coverage claim is made for it.

- [x] Make Domain the shared owner of `FieldValue`.
  - Evidence: `@facadeur/domain` defined `FieldValue` with `null`, while Core's TypeBox schema and
    runtime `isFieldValue` explicitly reject null. This mismatch caused the Catalog preview stage
    to fail typechecking when passing the shared Domain value record to Core-backed fields.
  - Boundary: align the Domain type with Core's existing accepted scalar/object/array shape and
    make Core re-export that type. Keep runtime validation and serialized schema behavior intact.
  - Contracts: `null` remains invalid for field data; API files are untouched. Core, Domain, and
    Editor share one type definition.
  - Validation: Domain and Core typechecks pass; Core field-validation suite passes 7 tests; Editor
    typecheck now reports only the pre-existing missing `jsonjoy-builder` declaration.

- [x] Record and type the Editor's private `jsonjoy-builder` TypeEditor integration.
  - Evidence: `jsonjoy-builder` package exports only its root and stylesheet; its root declarations
    do not expose `TypeEditor`, while the Editor uses that component to preserve the current focused
    schema-type editing UI. A local ambient declaration is therefore needed for the existing deep
    import.
  - Boundary: keep the runtime import and its local type contract; align the declaration pattern
    with the extensionless internal import. This is a dependency typing bridge, not a document or
    runtime compatibility shim.
  - Replacement: treat the bridge as deprecated and remove it if `jsonjoy-builder` publicly exports
    `TypeEditor` and its props, or if the Editor intentionally migrates to a public component with
    equivalent behavior.
  - Validation: Editor typecheck passes after the pattern fix. The preceding workspace check
    passed all other 10 packages and projects; the only failure was the Editor diagnostic fixed here.

- [x] Refactor: remove the legacy `apps/editor/src/ui/form` directory and establish `@facadeur/form` as the only reusable form-element implementation.
  - Evidence: the directory previously implemented native text, number, search, color, select,
    combobox, checkbox, toggle, radio, and class-list inputs. Product screens across `ui/controls`, `ui/stage`,
    `ui/design`, and `ui/sidebar` import those implementations. `@facadeur/form` already owns
    corresponding text, textarea, number, search, color, select, boolean, autocomplete, and chips
    fields. The editor directory also mixes form context/path binding, schema translation,
    layout/feedback/overlay components, and dynamic editors.
  - Action: migrate actual form elements to `@facadeur/form` fields; add package-owned fields only
    where a required existing interaction has no equivalent. Keep thin editor adapters for
    catalog/session binding, schema translation, token/prop options, and commit semantics. Move
    editor layout, feedback, and overlay primitives to their UI owners. Remove the old directory
    and its demo only after Storybook and product consumers have moved. Do not use delete-and-fix
    as the discovery process.
  - Scope: current cleanup goal; preserve current behavior and do not add features.
  - Contracts: preserve editor session write/commit behavior, nested field paths, disabled/error
    state, token/prop reference values, keyboard/accessibility behavior, Storybook compositions,
    and existing public interactions. Only `@facadeur/form` may implement reusable form elements;
    app adapters must compose its exports rather than render replacement controls.
  - Validation: inventory/import audit, focused editor and form typechecks, relevant Storybook
    stories and behavioral coverage, `git diff --check`, and detector rerun. Keep API and
    API-client outside this task; do not restructure `store-yjs`.
  - Progress: `TextControl`, `TextInput`, `TextArea`, `NumberInput`, `SearchInput`, `Select`,
    `Combobox`, `Checkbox`, `Toggle`, `RadioGroup`, `SegmentedControl`, and `ColorInput` now compose fields from
    `@facadeur/form`; editor adapters retain binding/path, labels, and commit behavior.
    `ClassListInput` was replaced by package `ChipsField` in Storybook and consumers, then removed.
    Package fields now forward required input attributes and preserve blur handling. The package
    `ColorField` owns the picker interaction, with a thin editor binding adapter. A package
    `RadioGroupField` now owns the radio input; the
    no-props disabled select also uses package `SelectField`. The old `ui/form` directory has since
    been removed after its context, dynamic editor fields, layout, feedback, and overlay modules
    moved to their owners. The editor schema renderer and its
    field config have moved to `ui/controls/data/schema-form`; JSON-schema integration and its
    Storybook story now import from that owner.
    The schema form and manual form demo now compose the public package `RecordField`; the schema
    renderer supplies catalog path binding and prop-reference options, and the former local record
    editor was removed.
    Keep the render-prop Editor `ArrayField` as a binding wrapper: it owns dotted/indexed path
    prefixes, recursive Catalog schema rendering, and editor density/collapsible-row presentation.
    The package `RepeaterField` owns data-driven `FormFieldConfig` rows for package consumers.
    Both compose reusable package fields for their inputs; their similar add/remove actions do not
    share the same rendering or binding contract, so do not merge them or move Editor context into
    `@facadeur/form`.
  - Ownership audit: remaining product controls were checked after the migration; the organisation
    member role selector now uses package `SelectField`. No rendered native form control remains in
    Editor source or Storybook outside `packages/form`. The one raw input is created on demand as a
    browser file-picker in `domain/assets/files.ts`, which has no equivalent package field.
  - Native-field follow-up: replace standard project, management, layer, and grid fields with
    public package fields while preserving browser validation, names/FormData handling, datalist
    suggestions, resets, CSS classes, and editor commits. Keep raw DOM controls only for specialized
    interactions that the package API cannot express; the disconnected schema-library view was
    later retired after confirming it had no active consumer. The initial scan found 24 native
    controls outside `ui/form` and one Storybook example, plus a 480-line style declaration editor
    and 14-file layer directory for independent ownership review.
    Scope: current cleanup goal; do not touch API/API-client or store-yjs.
    Validation: import/native-element audit, focused package/editor typechecks, affected Storybook
    panels, detector rerun, and diff check.
    Progress: all standard active Editor and Storybook controls now use public `@facadeur/form`
    fields, including management inputs, the viewer selector, layer search/rename/group controls,
    breakpoint width, grid controls, and CSS declaration editors. Their existing state, validation,
    suggestions and commit behavior remain in the owning Editor features. The three old schema-stage
    selects and Storybook checkbox also use package fields. The unmounted flat-document schema
    screens, schema-use preview form, and their stage-only tests have since been removed; active
    schema editing uses `CatalogSchemasPanel` and `CatalogSchemaStage`. Event control behavior is
    covered directly without mounting the disconnected `ComponentEvents` FlatDocument wrapper;
    Core's flat schema records/default resolution are preserved.
    The deprecated `PreviewDataStage` and its paused test have been removed; shared parsing and
    migration helpers remain, and the active `CatalogPreviewDataStage` still needs direct behavior
    coverage in a future test-migration task.
  - Shared UI extraction: `IconButton` was imported by data controls, design settings, token
    editing, and the component inspector despite being nested under `ui/form`. It now lives in
    `ui/components`, and these consumers share the same implementation. The form directory no
    longer owns this cross-domain button primitive.
  - Shared presentation extraction: `Field`, feedback messages, layout primitives, and Radix
    overlays are editor UI components, not form controls. Move their implementations to
    `ui/components/{feedback,layout,overlay}` and keep temporary deprecated re-exports from
    `ui/form/index` while consumers migrate. Remove their `FormContext` dependency by letting the
    root form provide density through inherited CSS variables; explicit per-control gaps continue
    to override the default. Preserve labels/hints/errors, keyboard behavior, overlay focus/close
    behavior, and compact/comfortable spacing. `form.css` remains in place until its global
    selectors and tokens have a single stylesheet owner.
    Scope: current cleanup goal. Validation: consumer/import audit, form and editor typechecks,
    focused Storybook layout/overlay stories, detector, formatting, and diff check.
    Progress: implementations and public barrels now live under `ui/components`; all Editor and
    Storybook imports use those owners, and the old `ui/form` presentation exports are removed.
    `Stack` and `Inline` now inherit compact/comfortable density through CSS variables instead of
    reading form context.
  - Editor binding rehome: after presentation moves, `ui/form` contains the Editor's nested-path
    context, `live`/`commit` adapters over package fields, and a render-prop array composition used
    by recursive schema forms. Move this integration to `ui/controls/form-binding`, move its
    global form stylesheet to `ui/styles`, and update consumers/tests. Move token search matching
    to the token UI owner and use the public form option types directly; delete the leftover form
    option alias once consumers are updated. Preserve dotted/bracket path rules, disabled state,
    prop references, blur/Enter commits, density, and array row behavior. Remove `ui/form` once no
    imports remain.
    Scope: current cleanup goal. Validation: import audit, Editor/form typechecks, form binding
    behavioral coverage, relevant Storybook forms, detector, formatting, and diff check.
    Progress: all binding/context/array modules now live under `ui/controls/form-binding`; the
    stylesheet lives under `ui/styles`; token matching lives under `ui/design/tokens`; package
    option types are imported directly from `@facadeur/form`. `apps/editor/src/ui/form` has been
    removed. Remaining paused Editor tests stay in the fixture-migration review; tests that only
    exercised retired schema-stage UI have been removed.
  - Editor schema-form ownership: `SchemaForm` and its editor `FieldConfig` translated catalog and
    JSON-schema fields into editor controls. They now live in `ui/controls/data/schema-form/`,
    alongside the data controls they compose; JSON-schema integration and Storybook consumers use
    that public subdomain barrel. Reusable form fields remain in `@facadeur/form`, while path
    binding and session-aware wrappers remain Editor integration. All existing variants, nested
    paths, schema defaults and commits are preserved. Package typecheck, formatting, import audit
    and diff check pass; the detector has no size candidate and still reports the 19-file
    data-controls organization review. Editor typecheck retains the listed pre-existing errors.
    Config consolidation reviewed and retained: although names overlap with
    `@facadeur/form`'s `FormFieldConfig`, the Editor config drives a different renderer and adds
    `schemaField`, `classList`, toggle/checkbox aliases, recursive array items, and editor-only
    required/hint/prop-binding semantics. Reusing the package renderer contract would couple the
    Editor adapter to behavior it does not use. The shared leaf inputs themselves already come
    from `@facadeur/form`.
    Editor controls now use package `AutocompleteOption` directly. Token filtering uses a private
    matcher owned by the token UI.
  - Validation note: the package typecheck passes. An ownership audit confirms the Editor has no
    `ui/form` or `ui/forms` directory and no rendered native `input`, `select`, or `textarea`; its
    `controls/form-binding` fields delegate to `@facadeur/form`. That layer retains editor-specific
    dotted-path, live/commit, prop-binding, and recursive-schema composition behavior. The one
    raw input is the browser file picker in `domain/assets/files.ts`. Editor typecheck still reports existing Radix,
    `Inline.alignItems`, `FieldValue`, and `jsonjoy-builder` diagnostics, with no diagnostics on the
    migrated adapters. The legacy `SchemaForm.placeholder` union error was fixed during this pass.
    Root Vitest includes every current `apps/editor/test/**/*.test.ts(x)` file, including the Form
    package adapter and overlay suites. These cases cover active path binding, field commits,
    add/remove behavior, error labels, and overlay keyboard interactions.
  - Color ownership migration: `ColorInput` duplicated the package's basic `ColorField` with
    editor-only hex/RGBA/EyeDropper behavior. The complete interaction and pure helpers now live in
    `@facadeur/form`; the thin binding adapter preserves normalized `#RRGGBBAA` values and
    live/commit semantics.
    Package typecheck, formatting, detector, and diff checks pass; editor typecheck reports only
    the existing diagnostics listed above.
  - Segmented selection migration: `SegmentedControl` is now a package-owned field used through a
    thin editor binding adapter in the Schema Type editor and demo. Its segmented styling moved out
    of the legacy `form.css`; the package style module includes editor-token fallbacks.

## Package ownership cleanup

- [x] Remove the deprecated, unmounted Editor expose-authoring UI.
  - Evidence: `ComponentExpose` has no production imports, `ExposeEditorControl` is its only
    consumer, and the current `PropertiesPanel` renders `CatalogNodeInspector` for Catalog-backed
    assets. The only remaining control tests exercise the retired parent-authored alias UI.
  - Action: delete `ComponentExpose`, `ExposeEditorControl`, its barrel export, and its UI-only tests.
    Keep Core's `Expose` data, `setExpose` command, resolver, serialization, and codegen support for
    existing files until child-contract inheritance is implemented and persisted data is migrated.
  - Scope: remove a dead deprecated Editor surface without changing persisted data or API packages.
  - Contracts: current Catalog inspector behavior remains unchanged; old alias data continues to
    validate and resolve in legacy paths.
  - Validation: import audit, Core contract tests, root suite, detector rerun, and diff check.
  - Result: removed the unmounted alias editor, its wrapper and barrel export, and tests that only
    exercised that deprecated UI. Core legacy alias validation/resolution and `setExpose` remain for
    persisted documents. No Editor imports remain; the full suite passes 25 files / 99 tests.

- [x] Restore shared project icons in the current Catalog model.
  - Evidence: the Editor exposes an Icons design panel and toolbar icon lookup. The Catalog model
    had no icon field, and `designSliceFromCatalog` omitted icons, so Catalog-backed projects
    rendered an empty panel and toolbar fallbacks.
  - Action: move the shared `IconDefinition` type to Domain, store icon resources on `ProjectCatalog`,
    validate them in Core, use Examples as their reusable source, and carry icons through Core's
    design slice. Do not touch API/API-client or introduce a compatibility adapter.
  - Scope: restore existing reachable icon behavior during package cleanup.
  - Contracts: preserve icon ids, names, categories, source strings, toolbar lookup, filtering, and
    selection/details behavior. Catalogs without icons remain valid and preserve omission.
  - Validation: Core and Examples typechecks pass; the full suite passes 25 files / 99 tests. Editor
    typecheck reports only the two existing unrelated diagnostics (`CatalogPreviewDataStage`
    FieldValue nullability and the missing `jsonjoy-builder` declaration). The direct panel test
    uses a Catalog-backed EditorSession without a conversion fixture or full Editor shell.
- [x] Refactor: route Editor catalog transport through the Core controller boundary.
  - Evidence: `CoreController.persist/reload` already accept `CatalogPort`, but `AppService`
    separately calls the extended `EditorCatalogPort` for create/delete and then replaces Core's
    catalog snapshot. This leaves some catalog I/O outside the controller's path.
  - Action: define the smallest transport capability Core needs and route load/save/create/delete
    through Core methods while keeping HTTP implementation in the Editor adapter. Do not make
    Core import API/API-client or move transport into Domain; Domain may hold only shared types.
  - Scope: current cleanup goal; no edits inside `packages/api` or `packages/api-client`.
  - Contracts: preserve server CRUD semantics, catalog validation, open-definition selection,
    errors, save ordering, and dirty-state behavior.
  - Validation: focused Core/AppService behavior coverage, typechecks, Storybook catalog settings
    interactions, and import-path audit.
  - Progress: Core now owns the create/delete transport orchestration alongside its existing
    persist/reload methods. AppService delegates create, delete, and save to Core; the Editor
    adapter still implements transport. Definition patching remains a local Core mutation and is
    persisted through the existing save flow; the unused direct patch transport method was removed
    from the Editor adapter. Core depends only on Domain catalog types and the transport
    capability, with no API/API-client dependency. The Core controller remains cohesive as the
    project state owner; its detector signal alone does not justify splitting. A follow-up source
    audit found Editor catalog HTTP calls only in `domain/project/catalog-port.ts`; UI writes call
    AppService or Session and are persisted/reloaded through Core.

- [x] Refactor: remove Core's runtime dependency on example fixture IDs.
  - Evidence: `packages/core/src/schema/document.ts` imports `exampleIds` from
    `@facadeur/examples`, and `@facadeur/core` declares Examples as a runtime dependency. Examples
    is intended to be Storybook/test fixture data, not a dependency of core logic.
  - Action: identify why default document creation needs those stable IDs and move the contract or
    data to the correct owner without making Core depend on fixture catalogs. Keep fixture values
    and generated document behavior unchanged. Core owns its default viewport IDs; Examples reuses
    that public contract.
  - Scope: current cleanup goal; separate from the first form migration batch.
  - Contracts: preserve all default node/token references, stable UUIDs, and catalog validation.
  - Validation: document creation coverage, core/examples typechecks, import-graph audit, and
    detector rerun.
  - Progress: `defaultBreakpointIds` now belongs to Core; the Examples ID catalog imports it, so
    the stable UUIDs have one source. The Core runtime dependency on Examples moved to dev-only for
    Core fixtures/tests, while Examples depends on Core for these shared default IDs. No catalog
    values changed.

- [x] Refactor: reconcile token logic ownership across Core, Tokens, and Style Engine.
  - Evidence: Core owns `readTokenTree`, token contracts, reference validation, and responsive
    value resolution. Style Engine owns the shared CSS rule compiler used for text output and
    runtime CSSOM insertion. At the time this migration was recorded, API and Store Yjs still
    imported `@facadeur/tokens`; the facade has since been removed after those imports were moved.
  - Action: token resolution and CSS-property behavior now live in Core; stylesheet compilation
    and runtime insertion share Style Engine's CSS compiler; templates and reusable fixtures live
    in Examples. The token facade was later removed; API and Store Yjs now import the owning
    packages directly.
  - Scope: token ownership cleanup; API/API-client and Store Yjs were unchanged in the original
    pass, then their import boundaries were changed with explicit user authorization to remove the
    last shim.
  - Contracts: preserve stable token IDs/paths, raw values, aliases/references, responsive sparse
    overrides, CSS variable names, generated CSS, and Codegen output.
  - Validation: Core, Examples, Codegen, and Tokens typechecks passed after the offline workspace
    install. Style Engine's standalone typecheck reports existing Store Yjs and test typing errors,
    with no changed-source errors; Server reports existing Store Yjs and test type errors, with no
    diagnostics in its migrated validation module; Editor reports its documented existing
    diagnostics. The user-run Core token parse/roundtrip suites pass 10/10, and Style Engine's
    engine/axis/design-css suites pass 24/24. Preserve token UUID/path contracts, raw values,
    sparse responsive overrides, exact CSS property naming, CSS output and Codegen output.
  - Progress: token resolution and CSS-property code now live in Core; project-template data lives
    in Examples; Style Engine owns shared CSS rule output. Editor, Server, Codegen, and Style Engine
    did not import the compatibility package. The first install exposed a workspace cycle through
    Style Engine's
    Store Yjs test dependency; move CSS tests to Style Engine and share their fixtures through
    Examples so the deprecated facade does not depend on Style Engine. CSS tests now live with
    Style Engine, and token test fixtures are shared through Examples. The repeat install removed
    the Tokens/Style Engine/Store Yjs cycle; the remaining Core/Examples cycle is test-time from
    Core's fixture imports. API and Store Yjs were the only runtime consumers of the deprecated
    facade; it contained no token or CSS implementation. Their imports were later migrated under
    the dedicated no-shim cleanup entry.
  - Cleanup: removed the Editor's stale Next.js transpile/alias entries for `@facadeur/tokens`.
    Evidence: the active Editor source import audit has no facade imports and the package is no
    longer an Editor dependency. At that point, runtime consumers in API and Store Yjs remained. The
    affected-path detector reports no size candidates; `git diff --check` and a follow-up config/
    import audit pass.

- [x] Refactor: group React Codegen story generation by responsibility.
  - Evidence: the candidate detector reports 12 direct source files in
    `packages/codegen/engines/react/src`; the folder contains CLI/output wiring, component and CSS
    generation, and story generation, with `component/` and `workspace/` already grouping larger
    subdomains. `stories.ts` and `story-data.ts` are a two-module Storybook-generation unit.
  - Action: move those two modules into `stories/` and retain the existing `./stories` import path
    through an explicit barrel. Keep CLI, file-output, CSS, and component-render modules at their
    current focused boundaries.
  - Scope: current cleanup goal; organization only.
  - Contracts: preserve public Codegen exports, generated project files, story output, CSS, and CLI
    behavior.
  - Validation: Codegen typecheck passed, detector reports no size candidates, formatting and
    diff checks pass. Before retiring the deprecated-only test group below, the user's full run
    passed 22 suites and 89 tests, including the focused four-test `story-data` suite. The broader
    `generate` suite depended on removed v1 JSON files; no fixtures or v2-to-v1 bridge were
    restored. The deprecated-only coverage is now retired below.

- [x] Retire tests for the deprecated React Codegen v1 generator.
  - Evidence: `packages/codegen/engines/react/test/generate.test.ts` reads the deleted
    repository-level `examples/*.json` v1 fixtures and exercises the deprecated
    `DocumentFile`-based generator. Inspection found that every suite under
    `packages/codegen/engines/react/test` and `packages/codegen/test` tests this same deprecated
    input/API; even `story-data.test.ts` enters through `generateReact`. The package README and
    public exports mark the generator deprecated, and there are no production callers.
  - Action: remove the v1-only tests, helper, engine implementation, templates, CLI, and public
    exports rather than restore deleted JSON templates or add a v2-to-v1 bridge. Keep the root
    command disabled until catalog-driven generation is implemented.
  - Scope: current deprecated-code cleanup; no catalog-generation feature work.
  - Contracts: preserve the current catalog Code view. Keep API/API-client and Store Yjs untouched.
  - Validation: removed the deprecated test paths from the root allowlist and removed the engine
    alias. The package is now a dependency-free placeholder; lockfile-only offline install passed,
    no old engine imports remain, and the user's full test suite passes 21 files / 86 tests.
    Future tests should target catalog-driven generation when that implementation exists.

- [x] Refactor: register Core's UUID schema format with Ajv without changing validation.
  - Evidence: `schema.ts` and `json-schema-value.ts` each construct Ajv with `strict: false`,
    while Core's TypeBox document schemas already pair `format: "uuid"` with a UUID pattern.
    Unknown-format warnings are repeated across the full test run.
  - Action: centralize Core's Ajv construction and register `uuid` as annotation-only, which
    matches current behavior for custom JSON Schemas and leaves the persisted document regex as
    the UUID check.
  - Scope: Core validation configuration only; no data or validation contract change.
  - Contracts: retain all existing JSON Schema validation results and error behavior.
  - Validation: Core typecheck, scoped formatting and candidate scan pass; an Ajv smoke check
    compiles a `format: "uuid"` schema without a warning. The user's full `pnpm test` passes 21
    suites and 85 tests, with all repeated unknown-UUID-format warnings gone.

- [x] Refactor: remove the unused Editor adapter for legacy document-based Codegen
  - Evidence: `packages/codegen/src/types.ts` accepts legacy `DocumentFile[]`; the root `pnpm codegen`
    script stays disabled; and
    `apps/editor/src/deprecated/CodeStage.tsx` was the only Editor caller; the active
    `CatalogCodeStage` displays Core's build config and says codegen is not wired. Its two-test
    `code-preview.test.ts` only tested that deprecated v1 adapter, and was outside the root test
    allowlist.
  - Action: remove the unused v1 Editor stage, adapter, test, and Editor dependency. The later
    Codegen cleanup below also removed the unconsumed legacy engine and compatibility exports.
    Keep the root command disabled; implementing catalog generation is separate feature work.
  - Scope: current package ownership cleanup.
  - Contracts: preserve the current Catalog Code view and Editor behavior. Do not touch
    API/API-client.
  - Validation: source import audit, Codegen typecheck, detector, and diff check; confirm no
    active Editor import of Codegen remains.

- [x] Refactor: retire the private deprecated DOM renderer package.
  - Evidence: no product source imports the private package. The active Editor canvas uses React
    `DynamicElement` with Core's `ElementBuildConfig`; package behavior was confined to compatibility
    tests and paused Editor suites using removed v1 JSON fixtures.
  - Action: remove the package, Editor's test-only dependency, test alias/allowlist entry, and four
    paused tests that exercised the old renderer. Keep Core preview resolution and the React canvas.
  - Scope: deprecated renderer cleanup; no Store Yjs or API/API-client changes.
  - Contracts: preserve the active canvas output, responsive previews, style injection, and Core
    resolver contract.
  - Validation: root `pnpm test` passes 22 suites/88 tests; Core and Editor typechecks, lockfile,
    import audit, detector, and diff checks are recorded with the result below.

- [x] Refactor: organize Editor data controls by responsibility.
  - Evidence: the scoped detector reported 19 direct source files in `ui/controls/data`. The files
    combine schema-backed field editing, catalog bindings, events, data directives, and exposure
    controls; only schema-form files have a clear subdomain migration in the current batch.
  - Action: moved bindings, events, directives, and schema-value controls into cohesive subdomains
    with focused barrels; retain shared field-path and label helpers at the data-control boundary.
    Keep the exposed controls discoverable through the existing `data/index.ts` barrel. Do not
    create one folder per file or a generic shared layer.
  - Scope: current cleanup goal, based on imports and responsibility overlap already audited.
  - Contracts: preserve catalog field paths and value formats, binding target normalization, event
    payloads, active Catalog control exports, and all current consumer imports. The old
    FlatDocument-only directive UI is classified and retired below; no Catalog adapter is added.
  - Validation: import audit found no stale direct paths, focused Editor typecheck reported no
    errors in moved controls (remaining diagnostics are pre-existing), detector rerun reports no
    concentration candidate, formatting passed, and `git diff --check` passed. The relevant
    Style Engine suites pass 24/24 in the user's CMD environment.
  - In-scope consolidation: event controls and `ComponentEvents` separately stripped legacy
    `payload` properties from edited definitions/bindings. Move this canonicalization to the
    Editor event domain; preserve untouched legacy records and only strip the legacy property when
    the user edits that record.
    Contracts: keep event names, schema-backed `data` mappings, and legacy read compatibility.
    Validation: event-binding regression assertion in the active root Vitest allowlist, Editor
    typecheck, detector rerun, and diff check. The selected test is independent of the paused v1
    example-fixture group.
    Result: `withoutLegacyEventPayload` in `domain/events.ts` now owns this edit-time
    canonicalization for event definitions and bindings; unedited records still pass through
    unchanged. The Editor typecheck reports no diagnostics in the changed files. The focused event
    tests were initially outside the root Vitest allowlist; the fixture-independent binding test
    now asserts legacy payload removal on edit and is included in that allowlist. The programmatic
    targeted run reached the known sandbox `EPERM` while resolving Vitest under
    `node_modules/.pnpm`, before test collection. The detector reports no size candidates and
    `git diff --check` passes.
  - Result: mapped 19 direct files and all consumers. The boundaries are bindings, event
    definitions/bindings, data directives, and schema-backed values; shared field labels/paths
    remain at the parent level. The schema-form subdomain is already nested. Preserve all current
    consumers by updating imports and retaining the existing root barrel exports.
  - Result: moved the controls into `bindings/`, `events/`, `directives/`, `fields/`, and
    `schema/`; split field parsing/type options from binding normalization. Updated every source and
    test import, keeping the root barrel's prior exports. No stale direct paths remain, the detector
    now reports no concentration candidate, changed-file Prettier passes, Style Engine typecheck
    passes, and Editor typecheck has no errors in moved files. Focused Style Engine tests exposed
    stale assumptions about token CSS grouping and breakpoint-name keys; those assertions now use
    the current data model. The first CMD rerun passed 23/24; the remaining mismatch was the
    case-sensitive canonical path `color.bg.Canvas` (not `color.bg.canvas`) and is corrected.
    Final CMD run passes all 24 tests across the three Style Engine suites. AJV emits non-fatal
    warnings that its configured format checker does not recognize `uuid`; schemas still validate
    in these suites.

### Move design UI out of the sidebar tree

- [x] Refactor: align design settings and shared design controls with their actual owners.
  - Evidence: `DesignDomainStage` and `EditorShell` render several modules from
    `ui/sidebar/design`; token table helpers and domain views are not Sidebar components. The
    current `DesignPanels.tsx` also mixes the Fonts implementation with unrelated re-exports.
  - Action: place reusable design-domain UI under `ui/design`, catalog-level settings panels and
    settings navigation under `ui/settings`, and import each view directly. Keep actual inspector
    panels under `ui/sidebar` and preserve shared design controls for both their current callers.
  - Scope: current task; reorganize source ownership without changing rendering or behavior.
  - Contracts: preserve exported component props, navigation domain types, token and viewport
    behavior, form ownership, and the existing Sidebar inspector imports.
  - Validation: import-path search, Prettier, `git diff --check`, and the refactoring detector
    pass. Editor typecheck still reports existing workspace errors; the only diagnostics in moved
    files are unresolved `@facadeur/domain` package imports, unrelated to their new paths.

### Shared settings table frame

- [x] Restore responsive token editing from the viewport tabs.
  - Evidence: `EditorSession` stores `editTarget` in its snapshot; `ViewportTabs` selects the
    matching base or breakpoint target; `TokensDomainPanel` passes that target to token rows.
  - Boundary: retain the cohesive token-row implementation, and keep sparse breakpoint writes and
    per-row reset behavior in the existing Core-backed editing flow.
  - Contracts: preserve stable breakpoint UUIDs, base token values, sparse overrides, and unrelated
    breakpoints when editing or resetting one override.
  - Validation: `pnpm exec vitest run apps/editor/test/token-tables.test.tsx` passes 16 tests,
    including selected-tablet typography editing and breakpoint reset coverage.

- [x] Add UUID identity groundwork for DTCG token fixtures and editor-created tokens.
  - Evidence: Core reads an optional token UUID but the published schema omits it; editor token
    creators do not assign one; example tokens use a separate static path map; the example token
    tree mixes color, radius, shadow, spacing, and typography definitions in one module.
  - Action: define the shared UUID/reference metadata contract in Domain, align Core's typed and
    runtime schema/parser contracts, split example token data by token family while keeping its
    UUIDs static and completeness-checked, and route editor-created tokens through one identity
    constructor.
  - Scope: current task; do not generate example IDs dynamically or alter token values/paths.
  - Contracts: external DTCG tokens may omit Facadeur UUID metadata; tokens created by the Editor
    and all example fixtures have unique stable UUIDs; preserve all existing static example IDs,
    token paths, values, and current token-reference serialization.
  - Validation: Domain and Examples typechecks pass; the local TSX runtime load validates the
    example token tree and stable reference lookup. Core and Editor typechecks still fail on
    existing unrelated workspace errors; no diagnostics point to changed files. Prettier,
    `git diff --check`, and the refactor detector pass. The core schema/parser now rejects
    malformed and duplicate token UUIDs.

- [x] Refine token settings rows: remove status column, right-align actions, and rename token paths safely.
  - Evidence: Base repeats the same status on every row, action buttons leave unused trailing space,
    and only the optional display label is currently editable.
  - Action: remove status cells, align row actions at the table edge, and support changing the
    canonical token path while preserving its UUID and rewriting existing references.
  - Scope: global design-token settings and the core command needed for safe path changes.
  - Contracts: preserve token values/metadata, stable UUIDs, and existing references across catalog
    styles, token values, and open design documents.
  - Validation: Prettier and `git diff --check` pass; the refactor detector found no size candidates.
    Form typecheck passes. Core/editor typechecks still report existing errors in unrelated areas;
    none point to the files changed for this item.

### Unified design-token model

- [x] Settings: use TransformableField for spacing token values.
  - Evidence: `TokensDomainPanel` already renders Spacing through the shared settings `Table`, but
    `token-table-row.tsx` still uses the legacy `TokenValueControl` for dimension values while
    Colors uses editor-supplied options with `TransformableField`.
  - Action: share token-option grouping in `ui/settings/config`, then supply compatible dimension
    token references and a direct dimension mode to the Spacing value cell. Keep the existing
    table, token grouping, and Colors option output unchanged.
  - Scope: current task; migrate Spacing only.
  - Contracts: preserve literal dimension strings, `{token:uuid}` references, self-reference
    filtering, and breakpoint override/reset behavior; do not change `@facadeur/form` or token
    persistence.
  - Validation: focused editor tests, editor typecheck, Storybook Settings · Spacing interaction,
    `git diff --check`, and the refactoring detector.

- [x] Refactor: share the token-editor field row in `ui`.
  - Evidence: global Typography settings and Spacing had separate label/control wrappers with
    inconsistent alignment.
  - Action: consolidated the shared fieldset and aligned label/control/meta row in
    `ui/combofield/ComboField`; Typography, structured Shadow, and global Spacing use it. The
    editable `fontFamily` row is omitted from `DesignTypographyEditor`, while stored values and
    previews retain it.
  - Scope: token editor presentation and the Family-row removal only.
  - Contracts: preserve control names, labels, token options, transform behavior, sparse
    responsive overrides, and component-token Typography use. Other typography edits leave stored
    `fontFamily` values unchanged. Avoid an Editor/Form dependency.
  - Validation: formatting and `git diff --check` passed; the affected-path detector reports no
    size candidates. Editor typecheck retains existing unrelated diagnostics, with none reported
    for the changed files.

- [x] Refactor: share token-backed fieldsets through `ui/combofield/ComboField`.
  - Evidence: Typography, structured Shadow layers, and Spacing each assemble a bordered group and
    labeled token controls, but field rows and fieldsets currently have separate implementations.
  - Action: add a fieldset renderer configured by a list of labeled token fields or custom controls.
    Use it in Typography, `ShadowObjectEditor`, and the global Spacing token row; remove the
    superseded `TokenEditorField` once migrated.
  - Scope: current task; consolidate shared presentation while keeping per-domain parsing,
    validation, draft state, and commit behavior in their current owners.
  - Contracts: labels and token options are supplied by callers; preserve token values, control
    names, responsive inheritance/reset, Shadow arrays and inset behavior, and TransformableField
    callbacks.
  - Validation: formatting, `git diff --check`, and detector rerun passed. Editor typecheck has
    existing diagnostics in unrelated files; changed files had no reported diagnostics.

- [x] Refactor: use TransformableField throughout Typography and Shadow editors.
  - Evidence: structured Typography fields and some Shadow fields still use `TokenValueControl`,
    which pairs a token autocomplete with a separate direct-value switch; whole-token aliases use
    the same legacy interaction.
  - Action: render both alias and structured fields as custom `ComboField` controls using
    `TransformableField`; share token option construction from `ui/settings/config` and add an
    optional commit callback to TransformableField so Typography keeps its blur-based validation.
  - Scope: current task; the form control owns transform mode and text commit events, while the
    domain editors retain parsing, validation, draft state, and persistence callbacks.
  - Contracts: preserve token refs, raw values, accessible external labels, Typography sparse
    overrides and reset behavior, Shadow arrays/inset/advanced JSON, and valid-value commits.
  - Validation: form package typecheck, formatting, `git diff --check`, and detector rerun passed.
    Editor typecheck reports existing diagnostics in unrelated files. Storybook build is blocked by
    SWC failing to canonicalize the Windows editor path; no tests were run.
  - Scope: current task; Settings · Shadow only.
  - Contracts: preserve the structured shadow object/array shape, token references, validation,
    advanced JSON, viewport overrides/reset, and the existing `@facadeur/form` API. Do not change
    persisted values or component-token editing.
  - Validation: Storybook Settings · Shadow interaction, Prettier, `git diff --check`, and the
    refactoring detector pass. Editor typecheck remains pending: Corepack cannot fetch pnpm 10.33.3
    from this environment; run it in the user's CMD environment.

- [x] Separate token-row assembly from preview rendering.
  - Evidence: the scoped refactor detector now reports `token-table-row.tsx` at 451 lines. The file
    combines row editing/writes with independent color, dimension, shadow, and typography preview
    rendering.
  - Action: move the existing preview component and its private formatting helpers to a colocated
    `token-table-preview.tsx`; keep row assembly and token write routing in `token-table-row.tsx`.
  - Scope: current task prerequisite identified by the post-change detector.
  - Contracts: preserve preview markup, CSS classes, title/value text, token resolution, and row
    editing behavior; keep the preview private to the token settings feature.
  - Validation: Storybook Settings · Shadow visual check, Prettier, `git diff --check`, and the
    refactoring detector all pass; no size candidates remain.

- [ ] Replace path-keyed DTCG tokens with one UUID-keyed internal record contract.
  - Evidence: token UUIDs currently live in `$extensions.facadeur.uuid` while lookup, edits,
    references, and rendering still depend on DTCG paths. Color, spacing, radius, shadow, and
    typography also have different fixture definitions; spacing and typography IDs are assigned
    by a path map. Fonts and breakpoints use separate mutable string IDs. Earlier completed work
    added identity groundwork and settings UI consistency, but did not unify this data model.
  - Target contract: keep collections grouped by token family and key each family by UUID. Every
    token record carries `uuid`, display `label`, organizational `group`, `valueType`, and `value`;
    optional `extensions` hold explicitly namespaced metadata. Values may be literals, structured
    values (such as shadow and typography), or `{token:uuid}` references. Font families are the
    `font` family in the same contract, with source, weights, and fallbacks in their value. Do not
    persist a CSS selector; generate it from family/group/label. Label/group edits may change the
    generated CSS variable, but identity and UUID references remain stable; collisions must fail
    validation. Breakpoints remain their own resource contract, with UUID identity and override
    maps keyed by UUID.
  - Scope: one sequenced migration spanning Domain/Core, persisted catalog reads, token resolution
    and CSS output, Editor settings/commands, Example fixtures, and all token/font/breakpoint
    references found by repository-wide search. Example fixture UUIDs are static. Newly authored
    editor records receive UUIDs at creation. Do not include unrelated settings or Form changes.
  - Migration decisions: the canonical stored/runtime model is UUID-keyed; DTCG is accepted only
    by a one-time import/migration adapter for existing catalogs and is not used by runtime
    consumers or emitted as the canonical format. Preserve existing UUIDs. For legacy records
    without UUIDs, derive a deterministic UUID from family and old path/ID during migration, then
    persist the canonical record. Rewrite path references and breakpoint override keys to UUIDs
    in that same migration. Keep current value validation, undo ordering, and sparse responsive
    behavior. Generated CSS selectors retain existing names where the old family/group/label can
    express them; label/group renames intentionally change the generated name. Reject collisions.
    `tokenInterface.sets` addresses global token overrides by UUID; exposed component-token
    overrides continue to use their public component paths.
  - Implementation phases: (1) finalize shared Domain contracts and canonical validation;
    (2) add the one-way persisted-data migration and UUID reference rewrite; (3) convert Core
    commands, resolvers, CSS generation, and breakpoint handling; (4) convert Editor CRUD,
    settings, and reference option construction; (5) convert static Example records and remove
    obsolete path-keyed runtime helpers. Each phase stays within this item and preserves existing
    value semantics; if repository evidence uncovers an ambiguous business rule, pause and report
    the exact callsite and decision instead of changing it implicitly.
  - Decisions confirmed for this migration: keep existing persisted data readable through a
    one-time migration, assign deterministic UUIDs only to legacy records that lack identity,
    represent font families in the shared token envelope, use UUID token references, key
    responsive overrides by breakpoint UUID, and reject generated-selector collisions. Preserve
    the existing runtime semantics; do not use this model change to redesign value behavior.
  - Fixture source: catalog integration tests consume `@facadeur/examples` through its public
    `createExampleCatalog()` API so changes to canonical example data are validated by Core.
    Keep only intentionally minimal invalid/legacy inputs inline; legacy style tests derive their
    token and breakpoint IDs from that same example catalog instead of copying project fixtures.
  - Validation: contract-level typechecks; round-trip fixtures for every value type; migration
    checks preserving UUIDs, labels, groups, token/font references, breakpoint overrides, undo,
    and CSS output; focused Editor/Storybook review; import-cycle review; Prettier,
    `git diff --check`, and refactor detector rerun. Do not claim completion based only on the
    settings table displaying UUIDs.

- [x] Fix: clear the visible value in editor state when transforming without persisting an invalid empty token.
  - Evidence: switching a validated color token to Text or another control should start empty, but
    writing `''` into the token tree fails color validation.
  - Action: have the transformable form report mode changes; let the token editor keep an empty
    display draft and clear it when a replacement value is entered or selected.
  - Scope: current task; keep mode-selection UI in Form and token-value draft policy in Editor.
  - Contracts: choosing a mode clears the shown value; persisted token values remain schema-valid.
  - Validation: Prettier, diff check, Form package typecheck, and detector rerun pass. Editor typecheck reports existing workspace errors outside the changed token files.

- [x] Fix: render transform menu outside clipping settings tables.
  - Evidence: `TransformableField` positions its menu inside the control with `position: absolute`,
    while settings tables scroll with overflow and clip descendants.
  - Action: position the menu relative to the viewport using the trigger bounds, so scrollable
    tables cannot clip it and the Form package does not need a React DOM portal dependency.
  - Scope: current task; preserve the shared field API and menu behavior.
  - Contracts: preserve keyboard Escape behavior, nested options, and automatic close on choice.
  - Validation: Prettier, `git diff --check`, the Form package typecheck, and detector rerun pass.

- [x] Refactor: use the editor's transformable field in color token rows.
  - Evidence: the color token settings row still uses the legacy `ColorControl` wrapper around
    `TokenValueControl`, while the editor already provides `TransformableField` for text, color,
    and selectable token values.
  - Action: build color-token picker options from the current token data and pass them to the form
    control; keep token labels, values, and commits owned by the editor.
  - Scope: current task; migrate the Colors settings value cell only.
  - Contracts: preserve raw color values, stable token references, preview resolution, token
    labels, and breakpoint-aware commits.
  - Validation: Prettier, `git diff --check`, and detector rerun pass. The editor typecheck has
    no diagnostics in the changed files but exits with existing workspace errors elsewhere.

- [x] Refactor: move transformable settings option generation into settings config.
  - Evidence: `colorTransformOptions` builds editor-specific field configuration inside the token
    row renderer, mixing settings setup with row content.
  - Action: move the option builder to `ui/settings/config` and have token rows consume its config.
  - Scope: current task; preserve the current color-token menu behavior.
  - Contracts: preserve dynamic labels, descriptions, grouping, token references, and option order.
  - Validation: Prettier, `git diff --check`, and detector rerun pass. The editor typecheck has
    no diagnostics in the changed files but exits with existing workspace errors elsewhere.

- [x] Refactor: route all table rows and cells through shared primitives.
  - Evidence: `Table.tsx` repeats `<tr>`, `<th>`, and `<td>` structures across headers, groups,
    data rows, and disclosures, leaving multiple places for spacing and classes to drift.
  - Action: introduce small `TableRow` and `TableCell` renderers and use them for each table
    section. Centralize base cell styles while retaining semantic header and group modifiers.
  - Scope: current task; presentation consistency only.
  - Contracts: preserve scopes, column widths, row data attributes, disclosures, and detail spans.
  - Validation: Prettier, `git diff --check`, and detector rerun pass; the editor typecheck has no
    diagnostics in the changed files but exits with existing workspace errors elsewhere.

- [x] Refactor: make the table own consistent row, disclosure, detail, and group markup.
  - Evidence: `Table` currently accepts raw React row markup, so Fonts and Tokens independently
    render summary and detail rows despite sharing the outer table frame.
  - Action: use typed rows with cells and optional disclosure details; reuse the row renderer for
    flat rows and groups. Migrate Fonts, Tokens, and the Storybook examples without moving their
    domain-specific values or controls into `Table`.
  - Scope: current task; presentation-only normalization.
  - Contracts: preserve column order, row labels, disclosure state, token operations, font edits,
    and existing search behavior.
  - Validation: Prettier, `git diff --check`, and refactoring detector pass. The editor typecheck
    reports no diagnostics in the changed files but exits with existing errors elsewhere in the
    workspace. Storybook visual verification is blocked because its server is disconnected.

- [x] Build a shared table frame for resource and token settings.
  - Evidence: Fonts and token settings both use searchable tables with counts, actions, columns,
    and optional expanded detail rows, but currently duplicate their toolbar/table frame.
  - Action: put the search toolbar, result count, configurable columns, empty state, and table
    container in `apps/editor/src/ui/settings/Table.tsx`. Support flat rows and collapsible groups;
    keep domain filtering, item summaries, detail editors, and mutations in consuming views.
    Token-specific search and sorting helpers live under `ui/design/tokens`; the generic table
    presentation remains under `ui/settings`.
  - Scope: current task; migrate Fonts and token settings to the shell while preserving their
    existing row content and interactions.
  - Contracts: retain each view's search semantics, column order, group/row expansion, add/remove
    behavior, viewport overrides, and existing form field ownership. Table groups own only shared
    disclosure markup; each view supplies group labels, state, and rows. Table border, radius,
    background, cell spacing, and header styling are shared across settings tables.
  - Validation: Prettier and `git diff --check` pass; editor typecheck reports no diagnostics in
    changed settings files but remains blocked by existing workspace/dependency type errors.
    Storybook visual review remains unavailable because the current server is disconnected and
    its restart fails during SWC path canonicalization on Windows. Refactor detector reports no
    size candidates on changed paths.

### Reuse packages/form fields in token settings

- [x] Refactor: use existing public form fields for token search, labels, and value editing, and
      align the token-specific Shadow and Typography controls.
  - Evidence: token settings mixed package fields with editor-local inputs; compound controls also
    needed consistent labels and sizing.
  - Action: keep token tables, token-aware choices, previews, and compound domain behavior in the
    editor. Reuse `TextField`, `SearchField`, `AutocompleteSelectField`, `TextArea`, and
    `BooleanField` from `packages/form` where their existing contracts fit. Change other Settings
    views individually after reviewing their behavior; do not replace raw elements app-wide.
  - Scope: current task, limited to token settings.
  - Contracts: preserve token IDs, raw values, token references, viewport overrides, editing,
    selection/focus, and existing editor interactions. Token resolution and option construction
    stay editor-owned.
  - Validation: browser review covered Color, Shadow, and Typography token settings, including
    expanded compound editors. Editor-wide typechecking has pre-existing workspace dependency/type
    errors; no claim is made that all editor inputs use `packages/form`.

### Form field validation

- [ ] Define an optional validation pattern for form items and field wrappers when a concrete
      consumer needs it.
  - Evidence: reusable controls need a way to present validation feedback, while validation rules
    belong to the consuming editor or form configuration.
  - Action: keep validation out of the serialized/form field schema. Later, allow a form item or
    wrapper to provide an optional validator and let the form layer present hints and errors.
  - Scope: deferred; no new validation behavior in this task.
  - Contracts: validator functions remain consumer-provided; do not persist functions or
    validation state in form schema. Individual control props such as `TextAreaProps.invalid` are
    presentation state, not schema fields.
  - Validation: when implemented, verify optional validation, hint/error rendering, and accessible
    invalid state without changing the schema contract.

### Catalog instance field exposure

- [x] Make the effective field contract for a catalog definition include fields exposed by its
      nested catalog instances, and show those inherited fields with their source in the schema
      editor. Keep locally authored schema fields editable and inherited source fields read-only.
- [x] Support three exposure modes: an atom-level default and per-instance overrides for automatic
      flat exposure, grouped exposure under a configurable object whose initial name is the instance
      name, and manual field mappings to parent aliases. Preserve the automatic-flat default.
- [x] Use the same effective contract for Preview Data suggestions, validation, instance values,
      and resolved ElementBuildConfig output. Target-asset preview defaults seed suggestions;
      parent and instance values override those defaults for the selected instance.
- [x] Reuse the existing public-field and scope-resolution rules for nesting and name collisions;
      do not add a second schema evaluator in the editor. Preserve existing persisted definitions
      and make new exposure metadata additive.

Evidence: the legacy document path already has `publicFieldsFor`, `automaticFieldGroupsFor`,
explicit `fieldBindings`, and per-instance forwarding controls. The current Catalog inspector
builds fields only from the open `NodeDefinition` schema, while child references are
`NodeModel.config.definitionRef`; consequently the Image schema and defaults do not enter Card's
effective contract or Preview Data. Action: adapt the established resolver semantics to catalog
definitions and instance edges, with provenance for grouped and inherited fields. Scope: accepted
design. Contracts: keep local and inherited schema ownership distinct,
preserve existing preview/instance precedence, validation, persistence, undo, and generated output.
Validation: nested flat/group/manual contracts, collisions and cycles, Preview Data precedence,
round trips/Undo, editor and Core typechecks, codegen, and focused browser interaction.

Implementation decisions: an atom defines the default exposure mode and field map; each
occurrence may override them. Grouped exposure stores a configurable group name on the occurrence,
initially copied from the instance name. Manual mode maps source field paths to parent field aliases;
the occurrence's existing data and binding mechanisms supply values. Keep the resolver in Core's
catalog domain and have schema, inspector, preview, and validation consumers use that contract.

Binding follow-up: schema properties receive persistent `x-facadeur-prop-id` identifiers. Component
field bindings use `{props:uuid}` internally while the inspector displays the current field path as
`props.src`; catalog-wide Design Props keep their separate `{prop:uuid}` namespace. Preview values
remain defaults, while element attributes resolve the referenced component field id at render time.

Progress (2026-10-09): Core now derives recursive contracts with source provenance, inherited
preview defaults, flat/group/manual mapping, per-atom defaults, per-instance overrides, and cycle
rejection. The schema view lists inherited fields read-only; the inspector edits atom defaults and
instance overrides, including the editable instance group name. Preview resolution and validation
consume the derived contract. Card and Teaser fixtures now map atom fields onto their semantic
parent fields. Runtime smoke checks validate the example catalog and manual binding path. The
focused Vitest command is included but cannot collect under the restricted runner because Vite gets
`EPERM` resolving a pnpm-linked file; the direct TypeScript checks report existing unrelated
workspace errors and no diagnostics in the changed Core modules. Controller review: the 453-line
project controller remains the single catalog mutation coordinator; the new cases route inspector
changes to the existing catalog operations without creating another mutation owner.

Progress (2026-10-09): schema properties now receive stable IDs during catalog normalization and
retain them when schemas are edited. Attribute binding options include component fields, displaying
`props.<field>` while storing `{props:uuid}`. The Image atom now binds `src` and `alt` by field ID;
preview resolution reads those IDs against current field values, including parent exposure values.

### Unify authored elements as Layers

- [ ] Evidence: the active flat document model distinguishes `frame`, `text`, and `image`, and
      child insertion, selection, rendering, inspector controls, serialization, validation, and
      code generation branch on those tags. The catalog node model already stores arbitrary
      `dom.tagName` but the layer tree infers frame/text/image labels from tag names.
- Boundary: represent authored DOM elements uniformly as `layer`, retaining `repeater` and
  `switch` as structural types and `instance` as catalog placement. Keep text/image behaviors
  as element properties/data rather than layer types. Show `root` for the unrenamable root;
  selecting it edits the definition name. Catalog insertions remain managed by the catalog.
- Scope: prerequisite for the requested editor-wide layer model.
- Contracts: migrate legacy frame/text/image documents on read without losing children, text,
  image attributes, names, tags, styles, bindings, or variants; preserve atom root semantics,
  catalog references, repeater/switch behavior, output DOM, Undo, and code generation.
- Validation: migration/round-trip coverage, core/editor/codegen checks, renderer preview, and
  refactor detector on changed paths.
- Progress (2026-10-09): the editor now presents authored DOM nodes as `LAYER`, labels the root
  `root`, offers one generic Layer insertion, and lets non-root nodes have a catalog-persisted
  name independent of tag. Selecting a catalog root edits the asset name; legacy document roots
  edit document metadata. Existing node names stored in legacy DOM data still display. The
  persisted flat document union and catalog Repeater/Switch operations are not yet unified;
  finish those before checking off this migration.

### Right sidebar: inspector boundary and tabbed editing

- [ ] Evidence: `PropertiesPanel` and `CatalogNodeInspector` read Core snapshots and call
      `core.node.preview` directly. Core builds an `InspectorFormModel` with presentation sections,
      while the sidebar renders all sections as one legacy editor form; preview defaults and node
      properties are mixed into the same long panel. The shared `@facadeur/form` package does not
      yet provide the editor's class-list, record, and design-prop binding controls.
- Boundary: add an editor-owned inspector facade on `AppService` for model reads, field updates,
  and typed inspector-change events. Keep Core responsible for catalog/schema invariants and
  mutations. Build the catalog inspector vertically as a compact element header/tag control,
  then Style, Properties, and conditional Preview Data tabs. Reuse the current field controls
  during this UI pass; migrate their class-list/record/binding behavior into `@facadeur/form`
  only when its public field contract can preserve those semantics.
- Scope: prerequisite for the requested right-sidebar redesign and Storybook interaction logging.
- Contracts: preserve tag, class-list, CSS token binding, node-data binding, schema-backed field,
  and preview-default persistence semantics. Hide asset renaming from the inspector. Show
  Preview Data only for a root/instance with an applicable data schema. Keep legacy nested
  document selection behavior explicit and avoid claiming it is wired when it is not.
- Validation: right-sidebar Storybook for root and nested node selection; Actions tab logs typed
  inspector changes; editor/app-service typecheck and focused inspector regressions; scoped
  candidate scan and diff review.
- Progress (2026-10-09): `AppService.inspector` now owns catalog inspector reads, updates, and
  typed field-change events. The catalog inspector is compact and tabbed; style and node-data
  controls use the current editor form, while HTML attributes use a binding-aware key/value
  record. Preview Data is limited to schema-backed roots and definition instances. Browser
  rendering in the Editor Storybook is clean. Remaining: migrate class-list/record/binding
  controls into `@facadeur/form`, add dedicated typography controls, and implement the legacy
  nested-document inspector before marking this work complete. Workspace typechecks remain
  blocked by the pinned pnpm network lookup; direct `tsc` reports existing unrelated workspace
  and dependency-link errors, with no diagnostics in the new inspector modules.

### Shared typed example catalog for the editor and Storybook

- [x] Evidence: the `main` branch examples were removed during the node-model migration; API
      defaults now seed only an Image atom, while Storybook needs realistic assets and layer trees.
      Duplicating mock shapes across Stories would drift from `ProjectCatalog` and `NodeDefinition`.
- Boundary: move the Storybook catalog fixture into a small `@facadeur/examples` package that
  depends only on the domain contract. API project initialization and editor Storybook import
  the same typed catalog; keep editor-session construction and selectable layer helpers local
  to Storybook. Use the Core validator when creating the Storybook session.
- Scope: prerequisite for the requested default project data and right-sidebar asset/layer stories.
- Contracts: keep `ProjectCatalog`, `NodeDefinition`, UUIDs, schema refs, definition refs and node
  trees as the sole shape; preserve Image seed IDs and API exports. Include Card, Button, Teaser,
  Form and a page example from `main`; no legacy `DocumentFile` mock contract or duplicate seed.
- Validation: Core `validateProjectCatalog`, Storybook runtime session with selected Card/layer,
  API starter-catalog checks, Storybook build and the refactor-candidate detector.

Result: `@facadeur/examples` now owns one typed catalog used by API project seeding and Storybook.
It includes Button, Image, Card, Teaser, Sign-in form and a specimen page. The right-sidebar
story selects an asset and one of its layers against a real editor session. Core catalog
validation, API seed runtime checks, the Storybook build and the scoped refactor-candidate scan
pass. API package typecheck could not be rerun because Corepack could not resolve
`registry.npmjs.org` to fetch the pinned pnpm version.

### Organize examples as complete node definition models

- [x] Evidence: `packages/examples/src/catalog.ts` reconstructed definitions with helper functions
      and only a small subset of the examples that exist on `main`; each example's schema, DOM, style,
      and config are obscured in one large file. API and Storybook need full examples that compile
      against the current NodeDefinitionModel contract.
- Boundary: make `packages/examples/src/<example>/` the owner for each migrated example, with
  `schema.ts`, `dom.ts`, `style.ts`, `config.ts`, and `index.ts`. Compose those pieces into a
  complete `NodeDefinitionModel` and export the catalog through the package's public index.
- Scope: prerequisite for a useful Storybook/default project catalog, with data migrated from
  `main` into the current API model.
- Contracts: use current `NodeDefinitionModel` / `ProjectCatalog` shapes and validation; keep
  stable IDs for existing catalog consumers and keep API seeding and Storybook on the same source.
- Validation: current Core catalog validation, examples typecheck, Storybook build/runtime check,
  API package typecheck where tooling is available, refactor detector and diff review.
- Review: if catalog assembly or a migrated example triggers detector review, split by actual
  domain boundaries; retain a single large DOM module when it represents one complete example.
- Split catalog design context into token, font, breakpoint, and schema modules because those
  independently maintained records made the combined file exceed the detector's review size.

Result: all 34 atom/component/page examples from `main` now live in per-example folders with
`schema.ts`, `dom.ts`, `style.ts`, `config.ts`, and `index.ts`. Each definition satisfies the
current `NodeDefinitionModel` alias from the domain contract; the package catalog composes those
records and carries forward the project template's tokens, fonts, and breakpoints in separate
catalog modules. Legacy variants become enum fields and preview defaults; schema defaults, layout,
bindings, and base styles map into the
current node tree. The old format's per-state/per-variant style overrides and artboard settings
have no corresponding `NodeDefinitionModel` fields and are not represented. Core catalog
validation, examples typecheck, and Storybook production build pass. API typecheck
reaches the code but reports pre-existing errors in Core/API mutable catalog handling and legacy
tests; none point into `@facadeur/examples`. The detector's 542-line
`form-controls-section/dom.ts` is retained as one cohesive example tree; it has no separate logic
or unrelated responsibility.

### Centralize catalog selection controls in Storybook

- [x] Evidence: the right-sidebar story owned hand-written Asset and Layer selects, even though the
      options and valid layer relationships come from the shared typed catalog.
- Boundary: add an app-local `.storybook/controls/` library that owns catalog-derived selection
  controls; stories provide the current selection and handle editor rendering.
- Scope: prerequisite for editing and comparing inspector states against the shared examples.
- Contracts: an asset change selects that definition's root; layer options belong to the selected
  asset; use stable catalog UUIDs and keep Storybook support out of the editor runtime package.
- Validation: Storybook build and a runtime check that selection resolves to a catalog definition
  and one of its actual layers; rerun the scoped detector.

Result: `.storybook/controls/` now provides one reusable Asset/Layer selector, grouped by atom,
component, and page. Its resolver always keeps the selected layer inside the selected definition;
changing assets resets selection to that definition's root. The right-sidebar story renders this
library, while the editor and example package remain free of Storybook-specific controls. Storybook
production build, catalog selection runtime checks, and API seed validation pass. The detector
reports only the retained cohesive `form-controls-section/dom.ts` data module.

### Node model refactor (dom / style / schema / data / config)

- [ ] Major reshape: replace `nestedNodeSchema` special cases with a uniform node (`dom`, `style`, `schema`, `data`, `config`). See [node-model-refactor.md](./node-model-refactor.md). **Phase 1:** legacy examples removed, v2 TypeBox in `packages/core/src/schema/node-model/`, starter project = design + empty section only, vitest narrowed. **Next:** API catalog seed, restore full test include, sidebar on v2. References: [example-framework](https://github.com/mmilad/example-framework), [style-controller](https://github.com/mmilad/style-controller).

### `@facadeur/domain` + `CoreController`

- [x] **`packages/domain`** — shared types/interfaces only (no runtime logic).
- [x] **`packages/core/src/controller/{core,catalog,preview,node,element,config,schema,node-style}/`** + **`CoreController`**; preview → **`ElementBuildConfig`**; React `DynamicElement` renders the config.
- [x] Wire editor **`AppService`** → **`CoreController`**; **`CatalogPort`** in API adapter; drop duplicate editor catalog helpers.
- [ ] Expand core commands/selection; editor keeps UI-only concerns (select chrome, insert/delete UX).

### Deprecation inventory (remaining compatibility contracts)

The earlier inventory is partly resolved. `ProjectController` and the Editor's expose-authoring UI
are removed; the active Editor uses `CoreController` and Catalog sessions. The legacy flat document
contracts remain in production use by API, Server, and Store Yjs, so deleting them would require a
separate persistence and package migration. They are deprecated for new Catalog work, but are not
unused shims.

| Area             | Remaining deprecated surface                                                                                                | Current consumers / replacement                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `@facadeur/core` | `DocumentFile`, `documentFileSchema`, `validateDocumentFile`, `validateCatalog`, `validateTree`, `compileDocumentValidator` | API and Server project-file persistence; Store Yjs. Migrate those owners to `ProjectCatalog` and node-model validation before removal.         |
| `@facadeur/core` | Parent-authored expose aliases and legacy `setExpose` command                                                               | Existing persisted documents and Server validation. Child-owned inherited contracts are the future model; retain read compatibility meanwhile. |
| Editor           | Expose-authoring UI                                                                                                         | Removed; Core retains serialization and validation for existing alias data.                                                                    |

The deprecated `@facadeur/tokens` facade, unused viewport panel, schema screens, Codegen v1 engine,
legacy Editor renderer integrations, and one-off import fixer have been removed. Current Catalog
editing uses Core's Catalog controller and `@facadeur/examples` fixtures. No API/API-client or
Store Yjs migration is included in this cleanup; their remaining flat-document imports are the
concrete boundary for any future compatibility removal.

### Core package layout (2026-03)

- **Product:** `packages/core/src/controller/project/` — `CoreController`, nested `catalog/`, `node/*`.
- **Legacy flat docs:** `packages/core/src/legacy/flat/` — retained symbols remain deprecated Core root exports for active legacy consumers.
- **Removed top-level** `controller/catalog`, `controller/core`, duplicate `controller/variants` / `src/store` (use legacy paths).

### Catalog definition enumeration

- [x] Refactor: centralize catalog definition enumeration in Core.
  - Evidence: the stable `atoms → components → pages` traversal is repeated in Core's
    definition-reference checks and effective-field validation, and again in Editor's asset
    summaries and style suggestions. The deprecated Editor `v2-catalog.ts` repeats equivalent
    lookup/list/node traversal code and has no production or test consumers.
  - Action: add a Core-owned `listCatalogDefinitions` operation and reuse it in Core and Editor
    through `@facadeur/core`; remove the unused deprecated copy. Keep display-name resolution,
    asset sorting, and style suggestion collection in Editor.
  - Scope: current architecture cleanup; reduces category-omission drift without changing features.
  - Contracts: preserve map traversal order, asset sorting and kinds, validation errors, schema and
    definition reference checks, and public Core entry-point conventions; no catalog shape change.
  - Validation: catalog asset-list and Core catalog tests, Core/Editor typechecks, full test suite,
    detector rerun, and `git diff --check`.
  - Result: Core owns one ordered `listCatalogDefinitions` operation, now used by Core validation,
    reference checks, Editor asset summaries, and Editor style suggestions. Removed the unreferenced
    deprecated v2 copy. Core typecheck and all 85 tests pass; Editor typecheck still reports only
    the existing `CatalogPreviewDataStage` field-value mismatch and missing `jsonjoy-builder`
    declarations. Detector and diff checks pass.

### Deprecate explicit public-contract aliases

- [x] Refactor: remove unconsumed compatibility shims with no active product callers.
  - Evidence: Core's `nodeToElementBuildConfig` and `mergePreviewData`, Renderer DOM's
    `renderV2DefinitionRoot`, Codegen's deprecated root `generate` facade and its legacy option
    aliases, Editor's `insertLayerTool`, and the Editor color-helper forwarder have no active
    production consumers. The color-helper test is only checking the forwarding path. Editor tests
    use `App` solely as an alias for `EditorShell`.
  - Action: remove these deprecated aliases and forwarding modules/exports; point the color helper
    test at `@facadeur/form` and the paused shell tests at `EditorShell`. Keep the canonical
    `resolveDefinitionToElementBuildConfig` resolver.
  - Scope: current deprecated-shim cleanup.
  - Contracts: preserve canonical functions and rendering/editor behavior; remove only aliases
    explicitly marked deprecated or test-only. Do not modify API/API-client or Store Yjs.
  - Validation: focused package typechecks and tests, full test suite, detector rerun, and diff
    check. Existing unrelated Editor typecheck errors remain tracked separately.
  - Result: removed the listed unconsumed aliases/forwarders. The user's full `pnpm test` run
    passes 22 suites and 88 tests; the form color suite passes 3/3. Core, Codegen, and the then-live
    Renderer DOM typechecks passed. Editor's pre-existing typecheck diagnostics remain documented;
    diff checks pass.

- [x] Refactor: remove Core's deprecated ElementBuildConfig forwarding API.
  - Evidence: `definitionToElementBuildConfig` is explicitly deprecated and only called by the
    Core ElementController plus two tests. `ElementController.buildDefinition` has no callers.
    `resolveDefinitionToElementBuildConfig` is the canonical implementation and is already used
    by PreviewController and catalog tests.
  - Action: route Core and Renderer DOM callers/tests directly through the canonical resolver,
    remove the unused ElementController method and deprecated wrapper module/export, and delete
    the unused Editor `src/styles.css` compatibility entrypoint. Keep `renderDefinitionRoot` and
    the Renderer DOM package intact because its current compatibility tests cover runtime behavior.
  - Scope: current cleanup goal; remove deprecated/test-only forwarding surfaces only.
  - Contracts: preserve build config output and the public resolver; no document format, runtime
    renderer, API/API-client, or Store Yjs changes.
  - Validation: Core and Renderer DOM typechecks/tests, full suite, source import audit, detector,
    and `git diff --check`.
  - Result: removed the deprecated `definitionToElementBuildConfig` wrapper and unused
    `ElementController.buildDefinition`; Core exposed and uses the canonical resolver. The
    `apps/editor/src/styles.css` entrypoint was also removed after confirming it had no imports.
    Focused Core/Renderer DOM coverage passed 15/15 before package retirement; Core typecheck passed,
    and the full suite passes 22 files/88 tests. Editor typecheck has only the existing
    nullable FieldValue mismatch and missing `jsonjoy-builder` declarations. The source import
    audit and diff check pass.

- [x] Refactor: remove the unreferenced deprecated Editor LayersPanel copy.
  - Evidence: `apps/editor/src/deprecated/LayersPanel.tsx` has no imports; the active catalog layer
    panel is wired by `EditorShell`, and a current `ui/sidebar/layers/LayersPanel.tsx` exists for
    focused editor behavior coverage.
  - Action: delete only the unreferenced deprecated component. Keep the active catalog panel,
    current layer controls, and legacy schema migration adapter.
  - Scope: current deprecated-code cleanup.
  - Contracts: no layer editing behavior or persisted document shape changes; no API/API-client or
    Store Yjs changes.
  - Validation: source import audit, Editor/Core typecheck, full suite, detector, and diff check.
  - Result: deleted the no-caller deprecated copy; the active catalog panel and tested layer panel
    remain. Full suite passes 22 files/88 tests; Editor's existing typecheck diagnostics are
    unchanged. Import audit and diff check pass.

- [x] Refactor: retire the private deprecated DOM renderer package.
  - Evidence: `packages/renderer-dom` is private/deprecated, and no product source imports it.
    Editor canvas consumes Core's `ElementBuildConfig` through React `DynamicElement`; the package
    is used only by its own compatibility tests and four paused Editor tests built around legacy
    document fixtures.
  - Action: remove the package, its Vitest alias/allowlist entry, Editor's test-only dependency,
    and the paused tests that exclusively exercise the old renderer. Keep Core's preview
    resolution and `ElementBuildConfig` domain contract; retain active React canvas tests.
  - Scope: current deprecated-code cleanup.
  - Contracts: preserve the active React canvas, responsive preview, style injection and Core
    preview outputs. No API/API-client or Store Yjs changes.
  - Validation: root tests, Core/Editor typechecks, import audit, lockfile consistency, detector,
    and `git diff --check`.
  - Result: removed package source/tests, its four paused Editor test consumers, Editor's dev
    dependency and Vitest wiring. Updated current ownership docs to describe React `DynamicElement`.
    The root suite passes 21 suites/86 tests, Core typecheck passes, and the Editor typecheck still
    reports only its two known diagnostics (`CatalogPreviewDataStage` nullable FieldValue and
    missing `jsonjoy-builder` declarations). No production imports remain; lockfile/install and
    final detector/diff checks pass.

- [x] Refactor: remove the superseded deprecated PreviewDataStage.
  - Evidence: `PreviewDataStage` is explicitly deprecated, has no production imports, and is
    replaced in the active Editor shell by `CatalogPreviewDataStage`. Its only UI test is paused
    outside the root Vitest allowlist and targets the legacy `DocumentFile` screen.
  - Action: delete the old component and its paused UI test. Keep shared preview-data parsing,
    migration, and the active catalog preview stage.
  - Scope: current deprecated UI cleanup.
  - Contracts: preserve active catalog preview editing, sparse values, variants, and legacy data
    migration. No persisted data change.
  - Validation: production/test import audit, root suite, Editor typecheck, detector, and diff check.
  - Result: removed the unreferenced legacy component and its paused UI test; preview-data parsing
    and migration helpers remain shared by current Editor flows. Root suite still passes 21
    suites/86 tests; Editor typecheck shows only its two pre-existing diagnostics. Import audit,
    detector, and diff check pass.

- [x] Mark the legacy `expose` mechanism as deprecated without removing its compatibility path.
      Evidence: Input and FormTextInput still store child field/event aliases; Core validation,
      serialization and React codegen still resolve them. Child fields already forward automatically
      through instance contracts, while inherited child events need a complete replacement.
      Add schema/type/command deprecation metadata and a visible editor label. Preserve existing
      documents, alias resolution, emitted props and callbacks. Validate existing contract/editor
      behavior and Core types; retain this cohesive legacy compatibility mechanism until migration.
      Result: editor label, schema metadata, public types and the legacy command are deprecated;
      38 focused contract/editor/codegen tests and Core typecheck pass, with scoped lint/format clean.
- [ ] Next refactor: replace parent-authored expose aliases with child-owned public fields/events
      inherited through stable instance references. A LoginForm's email input, password input and
      button contribute their contracts and callbacks; distinguish repeated child fields/events
      rather than overwriting `value` or `commit` by name. Respect Repeater/Switch scope boundaries
      and existing opt-out controls. Migrate Input/FormTextInput examples and stored aliases before
      removing expose schemas, setExpose, the editor control, resolver and codegen forwarding.
      Preserve event envelopes/native events, data types, editable fields, binding paths, Undo and
      old documents. Validate two same-type inputs, nested wrappers, events, structural scopes and
      generated callback propagation before deletion. Do not claim event inheritance is already
      implemented merely because field forwarding exists.

### New project atom catalog

- [x] Seed new managed projects with the repository's built-in atoms (Button, Input and Link)
      alongside the editable starter section. Evidence: initializeProjectFiles writes only design
      and new-section, so every new project's Atoms group is empty. Extract the starter catalog into
      a private project module before extending initialization; file persistence retains path checks
      and non-overwriting writes. Preserve atom contracts/styles/events and independent project files.
      Validate populated atom catalogs, repeated initialization and isolation with existing edits;
      repair local projects still containing only design/starter files without replacing their data.

Result: private starter-catalog owns the canonical atom templates and section/design defaults;
initialization writes independent copies and leaves existing files intact. Storage regressions
cover all three atoms, edited atom/section preservation and project isolation. Eleven focused
API/storage/controller/route tests, API types and scoped lint/format pass; no affected candidates.
Repair the one local starter-only managed project by adding missing atom files; existing design
and section files are retained.

### Management/API pre-commit review

- [x] Review the staged organisation/project implementation and correct verified defects before
      committing. Keep API controllers/data, HTTP adapters/SDK and editor state under their current
      owners. Evidence: a rejected runtime startup promise is retained globally; HTTP transport maps
      unexpected persistence failures to 400 and exposes internal messages; the previous project
      stays interactive while replacement loading can destroy its newly dirty session. Fix runtime
      retry/connection cleanup, distinguish malformed inputs and validation from server failures,
      and pause editing during project replacement. Preserve wire successes, role restrictions,
      stored data, migrations and unsaved-leave behavior. Add focused regressions, run workspace
      tests/typecheck and scoped lint/build, then commit only the reviewed staged scope. Inspect the
      maintained-source detector after committing; retain cohesive modules and record justified
      independent candidates in the existing refactoring backlog.

Result: failed database initialization closes its connection and clears the cached startup promise
so repair/retry succeeds. HTTP body parsing reports malformed JSON as 400; save validation uses
domain input errors, while unexpected backend errors return a generic 500 and stay in server logs.
Pause the previous editor during replacement loading and resume it if loading fails, retaining its
session. Added runtime, HTTP transport and switching regressions. Validation: 1,104 tests in 196
files pass; workspace types, editor build, scoped lint/format and diff checks pass. Build output
configuration is restored; existing SQLite/CSS notices remain. No API ownership/SQL leakage or
size candidates in the affected management/API domains.

### Legacy identity database compatibility

- [x] Fix organisation creation against an existing management database. Evidence: the local
      `organisation_members.user_id` foreign key still targets the previous auth table `user`,
      while current sessions resolve `mock_users`. `CREATE TABLE IF NOT EXISTS` cannot change
      that constraint. Add a private management migration before serving controller calls;
      preserve legacy accounts, membership IDs/roles, organisations, projects and sessions.
      Reconcile legacy identities by email with existing mock accounts and rebuild only the
      membership table transactionally. Keep SQL in API and routes unchanged. Validate legacy
      fixtures, repeat initialization and organisation creation with a current session, plus
      focused controller/route regressions and source checks.

Result: migrate legacy users into mock identity storage, reconcile existing mock accounts by
normalized email, and transactionally rebuild membership foreign keys while retaining IDs/roles.
Check retained connections too, so development hot reloads run the migration. Refuse a migration
that would omit membership rows. Legacy auth tables remain intact. Ten focused migration,
controller, storage and route tests pass; API types, scoped lint/format and candidate scan pass.
Apply to the local database after a SQLite snapshot backup; foreign-key check reports no violations.

### Controller and transport separation

- [x] Correct the API boundary: application controllers receive authenticated actor/data,
      return typed results and throw domain error codes. SQL and business validation stay in API;
      requests, paths, cookies, origin checks, JSON parsing and HTTP responses stay in Next adapters.
      Move the HTTP SDK to `packages/api-client`, dependent on API contracts, so transport does
      not leak into the controller package. Keep Core document commands and editor UI unchanged.
      Evidence: server/http.ts dispatches URLs; session/access/service accept Request; file errors
      construct Response and domain errors embed HTTP status. Remove that dispatch rather than
      moving it to another domain file. Preserve sessions, database, files, permissions and wire
      payloads. Validate direct controller operations and Next-route/client integration separately,
      plus source types, scoped lint/format, build and scans for transport/SQL ownership.

Result: `apiController` accepts an actor and typed inputs and returns data. Domain errors carry
semantic codes; Next adapters choose HTTP statuses, parse bodies/parameters and own cookies and
origin checks. Remove the pathname dispatcher and move the HTTP SDK into `packages/api-client`.
The editor now consumes that SDK and the routes call the data-only controller. Keep management
commands together as one cohesive domain responsibility; the scanner reports no size candidates.
Direct controller tests cover persistence, membership, invitations, archives and last-owner rules;
route tests cover session cookies, origin and status translation. No SQL remains in app source,
and no HTTP objects or dispatch remain in API source. Source types, scoped lint/format and the
editor build pass. Database/storage locations and endpoint payloads are preserved.
Final regression run: 1,096 tests pass across 192 files. Existing SQLite/CSS build notices remain.

### Isolated API ownership

Historical extraction below; the controller/transport separation above supersedes its
combined client and Request/Response handler boundary.

Consumer follow-through: login, workspace commands and project load/save use the shared typed
client; all active Next routes forward to the package handler. Remove the unused retired examples
HTTP fallback from browser file export (it always returns 410), preserving file handles, pickers
and downloads. Project sessions continue to save only through the authorized project API. Validate
existing save/export and API integration tests and confirm no direct fetch remains in editor code.
Browser verification against isolated existing data confirms API-backed sign-out/sign-in, workspace
loading, project opening and document saving. The save returned 200 and the editor cleared its dirty
state. Retired dev-save test mocks now describe the supported download export instead.

- [x] Extract the new organisation/project backend into `packages/api` before further features.
  - Evidence: editor management/access/session modules contain SQL, transactions and role rules;
    project/files.ts owns server persistence; three clients duplicate transport/error handling.
  - Action: `@facadeur/api` owns typed contracts and a browser-safe client;
    `@facadeur/api/server` owns HTTP handling, identity, authorization, SQLite and JSON storage.
    Next is a thin adapter; editor owns React sessions, navigation, prompts and presentation.
    Extract portable legacy schema reconciliation from browser storage/session migration so the
    package never imports editor internals. Keep browser migration command/Undo wiring in editor.
  - Contracts: preserve endpoints, mock cookie/session behavior, roles, archives, invitations,
    database schema/location, examples claim, recovery files, hashes, atomic saves and codegen.
    Core remains independent of SQLite/HTTP and API depends only on owning package public APIs.
  - Validation: relocated backend/persistence tests, API client/HTTP integration, existing editor
    migration/client/UI regressions, source types, scoped lint/format, build and candidate scan.

Result: `packages/api` owns all new SQL, sessions, access rules, commands and file persistence.
The editor shares one typed transport client and its Next routes only forward Request/Response.
Portable schema reconciliation is extracted; browser recovery/Undo wiring stays in the editor.
Backend tests now live in the owning package, with a client-to-handler integration test that
round-trips a saved document without editor imports. No SQL remains in apps source and the API
package imports neither apps nor Next. Database schema, locations and wire contracts are preserved.
Validation: 1,094 tests pass, source types, scoped lint/format and editor build pass; no affected
size candidates. Existing SQLite/CSS build notices remain. User edits and staging are preserved.

### Organisation and project management

- [x] Add organisation/project management following the
      [scoped plan](organisation-project-plan.md). Shared accounts, membership and roles are
      requested; the user subsequently chose mock authentication for this first implementation.
      Refactor hardcoded default-project loading/saving into an explicit
      selected-project boundary; keep management outside document commands and schemas.
      Preserve source hashes, atomic saves, recovered drafts, current examples and user staging.
      Keep the 488-line session assembly as wiring; do not add discovery or membership ownership.

Implementation scope: an isolated mock identity/session adapter and SQLite management metadata in the
existing Next app. Extract project storage resolution from the file adapter's hardcoded default
directory; pass trusted ProjectStorage and serialize saves per directory. Preserve source hashes,
atomic writes, schema validation and recovered drafts. Authorize generic and legacy project routes
before resolving storage. Organisation/account management owns discovery, roles and invitations;
Core retains one project's document commands. Register examples only through an explicit claim
by the initial server administrator. Validate real sessions, organisation/project isolation,
role/last-owner/invitation checks, source conflicts, switching, scoped UI tests and browser flows.

UI review: the new 569-line ManagementHome combined page loading/command state with organisation
project/member/invitation controls. Extract OrganisationWorkspace and its private form/row controls;
keep the page loader and account/invitation entry together. Preserve command payloads, role-aware
actions and navigation props; validate management UI behavior and editor types after extraction.
Backend review: SQLite schema/connection initialization initially sat in the mock identity adapter.
Move that persistence ownership to management/server/database.ts and let identity/access/command
services consume it, so replacing mocked identity does not replace organisation/project storage.
Preserve route contracts, session lookup and metadata, with role/persistence/route regressions.

Result (2026-10-06): durable SQLite organisations, projects, memberships and expiring invitation
links; recoverable archive/restore; explicitly claimed existing examples; project-aware URLs,
catalogs, recovered drafts and saves; development mock sign-in/sign-out; server-enforced roles
on generic and legacy routes; viewer-only preview/code; and Save/Discard/Keep editing before
leaving an edited project. Source workspace types, scoped ESLint/Prettier, affected-path scanner,
editor production build and all 1,091 tests pass. Browser checks confirm saved text survives
reopening and invitations give viewer-only access. Real production authentication remains deferred.

### Typed event envelopes and event data contracts

- [x] Implement the [event contract plan](event-contract-plan.md): derive public callbacks from
      events, reuse component contract selection for event data, always forward the native
      browser event, preserve explicit instance forwarding and generate native form defaults.
      The plan records ownership, migration, in-scope refactoring boundaries and validation.

Refactoring review: extract only the shared schema selector into editor `ui/controls/data`;
component defaults and command ownership stay on the schema surface. Retain Core's cohesive
598-line data-contract validation traversal: native event mappings need the same root/repeater
scope resolution, and splitting it would duplicate scope rules. Retain ContentPanel's 482-line
property orchestration (seven added lines) and the data-control directory: its controls own the
same contract editing domain. Preserve persisted document compatibility, public forwarding,
Undo, and recovered drafts; validate with contract/control/adapter tests and workspace checks.
Retain the assertion and definition validators (530/483 lines): they own the canonical native
source/type and event declaration checks, while schema resolution and scoped binding checks
already have separate owners. The 12-file validation directory is a single validation domain.
Follow-up: the repeated repeater/switch traversal noted here was consolidated in the completed
"share Core structural-node enumeration" item below. The file remains a cohesive 552-line
structural derivation module; no file split was needed.

Result (2026-10-06): editor events reuse component schema selection and expose typed callback
previews. Core owns legacy normalization and validates required native/context/literal data
mappings. Contract changes with affected bindings are reviewed locally and saved as one
undoable command; Cancel discards the draft. Generated callbacks always receive the original
native Event, its actual type, eventName and typed data; exposed wrappers preserve identity.
Native form defaults generate defaultValue/defaultChecked, and the Next demo shows event data.
Validation: source/generated workspace typechecks, scoped ESLint/Prettier, document schema and
workspace regeneration, Storybook and Next production builds, and browser add-field, Cancel,
mapping review, Save/Undo and editable input checks pass. Full suite: 1079/1080 passed; the
existing repeater inspector test exceeded its 5-second timeout under parallel load and all
three tests in that file pass on isolated rerun. User recovered drafts and staging are preserved.

### Controller test migration and coverage audit

- [x] Run the maintained suite after the controller/Yjs migration; classify failures by preserved behavior versus retired transport semantics. Keep pure Core command tests, move controller ownership/events/history coverage to Core controller/store tests, and cover local JSON/session integration at the editor boundary. Migrate useful archived workflow/save/catalog assertions; remove only obsolete CRDT, WebSocket and shared-server expectations. Preserve current user changes/staging and actual behavior contracts (sparse variants, commands, Undo, source conflicts and async save baselines). Record unrelated refactor candidates rather than extending scope. Validation: full suite, focused checks after repairs, workspace typecheck, scoped lint/format and detector rerun.

Retained adapter repair: schema-use edits expose an order-sensitive JSON comparison in the Yjs read-back guard. Reuse Core's public JSON canonicalizer for that comparison, keeping the guard and adapter ownership intact; extend the existing schema round-trip test to cover reordered object keys. No new helper boundary is justified. Validate the retained adapter/server suites as well as the controller path.

Coverage audit:

| Previous coverage                                                         | Decision and current owner                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor project client                                                     | Restore `project-client.test.ts` for JSON loading, schema-backed previews, cancellation/errors, exact async save baselines, source hashes, retries and design persistence. Read authored state through `session.project`.                                      |
| Store/history and style views                                             | Add Core `controller-store.test.ts` for post-commit reads, scoped style/global-token history, one-step batches, rollback, preserved Redo, replacement and cleanup.                                                                                             |
| Product-card two-editor workflow                                          | Retire shared-server/two-client expectations. Preserve the local save/restart contract in `project-files.test.ts` through the actual JSON persistence functions and controller-backed session. Existing session/variant tests retain sparse override coverage. |
| WebSocket sync/transport and remote catalog                               | Keep obsolete editor suites removed: handshakes, state vectors, reconnects, acknowledgements and remote catalog registration have no current editor contract. Do not replace them with artificial controller equivalents.                                      |
| Session hydration/catalog                                                 | Retire exact Yjs history/unsent-byte expectations; shared schema initialization is covered at JSON ingress, recovered draft flags and file conflicts at persistence, and local document import by existing session tests.                                      |
| Command invariants, renderer lifecycle, selection, UI and Undo scheduling | Retain distinct behavior tests. Pure command tests remain at the command boundary; renderer fixtures use controller-backed stores; editor tests exercise session interaction guards.                                                                           |
| Retained server and Yjs adapter                                           | Retain package tests while those packages remain maintained, independent of the editor runtime. Repair key-order comparison and preserve schema round-trip/Undo validation.                                                                                    |

The audit also corrected three passing token UI tests whose setup commands silently collided with an existing path: use the existing stable token ID and assert successful setup. Fixture kinds now reflect multi-node components, the schema library expects native input ownership, and stale assignments are reconciled before strict session initialization. Regenerated only the drifted Media output (poster prop and binding). The 488-line session assembly remains cohesive wiring; the detector gives no new source split candidates.

Result (2026-10-04): baseline had 13 failures across 7 files. Final full suite passes all 993 tests across 175 files, including 14 new controller/JSON tests. Workspace typecheck, scoped ESLint/Prettier, diff whitespace checks and candidate review pass. Existing React suspended-resource warnings in schema UI tests remain non-failing. User staging is preserved; all task edits remain unstaged.

### Controller-owned editor without Yjs or separate server

- [x] Remove the editor's Yjs and port-3002 runtime dependencies. Evidence: controller and CRDT both own snapshots, requiring refresh bridges; session/catalog/Undo and transport are tied to Yjs. Move the renderer-facing store contract to `core/src/store/types.ts` and provide controller-backed views with Undo snapshots, no second live state. Add minimal typed project change subscriptions after committed mutations. Keep UI/session guards, variant transformations, command validation, JSON formats and explicit saves. Replace WebSocket client with JSON load/save routes inside Next; `pnpm dev` starts only the editor. Leave historical server/adapter files and durable Yjs data intact while removing their editor/runtime coupling. Do not add a speculative event manager. Scope: requested API simplification; full document-model relocation remains separate. Validation: workspace typecheck, scoped lint/format/build, runtime load/edit/Undo diagnostics and candidate scan; skip test suites per user instruction.

Result (2026-10-04): editor dependencies, aliases, transpilation and runtime imports no longer include Yjs/store-yjs. ProjectController commits changes and then publishes typed events; renderer stores read its live state and retain only history snapshots. Session refresh bridges, CRDT hydration and WebSocket/catalog transport are retired. The store contract moved to `core/src/store/`; full document-model relocation is deferred. Next handles JSON GET and explicit snapshot saves on port 3001 with atomic writes and source-hash checks. Save baselines preserve concurrent edits. Captured all 13 unsaved legacy documents, including `new-atom`, as ignored JSON recovery data; the full previous catalog is backed up and original Yjs history remains untouched. Local GET loads 21 documents including design and marks recovered drafts unsaved. Runtime diagnostics verify controller edits, shared renderer state, Undo/Redo, schema-backed sparse variant edits, JSON save/reload, new-document saves and stale-source rejection. Workspace typecheck, scoped ESLint/Prettier and isolated production build pass. No test suites run; renderer fixtures now use controller stores, obsolete sync tests/code are archived as text, and the retained server's existing HTTP tests own their legacy sync fixture. The remaining 488-line session assembly is cohesive state/wiring; no size-only split is justified. Browser interaction was not manually verified. New edits currently stay in memory until explicit Save; collaboration and continuous persistence are deferred.

### Project hydration and diagnostics

- [x] Initialize the session ProjectController before store hydration using the complete authoritative Yjs catalog. Evidence: startup validation lacks schema context and rejects card preview field `eyebrow`. Keep adapter coordination in `session-project.ts`; retain cohesive session wiring. Add focused project failure diagnostics with phase/document/schema metadata, without document values. Route snapshot catalog and save validation reads through the project. Preserve Yjs authority, validation, command/Undo ownership, persisted data and user staging. Validate against the running project's read-only snapshot, workspace typecheck, scoped lint/format and candidate detector; no test suites per user instruction.

Result: initialize the live controller from decoded authoritative updates before creating any stores; seed schema, token and forward-reference context for startup. Stage a complete resolver context for subsequent catalog additions, restoring the previous context on failure. Keep document hydration plus its failure logging in `session/document-hydration.ts`; share project diagnostics between bootstrap and session boundaries in `project/diagnostics.ts`. Snapshot catalog and save validation use controller views; remove unused direct-store readers. Read-only reproduction against the running server now opens `specimen`, resolves `card.fields.eyebrow`, and exposes all 21 project documents. Workspace typecheck and scoped ESLint/Prettier pass; no test suites or persistence changes. Browser interaction remains unverified. The 525-line session assembly remains cohesive wiring; the 12 direct session files all own session lifecycle, state projection, commands or adapter coordination, so no extra directory layer is justified.

> Living document. Active work and open verification items belong here. Completed reports and historical decisions are in [plan-history.md](plan-history.md). The following sections describe current product contracts and architecture; later decisions supersede older log entries.

## Open implementation and verification items

### Shared schemas, JSON utilities, and unused Core modules

- [x] Move reusable JSON primitives to `src/utils.ts`, collect schemas in `src/schema/` without redundant prefixes, and remove verified unreachable internal modules.

Evidence: JSON helpers are used across style/token, validation, and document domains; schemas are shared contracts rather than document-controller behavior. Retain `document/` for flat/nested conversion, tree operations, identifiers, kinds, child-field semantics, and document errors. Preserve public Core exports and schema-derived types. Identify dead modules using reachability from the public entry point plus repository deep-import searches; public exports are not dead merely because this repository has no caller. Validation: Core/workspace typecheck, scoped lint/format, detector, and import reachability; tests deferred per current preference.

Removed the unreachable internal `style/blocks/index.ts` barrel and the unreferenced, non-public `assertId` function and `ComponentTokens` type alias. `src/index.ts` keeps all existing public symbols. Retained the local token-value predicate: unlike recursive `utils.isJsonValue`, it intentionally accepts arrays/objects shallowly, so merging them would change validation semantics.

### Concrete style command result

- [x] Define `DocumentController` once as the style context write result and remove propagated Result generics. Evidence: the generic adds no variation to the actual project contract. Returned document views and method behavior are preserved; the user's DocumentStyle naming is retained. Core typecheck, scoped lint/format and detector pass; no tests run. This supersedes the generic style result described in the preceding boundary refactor.

### Project state and notification boundaries

- [x] Isolate exported command contexts and token reads from live state, isolate subscriber failures, publish document removals and clear removed-store history, and decouple style contexts from concrete document controllers.

Evidence: public resolution contexts expose stored manifests; one throwing subscriber aborts delivery after commit; catalog replacement omits removal events; style context return types import DocumentController. Action: use detached context snapshots, shared guarded notification delivery with per-listener payload copies, explicit removal events, and a generic style write result preserving project return types. Scope: Core; preserve command results and retained document/style views. Validation: Core/workspace typecheck, scoped lint/format, candidate detector; tests remain skipped per the current user preference.

### Use ProjectController in the editor session

- [x] Route session document reads and writes through one live ProjectController backed by existing Yjs stores.

Evidence: the session builds shared command context itself and commands go straight to individual stores; the new project/style API has no application consumer. Store hydration, Undo, remote updates, loading, and catalog additions can change documents outside a core command. Action: keep a private `session-project.ts` adapter that injects store execution into ProjectController, synchronizes authoritative store snapshots, and supplies current context to stores. Add an explicit atomic `replaceDocuments` ingress and readable command context to Core; preserve retained document/style view identity. Route ordinary session commands through the project and typed style facade after existing variant transformation. Keep notices, nested-selection permissions, Undo history, persistence, and transport in the editor. Use project reads for open documents, catalog, shared schemas, and design input. The 521-line session assembly remains cohesive wiring; extract only store/project coordination, not arbitrary initialization fragments. Contracts: preserve transaction origins, command/error order, sparse variant editing, hydration authority, remote/Undo updates, save baselines, and existing session APIs. Validation: workspace typecheck, scoped lint/format, candidate detector, import review; tests skipped per user instruction.

Result (2026-10-04): `session.project` exposes the live Core API. Existing guarded session commands route document styles, component tokens, global tokens, fonts, breakpoints, and shared schemas through their controller methods; other commands use `updateDocument`. Store events synchronize before selection refresh and publication, and load/catalog paths resynchronize retained views. The design surface resolves the current store after reload. Removed duplicate store catalog readers and editor command-context assembly. Workspace typecheck, production editor build, scoped ESLint/Prettier, and diff whitespace review pass; no tests were run. The remaining 526-line assembly is cohesive state/lifecycle wiring, with store/project coordination separated into its own module. The first integration synchronizes complete catalog snapshots on store events; incremental synchronization can be considered if profiling larger projects justifies it. Browser interactions and runtime performance were not manually verified.

### Shared StyleController and discoverable style ownership

- [x] Add a project-owned StyleController with explicit global and document scopes; group token and reference implementation beneath the style domain.

Evidence: `style/controller.ts` is only a dispatcher, while global token mutation and component-token coordination remain in the document dispatcher and sibling `tokens/`. Consumers must navigate several owners for one style editing workflow. Action: introduce `project.styles` with global token/font/breakpoint methods and a stable `document(id)` facade for authored styles, node style properties, variant styles, component tokens, and token interfaces. Route all mutations through the existing project executor. Group DTCG tree algorithms in `style/tokens/global/`, component token contracts/edits in `style/tokens/component/`, and reference collection/adoption/rewriting in `style/references/`. Keep pure command application separate from the live controller, with explicit scope contracts in `style/types.ts`. Preserve old public exports and project/document accessors, persisted formats, sparse overrides, token-reference behavior, command validation/errors/order, injected executor, and transaction ownership. Validation: workspace typecheck, scoped ESLint/Prettier, import-cycle inspection, detector, and diff review; no tests per current user instruction.

Traversal scope: keep DTCG and style traversal separate. Reference rewriting currently omits style rules that collection includes; do not silently change that behavior during this ownership refactor. Track that discrepancy separately before sharing traversal semantics.

Discoverability review: `style/libraries.ts` combines independent font-stack/source checks and breakpoint checks. Separate these cohesive responsibilities into `fonts.ts` and `breakpoints.ts`; preserve their existing public contracts and direct consumers in serialization, validation, and commands. Name token reference syntax `tokens/syntax.ts` to distinguish it from document reference usage under `references/`.

Validation (2026-10-04): regular workspace typecheck and Core ESLint/Prettier pass; no tests were run. The detector reports no size/organization candidates, and 74 Core modules have no runtime import cycles. Static declaration comparison confirms the 11 migrated token/reference modules and separated font/breakpoint declarations are unchanged apart from imports/formatting; all existing public export names remain, with StyleController added. Existing staging is preserved. The complete module map and global/document API examples are documented in `packages/core/src/controller/style/README.md`.

- [ ] Backlog: reconcile component-token rename traversal with reference collection. Evidence: `references/collect.ts` includes `StyleBlock.rules`, while `references/rewrite.ts` omits them (and layout references are collected separately). Boundary: define the supported rewrite surfaces before sharing a style-layer traversal; preserve font references, variants, sparse overrides, token-interface sets, and node/layout semantics. Validation: focused rename/reference coverage and typecheck when this behavior change is requested. Completion: every supported collected local-token reference is handled by the documented rename contract. This behavior change is outside the current structural task.

### Project command context and style controller

- [x] Inline command-context assembly as a private ProjectController method and consolidate style command coordination in `controller/style/controller.ts`.

Evidence: `project/command-context.ts` is a small helper with only ProjectController as consumer. Font/breakpoint commands live in `style/commands.ts`, but style-block parsing and token-read adoption are coordinated by the document dispatcher. Action: keep context assembly with its project owner; replace the style command module with a functional controller for font, breakpoint, and style-block commands, with private mutation helpers. The document dispatcher delegates these commands to that owner. Keep node-property edits, token-interface commands, variant lifecycle, and independently reused style parsers/contracts/selectors in their existing domains. Scope: current Core refactor. Contracts: preserve public exports, command validation/errors/order, token-read adoption, clone isolation, injected executor, live document identity, persisted formats, and transaction ownership. Validation: Core tests, workspace typecheck, scoped lint/format, runtime import-cycle review, and candidate detector.

Validation (2026-10-04): all 135 Core tests, regular workspace typecheck, scoped ESLint/Prettier, and diff whitespace checks pass. The detector reports no size candidates; 71 Core modules have no runtime import cycles. Public exports and staging remain unchanged. Reused style algorithms remain cohesive because serialization, validation, tokens, and variants need them independently of command coordination. Vitest required the documented outside-sandbox workaround.

### Core inferred return types

- [x] Record the project return-type rule and remove redundant Core getter/helper/forwarder annotations and unused type imports.

Evidence: document/project getters repeat types already provided by their stored domain values and import types solely for those annotations. Internal helpers repeat derivable return contracts as well. Action: infer redundant results, retaining explicit readonly/public construction contracts, predicates/assertions, overloads, and types needed for recursion or intentional widening. Scope: Core and project guidance only. Preserve public type shapes and runtime behavior; validate inferred signatures against the starting source, Core typecheck/lint/format, and candidate detector. Tests remain skipped per user preference.

Result: removed 261 redundant return annotations across 42 Core source files and cleaned unused imports. Compared all 556 implementation return signatures before/after with the TypeScript checker, normalizing only object-member and union/intersection order; return shapes are unchanged, including callbacks. Retained contracts where contextual typing, readonly views, recursive inference, or deliberate API boundaries matter. DocumentController no longer imports FlatDocument, StyleBlock, or TokenTree solely for getters. The project rule is recorded in `AGENTS.md`.

### Style block module boundary

- [x] Group style block parsing, editing, references, and contracts under `controller/style/blocks/` with explicit exports in `index.ts`.

Evidence: five related `block*.ts` modules share one responsibility within the broader style domain. Action: move them into `blocks/`, remove redundant filename prefixes, and retain direct internal imports plus the explicit block API. Preserve public exports and behavior. Validation: Core typecheck, lint/format, and candidate detector; no tests per the current user preference.

### Core controller naming and command entry points

- [x] Remove redundant domain prefixes (`project/controller.ts`, `document/controller.ts`, `style/block-*.ts`, `tokens/tree-*.ts`) and use explicit command-directory entry points.

Evidence: domain folder names repeat in filenames, while command consumers depend on implementation paths in some domains and a single `commands.ts` in others. Action: mechanically rename modules, add explicit named exports in each `commands/index.ts`, and route external command consumers through that boundary; keep imports inside each command domain direct. Preserve public Core symbols, runtime behavior, and staging. Validation: Core typecheck, scoped formatting/lint, import inspection, and detector; no test runs per the user's instruction.

### Core controller domain migration

- [x] Move implementation ownership into `controller/document`, `controller/style`, `controller/variants`, `controller/validation`, and `controller/tokens`; remove migrated source locations.
- [x] Separate project options and document context contracts from controllers; extract project command-context assembly and variant editing from document command dispatch/contracts.
- [x] Preserve Core exports and behavior; validate Core tests, workspace typecheck, scoped lint/format, import graph, and candidate detector.

Evidence: the new project/document controllers still rely on the old sibling implementation directories. Document command definitions mix public fields/events with variant-axis and preset lifecycle; ProjectController mixes aggregate ownership with command-context construction. Action: colocate domain logic under controller domains, keep the project as aggregate mutation owner, and put shared types below consumers. Keep document schemas/serialization in `document/` and pure domain algorithms as functions rather than adding stateless controller wrappers. Scope: current Core-only migration; no editor/adapter changes, project metadata features, or persisted-format changes. Contracts: preserve public exports, injectable executor, live document identity, shared schema/token reads, command ordering/errors, sparse variants, and Undo transaction boundaries. The current source detector reports no size candidates; these splits are justified by responsibility, not size.

Additional coupling evidence: token readers/writers repeat the token-segment regex and token-value validation duplicates reference parsing; token and validation contracts are declared in implementation modules consumed by their own helpers. Extract domain-local `types.ts` and token `utils.ts`, and point internal style imports at their actual implementation owner rather than the composite barrel. Preserve token syntax and validation errors; verify existing token/style tests and the runtime import graph.

Validation (2026-10-04): 135 Core tests pass, including executor context, live style/variant reads, failed-batch isolation, and rejected document identity changes. Workspace typecheck, Core ESLint/Prettier, diff whitespace check, and candidate detector pass. The runtime import graph has 70 TypeScript modules and no cycles. Cohesive parsing/resolution algorithms remain functions; project/document are the stateful ownership boundary. See `packages/core/src/controller/README.md` for the resulting responsibilities. Existing staging was preserved.

Consumer checks: 189/191 tests pass across store-yjs, renderer-dom, tokens, style-engine, React codegen, and server. The following two tests also fail against an isolated copy of the pre-existing staged Core source (the working tree and index were never swapped). They remain outside this structural migration:

- [ ] Reconcile the server legacy-schema fixture in `apps/server/test/project.test.ts` (`permits stale expose collisions only for schemaUse backed by the legacy fallback`): current source rejects preview field `label`; staged Core rejects instance field `label`. Completion: establish the intended legacy schema/field contract and make this test pass without weakening canonical schema validation.
- [ ] Reconcile `examples/media.json`/schema expectations and generated `packages/ui` Media output: `matches the committed UI package` fails on the `poster` prop/binding with both Core versions. Completion: agree on the intended example contract and regenerate matching output; do not overwrite existing example edits merely to satisfy the snapshot.

### Core source ownership cleanup

- [x] Group global/component token contracts under `tokens/` and command implementations under `commands/nodes/` and `commands/tokens/`.
- [x] Reuse the existing plain-object predicate instead of duplicating equivalent `isRecord` checks.
- [x] Separate style-block editing, contract validation, and token-reference collection while keeping the existing `styles/style-block.ts` API facade.
- [x] Keep `ProjectController` as the only project/document mutation facade; do not add a state-free validation wrapper.

Evidence: token-tree and component-token modules are still in `src/` root; `commands/` has 13 direct files with node/tree and token operations mixed alongside its dispatcher; identical plain-object predicates are repeated in command, token, and style modules; `styles/style-block.ts` (544 lines) combines editing transforms, contract assertions, and reference collection.
Action: move token modules into `tokens/`; group shared-node command operations and token command operations under their corresponding command domains; reuse `document/json.ts:isPlainObject`; extract style edits and token-reference collection from the style contract implementation, preserving the `style-block.ts` import surface. ProjectController remains the only aggregate owner of document updates; the existing catalog validator remains a pure function because it has no controller lifecycle/state.
Scope: current task. Contracts: preserve public Core exports, command ordering and validation, schema/token persisted shapes, field/style/token resolution, and existing error behavior. Validation: full Core tests, workspace typecheck, scoped lint/format, diff check, and candidate detector rerun.

### Core document/project controllers

- [x] Separate project ownership/command coordination from the read-only document view into `controller/project/` and `controller/document/`.
- [x] Preserve the package entry-point imports and keep adapters such as Yjs outside Core.

Evidence: `packages/core/src/model.ts` contained two separate reasons to change: project document/schema/token ownership and per-document contract reads. Its only consumers were the Core barrel and the focused model tests.
Action: move project state and command routing to `controller/project/`; move contract-backed document reads to `controller/document/`. Project depends on Document; Document depends only on Core document and validation contracts. Export the aggregate mutation facade as `ProjectController`; keep per-document reads behind `ProjectController.document()`.
Scope: current task. Contracts: preserve serialized documents, field resolution, command validation, dynamic model identity, and the injectable executor boundary. Validation: model/schema/public-field tests, Core typecheck, candidate detector, and diff check.

### Automatic component field forwarding

- [x] Treat embedded components as schema extensions by default: expose their public fields on the parent component and forward matching names through generated React output.
- [x] Add a per-instance opt-out that restores explicit source-field dropdown mappings; retain manual schema extension, local preview defaults, explicit exposes, and existing data formats apart from the additive instance setting.
- [x] Keep local fields before inherited fields and resolve duplicate names with the later extension winning. Validate nested contracts, codegen, editor controls, Undo/serialization, typecheck/lint, and browser behavior.

Evidence: the editor currently derives runtime instance sources from `fields` plus explicit `expose`, while the shared schema selector only drives preview controls/defaults. Consequently identical schemas do not make child component fields available to a parent automatically. Keep public-field resolution in Core's document-contract validation API and let the editor derive presentation metadata from it. Store the opt-out on the child instance edge and reuse existing `fieldBindings` when automatic forwarding is disabled; do not add a parallel schema evaluator.

### Canonical persisted component schemas

- [x] Persist shared schema definitions and each component's schema selection with the project documents so editor defaults, public contracts, validation, preview data, and generated React props resolve from one schema source.
- [x] Derive displayed defaults and public fields from the selected schema plus automatic child-component extensions; remove the separate editable `Component fields` source while retaining explicit/manual schema fields and exposure mappings where needed.
- [x] Migrate existing local-storage schema definitions and document fields without losing defaults, field order, variants, bindings, or generated API behavior. Keep preview/instance overrides separate from schema defaults.
- [x] Route Core contract resolution, editor validation/preview, Yjs persistence, and React codegen through the same resolver. Update the schema UI to show own fields followed by inherited fields, with the established later-extension-wins rule.
- [x] Verify migration and round trips, nested and conflicting schemas, invalid references/cycles, defaults and variants, Undo/serialization, codegen, typecheck/lint.
- [ ] Manually verify schema editing in the browser; the current editor tab may contain unsaved document/design work, so it was left untouched.

Evidence: reusable schemas currently live in editor local storage, while Core contracts and codegen consume `document.fields`; preview-data and variant-default paths also read document fields directly. The defaults surface therefore cannot provide the same source fields as component contracts. Introduce a persisted project schema catalog and per-document schema assignment owned by Core, reuse the existing Core public-field resolver for automatic child extensions, and make Editor and codegen consume that resolved contract. Preserve `document.fields` as a read/migration compatibility path, not a second authoring surface. Keep schema resolution in Core rather than adding a separate evaluator in the editor or renderer.

Refactoring review: `create-editor-session.ts` remains the session assembly and lifecycle coordinator; splitting its wiring into generic helpers would separate one initialization flow without creating an independently owned responsibility. The 12 files directly under `ui/shell` are distinct shell regions and controls, so keep their current colocated structure. Neither candidate needs a source split for this task; editor typecheck, lint, and the full test suite pass.

### Editor CSS Modules pilot

- [ ] Review remaining shared stage and design styles before extracting additional CSS Modules.
      Keep global layout only where multiple active surfaces share the same structure; move feature
      rules next to their owning Editor UI when there is a clear boundary.

Evidence: the retired SchemaLibraryStage rules were removed. `CatalogSchemasPanel` and
`JsonSchemaTypeEditor` now share `ui/schema/schema-editor.module.css`; the remaining
`design.css` stage scaffolding is used by active Catalog schema, code, and preview screens, so it
does not have the old single-screen ownership.

### Retired flat schema composition UI

- [x] Remove the unmounted flat-document schema-library composition screen and its paused UI-only
      tests. Keep legacy schema records and migration/recovery contracts for existing projects; current
      schema editing remains in the catalog surfaces.
- Result: removed the old `SchemaLibraryStage`, its hand-built named-reference composition rows,
  and its stage-only UI tests. The active catalog schema editor remains; no persisted schema data or
  validation formats were rewritten.

### Inspector controls / manual CSS and explicit Auto sizing (2026-10-02)

- [x] Separate guided controls from manual CSS properties; preserve bidirectional effective values.
- [x] Distinguish inherited size reset from explicit auto, including instance/master and viewport/variant overrides.
- [x] Verify synchronization, sparse writes and Reset/Undo with tests/typecheck/lint.
- Historical note: visual browser verification was not performed because the local browser runtime failed during startup. Automated validation passed as recorded below.

Evidence: CssDeclarationsControl currently injects CSS rows into the structured layout sections;
Grid controls additionally mix track CSS and placement CSS with guided inputs. Separate presentation
surfaces while retaining existing declaration writers and effective values. Keep grouped declaration
orchestration cohesive; no new generic inspector framework. Explicit auto is an additive core size
mode compiled by style-engine, not another editor-only competing persisted source. Review compile.ts
(470 lines): its cohesive stylesheet algorithm stays together for the small axis branch; no split
solely for size. Preserve old modes, instance masters, sparse variants/viewports and Undo.
Validation: focused UI/compile/integration tests, full suite, typecheck, scoped lint/format, scan.
Inline CSS must be read and written through the same priority rules in both manual and guided
surfaces. Promote the existing layout style-field writer to the properties owner, retaining its
old layout import as a compatibility entry; reuse it for normal manual declaration edits.
Final checks: 866 tests pass; the one generated-UI snapshot comparison fails because the
pre-existing user edit of examples/specimen-section.json differs from packages/ui output.
Do not overwrite that edit or regenerate unrelated example output in this task. Workspace
typecheck, scoped ESLint and formatting pass. Added regression coverage for all four
instance/variant/viewport sizing contexts, inline CSS synchronization, native Hug cleanup,
duplicate own-source Inherit, retained min/max, guided-only Grid fields and media-rule order.
Browser runtime still cannot start after reset; no visual verification claimed. LayoutPanel
(481 lines) stays a cohesive selection/context/write orchestrator; pure sizing is colocated
separately. compile.ts (471 lines) keeps its stylesheet algorithm cohesive; a stable media
sort aligns canvas behavior with existing codegen ordering. No staging or commits changed.

### Grid two-pass implementation (2026-10-02)

- [x] Pass 1: tracks, separate gaps, container/item alignment and child placement; integrate and verify.
- [x] Pass 2: rectangular named area editor, parent-scoped child assignments and atomic rename; integrate and verify automatically.
- Historical note: visual browser verification was not performed because local Windows sandbox startup failed. Automated validation passed as recorded below.

Evidence: LayoutPanel already coordinates context and writes; adding grid UI there would mix
independent container/item interactions. Colocate private GridContainer/GridItem controls in
layout/grid and pure CSS parsing/validation beside them. Reuse icon choices and style-layer
writers. CSS declarations stay the sole persisted source; preserve imported CSS, sparse
viewport/variant overrides, tokens, siblings, public contracts and Undo. No core schema migration.
Validation: focused UI/domain tests after each pass, full suite/typecheck/lint, candidate rerun,
browser checks when local computer-use works. Advanced track CSS stays editable, not auto-rewritten.
Atomic area rename may touch inline node styles and style-block owners together: add an additive
batch command using the existing pure command validator and one Yjs transaction, rather than
exposing CRDT transactions to the inspector. Validate rejection and one-step Undo separately.
Pass 1: 28 focused tests pass; editor typecheck, scoped lint and formatting pass. Browser runtime
failed to start; continue automated validation without claiming visual verification.
Final integration: 828 tests / 147 files pass, workspace-wide typecheck, scoped ESLint and
Prettier pass; final candidate scan has no findings. Review loops covered shorthand gap
inheritance, explicit placement longhands, compound Reset, master-inherited instance styles,
longhand-only rename, sparse variants/viewports and one-step Undo. Grid-instance resolution
is a private module reusing the existing instance-variant resolver; masters remain unchanged.
Raster editing validates rectangles and names, supports up to 20x20 cells, and preserves
unsupported CSS for Advanced CSS. Rename affects direct children in the current edit context.
Browser-control startup repeatedly fails with Windows sandbox setup errors; no screenshot or
visual verification is claimed. Existing staging is preserved; nothing committed.

Unrelated backlog: earlier LayoutControl raw padding/margin inputs should be reviewed against
the existing token-only spacing parser. Grid gaps explicitly retain token-only controls here;
changing the wider spacing contract is outside this task.

### Item self-alignment (2026-10-02)

- [x] Extract layout style-field ownership/write routing from LayoutPanel before reusing it for align-self.
- [x] Add parent-axis-aware item alignment icons; preserve container and sibling styles, sparse variants/viewports, reset and Undo.
- Historical note: automated validation passed; visual browser verification was not performed because the browser-control process could not start.

Evidence: display and align-self need identical style-layer and node-override routing; keep this
private to the layout inspector, reuse existing icon choice and domain style writers. No schema,
renderer, dependency or persistence changes. Keep layout patch orchestration cohesive.
All 713 tests in 139 files pass; editor typecheck, ESLint and scoped
formatting pass. Candidate detector has no findings. Visual verification is pending because
the browser-control process cannot start (local Windows sandbox setup error).

### Design workspace UI (2026-10-01)

- [ ] Fix shared form scope and global token previews; replace canvas-dependent breakpoint selection.
- [ ] Hide canvas-only rails/tools in Design, preserve editor selection and centralize design saving.
- [ ] Extract a shared token table/toolbar and domain value adapters before extending the lists.
      Evidence: repeated CRUD markup and type branching; structured shadows currently fall back
      to JSON, partial typography hides inherited fields. Keep parsers/validation in their domains.
- [ ] Compact Colors/Spacing/Radius tables with natural sorting, hierarchy, aliases, previews,
      inherited values and sparse breakpoint resets; Fonts table and selectable Icons grid.
- [ ] Structured Shadow and expandable Typography editors preserve stored formats and aliases.
- [ ] Validate field edits, inheritance, reset, Undo, metadata, responsive context and browser UI.

No token renames, source import workflows, icon CRUD, dependency additions, or model changes.
Existing command ownership, public APIs, storage, sparse breakpoint semantics and codegen remain.
The candidate scan has no size findings: extraction is justified by shared interaction responsibilities,
not file length. Domain CRUD validation stays domain-owned; unrelated refactors remain in backlog.

## Goal

facadeur is a visual design-system editor. Atoms, components, sections, and pages are built on a zoomable canvas. JSON (our DSL) is the source of truth. It produces real DOM elements for the editor and framework code, initially React. The first user is the author; designers may use it as a product later.

## Principles

1. **JSON is the only source of truth.** The editor never changes the DOM directly; it issues commands against JSON. DOM and styles are derived from it.
2. **Web first.** Everything built in the editor must map cleanly to HTML/CSS. Auto Layout (Flexbox) is the default; free positioning is an explicit exception.
3. **Tokens over raw values.** Colors, typography, and spacing come from tokens. Spacing (`gap`, `padding`, `margin`) is currently token-only.
4. **Clear hierarchy.** Pages contain only sections. An instance's structure stays in its master; field values, variants, and layout can be adjusted on the instance node.
5. **Generatable.** Every data-model decision must translate into typed framework code.

## Decisions

### Technology stack

- TypeScript and pnpm workspaces in a monorepo.
- Editor UI: Next.js App Router + React. React `DynamicElement` renders Core's preview config in viewport iframes.
- Code generation produces React components and CSS Modules; `examples/next` demonstrates the output in a Next.js app.
- Validation: TypeBox schema in `core`, JSON Schema export, and Ajv validation.
- Local operation: `apps/server` holds the authoritative Yjs project state and synchronizes open editors. JSON files under `examples/` remain the explicit source/export format; Save writes confirmed changes there.
- Document state: **Yjs** (CRDT), commands, and `Y.UndoManager`; the local project server persists shared history.

### Packages

- `packages/core` – types, schema, validation, commands, and the `DocumentStore` interface.
- `packages/store-yjs` – Yjs implementation of `DocumentStore` and conversion between the file format and Y document.
- Token resolution belongs to Core, CSS output to Style Engine, and fixture data to Examples; no token facade package remains.
- `packages/style-engine` – shared style compilation and live application through `CSSStyleRule`/`insertRule`; its controller is inspired by `style-controller` without importing it at runtime.
- `apps/editor` – Next.js + React app (canvas, panels, tools).
- `packages/ui` – generated React design system (components + CSS) from `pnpm codegen`.
- `apps/storybook` – Storybook app that lists all generated CSF3 stories from `@facadeur/ui`.
- `packages/codegen` – shared `generate()` entry point; `engines/react` is initially the default engine for React, CSS Modules, and Storybook stories.

### Kinds and hierarchy

- Each document has a `kind`: `atom`, `component`, `section`, or `page`. The list is configurable (kinds can be merged or split further), with nesting rules for each kind.
- Default rules: atoms contain only primitive nodes; components contain primitive nodes, atoms, and components; sections contain everything except sections and pages. **Pages contain only sections.**
- In the editor, all kinds share a project tree in the left sidebar (Design with tokens and fonts, followed by Atoms, Components, Sections, and Pages). The open document's layer list sits below it. No workspace switcher replaces this tree.

### Primitive nodes

- `frame` (container with Auto Layout), `text`, `image`, and `instance` (a placed component). `slot` may come later.
- The HTML tag is a property (`tag`), such as `section`, `nav`, `a`, `button`, or `input`.

### Instances

- An instance references a component. Field values, variants, and layout are set on the instance node; its structure remains in the master.
- **No detach.** Style rules in the owning document may target local descendants and nested instance roots. These rules remain part of the master; instances do not receive arbitrary inline styles.
- A component is edited **only in its own view**, not where it is placed. Double-clicking an instance may navigate to the component.

### Component properties

- A component defines fields: `name`, `type` (`text`, `richText` later, `image`, `link`, `boolean`, `enum`, `number`, `token`), and `default`.
- Fields can bind to text, attributes, styles, or child-node visibility.
- Instances override values. Code generation turns them into typed props/inputs.

### Variants

- A component defines variant axes (for example, `size: sm|md|lg`, `intent: primary|secondary`). Variants override the style block. States such as `:hover`, `:focus-visible`, and `:disabled` also belong in the style block.

### Code generation output (monorepo)

- `pnpm codegen` writes **`packages/ui`** (components, barrel, token and component CSS) and **`apps/storybook/src/stories/generated`** (CSF3 stories with args from field and variant defaults).
- Generated output is checked in and follows the monorepo structure (`apps/*`, `packages/*`). Storybook is the primary preview; `examples/next` imports `@facadeur/ui`.
- Documents remain sorted by ID so the same catalog always produces the same output.

### Tokens

- Canonical format: grouped family maps (`color`, `space`, `radius`, `shadow`, `type`, `font`) keyed by UUID. Each record has `uuid`, `label`, `group`, `valueType`, and `value`; references use `{token:uuid}`.
- The CSS custom-property selector is derived from family/group/label and is not stored as token identity. Renaming a label or group changes the generated selector while UUID references remain stable.
- Responsive token values live in `breakpoints` maps keyed by breakpoint UUID. Font families are records in the `font` family; breakpoints are separate UUID resources.
- Catalog integration tests source real token and breakpoint records from `@facadeur/examples` via `createExampleCatalog()`. Keep inline records only for deliberately invalid or minimal legacy-contract cases so example edits flow into tests directly.
- Legacy W3C DTCG documents are converted at the Core read boundary. `$type`, `$value`, and `$extensions.facadeur` are migration input, not the canonical runtime format.
- Keep `packages/core/src/controller/style/tokens/global/legacy-migration.ts` cohesive: it owns the single DTCG-to-canonical conversion boundary; splitting its traversal and normalization would divide one algorithm without creating a new owner. Preserve legacy input acceptance and canonical UUID output, and validate through Core migration/type checks.
- Three levels: primitive, semantic, and component tokens. Tier metadata is namespaced under `extensions`.
- In the editor, tokens become CSS custom properties on a root rule.
- Components can read tokens and override them for nested children through CSS variable cascading. The schema declares which tokens a component reads and sets.
- Themes/modes (dark mode, brands): **not now**; planned as a later improvement.

### Fonts

- Dedicated area for font-family token values, weights, sources (file or Google Fonts), and fallbacks. Their identity and shared record fields use the same token contract as other families.
- The typography scale uses tokens with per-breakpoint values, producing real `@media` rules.

### Viewports

- Breakpoints are configurable (defaults: mobile 375, tablet 768, desktop 1440).
- **One iframe per viewport frame** so real media queries apply. The iframes are same-origin; the editor accesses them through `contentDocument` (no `postMessage`), behind a thin `FrameHost` interface so isolation remains possible later.
- The style engine runs once per iframe. The editor draws selection and hover outlines **over** the iframes, never inside them.

### Styles

- Each component has its own style block, which references tokens. Variants and breakpoints override it.
- The editor renders preview styles through `style-engine`; the React engine generates CSS Modules. Both translate the same document/style contracts into their own DOM and React selectors.
- No Tailwind in core.

### Data model and local synchronization

- **Flat in-memory model:** nodes are stored in a map by stable ID; children are ordered ID lists (`Y.Map` per node, `Y.Array` for children). UUID-keyed token families and settings are also maps in the Y document; font tokens live in the `font` family.
- **Readable file format:** nested, readable JSON is stored on disk (for Git and agents). It is converted to the flat model on load and back on save. The conversion is lossless and tested.
- **Commands are the only way to change the document.** Each command runs as a Yjs transaction. UI components do not access the Y document directly.
- **The editor communicates only with `DocumentStore`** to read, execute commands, and subscribe to changes. The renderer and style engine react to change events and update only affected content.
- `apps/server` provides the local HTTP API and Yjs WebSocket. It currently runs alongside Next.js on port 3002; a shared browser port is planned for later.
- The current setup supports one local project state and open synchronized editors.
- Presence (cursors and selections) through Yjs Awareness is not implemented yet.

### Editor behavior

- **Layout:** every frame uses Auto Layout by default (direction, gap, padding, alignment, wrap). Free positioning (`position: absolute` relative to the parent frame) is an explicit per-element option.
- **Sizing:** each axis supports `hug` (fit-content), `fill` (flex: 1 or stretch), or `fixed` (px or token), plus min/max. Percentages are an advanced value. Every value can be overridden per breakpoint.
- **Spacing:** tokens only (spacing scale). Free-form values are not allowed for now.
- **Insertion:** keyboard tools (F Frame, T Text, I Image), drag from the component/atom list, click in the selected container to append, or drag to show an insertion line between siblings. “Wrap in Frame” uses Ctrl+Alt+G.
- **Selection:** layer list (always visible, including for nodes without dimensions). Empty frames have a minimum editor size and dashed outline (not exported). Click selects the topmost element in the current context; double-click goes one level deeper; Ctrl+click selects the deepest element; Esc selects the parent. Hover outline shows the click target.
- **Moving:** reorder by dragging on the canvas or in the layer list. **Arrow keys move only freely positioned elements.**
- **Commands:** every change is a command (insert, remove, move, setProp, setStyle, setField, etc.) executed as a Yjs transaction. Undo/Redo uses `Y.UndoManager` (only the current user's changes, including in future multi-user editing).

### Project template

- Project creation can optionally initialize default tokens (colors, spacing scale, radius, shadows), a default font with typography scale, and built-in atoms: `button`, `link`, `input`, and `textarea` (more later, such as `checkbox` and `select`).

### Not yet decided / outside the current local scope

- Cloud/production operation, authentication, and permissions.
- Themes/modes, slots, additional generators, and free-form spacing values.
- Presence and a persistent browser-local offline outbox.
- Later: Playwright visual regression and accessibility checks for atoms.

## Open roadmap

### Frontend placement classes instead of node IDs

- [x] Remove generated `nodeId` transport and `data-node` markup. Generate readable, owner-qualified placement classes for instances and target those classes from direct/nested override CSS; repeated instances of one placement share styling, while Card/Textarea placements stay independent. Keep editor identity and persistence untouched, preserve variants/states/breakpoints, root instance forwarding and nested override contracts. Codegen owns the class mapping and selector adaptation; retain its cohesive renderer and extract selector resolution beside CSS where needed. Validate actual rendered class/selector matching for mixed lists and nested components, standalone types, generated examples and package checks.
- Generated instances use hooks such as `NewSection__Card` and `NewSection__Textarea`; CSS Modules scope their override rules to the owning component and use `:global` only for these shared placement hooks across component boundaries. Transparent Repeater/Switch roots distribute incoming root classes to their rendered children; array indices remain React keys and never styling identities. The editor's node IDs and persisted schema contracts are unchanged.
- Validation: `pnpm codegen` succeeds and all 76 generator/Code preview tests pass. Actual React rendering plus DOM selector checks cover two repeated Cards versus one Textarea, incoming classes on transparent roots, nested Card/Button overrides and a sibling placement that must remain unaffected. Generated graph compilation, codegen/UI/Storybook TypeScript, repository ESLint, scoped Prettier and diff checks pass. No size candidates remain. Retain the 12-file React-engine source directory: its small orchestration/output adapters share one target-engine owner, with component internals already grouped below `component/` and the private placement selector colocated with CSS emission; moving modules now would add import churn without a new ownership boundary. User staging and source examples remain intact.

### Standalone structural React output and typed stories

- [x] Generate direct discriminant switches with a null default, using component payload types without importing Facadeur runtime libraries or embedding schemas. Normalize legacy structural Storybook samples into `{ type, props }` during generation, including nested payloads and variants, preserving source documents and authored samples. Omit empty CSS rules and export placeholders; remove the generated UI's unused Core dependency.
- Ownership review: structural AST/JSX printing belongs to the React generator; sample normalization belongs beside story generation and may consume Core selection only at generation time. Keep catalog/schema derivation in Core and preserve render conditions, loop context, node/style addressing, variants and event contracts. Test the new-section fixture, nested/root switches, standalone generated graph compilation, tagged/legacy stories and CSS with real declarations. Retain cohesive render and print modules; extract the sample normalizer as a private story helper rather than mixing compatibility matching into emitted runtime code.
- Correct root Switch types to retain Core's existing `props` envelope, with the correlated `{ type, props }` union inside that field. The previous direct union on the whole component data type did not match its actual generated input fields. No editor or persisted data-model change is needed.
- Completed validation: `pnpm codegen` succeeds with the user's new-section included. All 75 generator/Code preview tests pass. Generated React graphs compile without a Core stub; actual React rendering verifies two Textareas and one Card from the generated story, both root Switch branches, and empty/unknown-case behavior. Tests cover nested legacy samples, tagged choice preservation, custom cases, named variant samples, source immutability and retained styled CSS selectors without empty export rules. Codegen/UI/Storybook TypeScript, repository ESLint, scoped Prettier and diff checks pass. Global Prettier reports five unrelated files outside this task; preserve those changes. Final detector reports no size candidates and existing generator ownership remains cohesive. Generated artifacts and the UI dependency/lockfile were updated without changing source examples or staging.

### Codegen schema library input

- [x] Fix the normal `pnpm codegen` path to load `examples/schemas.json` explicitly. Add `--schemas` to the existing React CLI, validate that catalog with Core, and use it consistently for catalog validation and generation; preserve embedded-design support and authored assignments. The small CLI remains the cohesive input/output adapter. Validate separate-file and embedded catalogs, the actual package command, and generated output consistency.
- Verified the actual `pnpm codegen` command exits successfully. Both CLI regressions pass (embedded catalog and explicit external library, including the original missing-schema failure); codegen TypeScript and focused ESLint pass. Final detector reports no size candidates. No temporary combined design input is needed.

### Schema-owned generated data types

- [x] Emit Settings schema types under generated `types/`; derive component data contracts from authored schemas and local fields instead of name-based label/value/commit traits. Keep React transport props separate. Codegen owns naming/imports/printing and consumes Core's existing structural contracts, preserving the editor model, defaults, field names, cases, rendering and staging.
- Evidence/boundary: shared semantic traits guessed from field names obscure authored schema ownership; inline structural schemas duplicate component payload shapes. Add a private data-contract printer to the React generator, retain the cohesive catalog/render modules, and validate shared schema imports, local extensions, discriminated repeater unions, nested data and generated graph compilation.
- Completed: generated catalog types preserve references and schema composition. Component `Data` interfaces own local fields or inherit compatible shared properties; defaulted or renamed fields retain their effective public contract. Repeater items reference named `{ type, props: ComponentData }` alternatives; root Switch data uses a correlated discriminated union. React transport, variants and events remain in `Props`. Existing shared trait exports remain available for compatibility, but generated components no longer infer or consume them by field name.
- Validation: 69 generator/Code preview tests pass, including compiled shared schema composition/defaults, local extensions, nested context, invalid Switch payload rejection and committed generated output consistency. Codegen, UI and Storybook TypeScript, repository ESLint, Prettier and diff checks pass. Final detector reports no size candidates; the private schema emission helper stays with its generator owner. Generated artifacts refreshed without changing example documents or staging.
- [ ] TODO: Schema tab Defaults → Add item currently displays only an index. Reuse the structural type chooser and selected branch form so users can choose Card/Textarea and edit their fields, preserving Undo and schema defaults.

### Shared generated component contracts and selective context

- [x] Refactor generated React UI contracts through their generator: emit one shared component/context contract and opt-in label/value/commit traits, preserving each field's optionality, defaults and event payload types. Rename the internal repeat transport to `context`; destructure and forward it only where actual expressions or descendants need it. Keep runtime scope data distinct from the editor's schema path option list.
- Evidence and boundary: the type printer duplicates the same repeat-scope shape in every generated component and unconditionally declares its transport even for leaf controls. The React generator owns shared output contracts and context-use propagation; generated UI consumes that output instead of hand-maintained copies. Retain the existing catalog/render/print boundaries, with private contract printing beside the printer.
- Preserve document schemas, existing data, loop parent semantics, field bindings, exports, form events and user staging. Reserve the generated context prop name to avoid collisions with authored fields. Validate leaf controls, transitive wrappers, nested repeaters, required/generic form fields, generated graph compilation and committed output consistency; regenerate the UI package and run package types/lint/format.
- The nested context compilation fixture exposed two related generator defects: matching root `items` could override a selected structural payload's own `items`, and root conditions/repeats retained JSX child-container braces in a return expression. Keep selected payload forwarding ahead of implicit root forwarding and print root expressions correctly; protect both with generated graph compilation regressions.
- Generated UI now imports shared contracts; the editor Code preview includes their source so inherited fields remain visible. Context contains current and parent loop values; component inputs retain their typed public props. A centralized inspector option-list resolver remains a separate design follow-up, with no editor scope-model change in this refactor.
- Validation: all 65 React generator tests pass, including graph compilation and committed output consistency. The full workspace run passed 1,056 tests and found one stale Code preview assertion; after including the shared contracts in that adapter and updating the assertion, both preview tests pass. Codegen, UI, Storybook and editor TypeScript checks, repository ESLint and Prettier, final focused adapter checks and diff checks pass. Final candidate scans report no size candidates; the contract printer and small preview adapter retain their existing ownership boundaries. User staging and example data are preserved.

### Explicit structural cases and nested data scopes

- [x] Replace guessing for newly authored structural data with `{ type: caseValue, props: payload }`. Derive case values from component names, allow placement-specific edits, and expose the full discriminated branch union inside the existing root `items`/`props` contracts. Selecting a type narrows its item form and runtime branch without exporting child fields onto root.
- [x] Provide lexical loop scope: `item` and `index` for the current Repeater, `parent.item` / `parent.index` for the immediately enclosing loop and recursive `parent.parent` for outer loops. Within a selected branch expose its narrowed `props` payload. Keep runtime, generated React, bindings and condition pickers consistent across component boundaries.
- Ownership review: Core owns schema envelopes, case defaults/validation and portable scope contracts; Yjs owns persistence; renderer/codegen own execution; editor owns case and item controls. Colocate helpers with those domains and consume Core public APIs. Existing controller/render/UI modules retain their cohesive contracts; scanner signals are review evidence, not automatic splits.
- In-scope refactor: both the array editor and standalone Switch editor need the recursive schema form. Extract `SchemaValueForm` beside the data controls so neither control imports the other's orchestration. Preserve field initialization, optional fields, nested array edits and payload validation; validate through focused control and workflow tests. Retain Core's structural contract module as one cohesive owner of branch schemas, selection and scope derivation despite its size signal. ContentPanel and the data-control directory remain organized around the inspector's authored data responsibility.
- Preserve Undo, sparse variant edits, source payload schemas and user changes. Read old untagged values compatibly, with explicit typing on subsequent edits; do not silently rewrite user files or delete New section. Verify identical payload alternatives, editable cases, nested parent references, persistence, actual browser interaction and package checks.
- Completed validation: full suite passes 185 files / 1,054 tests; all ten workspace TypeScript checks, repository ESLint, Prettier and diff checks pass. Coverage includes identical-schema routing, case edits and Undo, Yjs round trips, nested derived item forms, three loop levels, owner-versus-target props, exposed fields and structural cycle rejection, plus generated React graph compilation and refreshed UI artifacts. Example test sessions now supply the existing schema library so the user's Textarea assignment remains valid; production schema checks stay strict.
- Browser verification used an isolated fixture: selected Textarea, changed its type to Card and back while retaining the compatible title, renamed its case to `A` with preview data retagged, and bound a render condition to `props.title`. Evidence: `.facadeur/typed-case-preview/typed-cases.jpg` and `scoped-condition.jpg`. Closed the temporary browser/server and restored the exact pre-preview Next configuration. New section and staging are preserved.
- Final detector review retains the cohesive structural contract module (572 lines), ContentPanel (476 lines), the 16-file data-control directory and the 12-file Core validation directory. These remain organized by their existing data-inspector and portable-contract owners; no unrelated refactor is added. Explicit typed routing supersedes the prior property-matching workaround for new data; legacy untagged data keeps that compatibility behavior until an explicit edit.

### Repeater item forms in the inspector

Follow-up: optional Card/Input contracts both accept `{}` and unknown fields, so first-valid matching loses the picker selection. Initialize the chosen item's optional fields and share property-aware matching through Core's public API across forms, DOM rendering and generated React. Preserve authored schemas, root data shape, ordered ties, Undo and legacy data. Keep the pure matcher with Core schema validation and initialization beside the item control; no responsibility split is needed. Verify overlapping optional schemas in item forms and actual rendering, plus existing structural/codegen tests and types.

Follow-up result: 80 focused Core/editor/renderer/codegen tests pass, including optional Card/Input contracts, retaining Input after clearing its label, and rendering an input instead of a Card heading. Browser verification with the actual example Card/Input documents confirms the Input form and live Email label/input across viewports. Core, editor, renderer and codegen typechecks and scoped lint pass. Equal property-match scores retain configured order; this supersedes first-valid matching for overlapping schemas. No discriminator is injected and source schemas remain unchanged. Evidence: `.facadeur/item-editor-preview/input-choice.jpg`.

- [x] Add an accessible + action to the root/Repeater Content inspector for its `items` value. A single configured component/section inserts directly; multiple alternatives offer their names, including every transitive Switch alternative. Each array entry has a schema-driven form and removal, with arbitrary repeated additions updating the rendered preview.
- Ownership review: keep template-choice discovery in the editor schema domain and the reusable item form/schema helpers colocated with data controls. BoundFieldValues remains the preview command adapter, writing sparse root previewData through existing commands and Undo; a nested Repeater edits that same root value. Preserve component contracts, source templates, styles, variants and serialized document shapes. Keep an optional Advanced JSON disclosure for unsupported/custom schema editing.
- Validate direct and transitive choices, multiple additions and edits, named-schema constraints, nested fields, root Frame and Repeater selection, removal/Undo, preview rendering, package types, scoped lint/format and real-browser interaction.
- Validation completed: full suite passed 183 files / 1,025 tests; final draft/empty-string adjustment passed the eight item-control and inspector integration tests. Editor TypeScript and scoped ESLint passed. The isolated browser preview verified template selection, injected forms, live mixed-item rendering, removal and Undo. Invalid edits retain the selected form until corrected; optional nested arrays initialize on their first insertion. Browser evidence: `.facadeur/item-editor-preview/items-sidebar.jpg`.
- Final ownership review: the detector reports no size candidates on affected paths. The 14-file data-control directory remains cohesive around authored data controls; item interaction and its private schema helper stay colocated. No unrelated split or persisted data-model change is needed.

### Collaboration

- [ ] Presence: other users' cursors and selections through Yjs Awareness
- [ ] Accounts, projects, and permissions (Next.js)

### Later

- [ ] MCP integration (planned for later; scope to be defined)
- [ ] Themes/modes, slots, additional generators (Web Components, Angular)
- [ ] Visual regression (Playwright), accessibility checks

### Fixed repeater and switch contracts in Core

- [x] Add style-free structural `repeater` and `switch` nodes, represented in nested and flat documents with child instance references. Repeater derives `items` as an array of `anyOf` child contracts; switch derives `props` as the direct `anyOf` union of its child contracts. Empty nodes remain configurable; a repeater may contain a switch, which forwards all alternatives transitively.

Evidence: Core currently treats every non-frame node as a leaf, components define flat field maps, and a field contract cannot carry an unflattened union. The new fixed component-like contracts need Core-owned traversal, JSON Schema union derivation, and existing field projections that retain the original schema.
Action: extend the existing document node model and conversion/traversal contracts; keep style/layout/binding ownership out of structural nodes. Add optional JSON Schema metadata to field definitions and array items, resolve each instance target from catalog documents, and expose structural-node schema/field helpers through Core's public API. Keep the flat document parser cohesive; no unrelated split is justified.
Scope: requested Core prerequisite for repeater/switch; no editor or renderer implementation in this entry.
Contracts: preserve existing instance component references, nested/flat round trips, catalog validation, component-like instance-kind rules, existing field behavior, and exact `oneOf`/`anyOf` composition semantics. Do not intersect alternatives or introduce discriminators. Validate with focused Core tests, package typecheck, and detector rerun.
Refactoring review: the validation directory crosses the detector's 12-file organization signal, but these modules form one cohesive document-contract owner (schema-use, forwarding, validation and schema derivation). Keep that domain together; `structural-nodes.ts` isolates the pure structural derivation without introducing a generic schema utility or adapter dependency.

### Structural Repeater and Switch elements

- [x] Replace frame presets with dedicated non-styleable `repeater` and `switch` nodes. Both accept child component/section instances; repeater can contain a switch template. Derive the fixed `items` array and `props` union contracts recursively, including CardList -> Repeater -> Switch -> Card/Card2. Preserve raw branch schemas rather than flattening a union into an intersection; ordered matching selects the first compatible child.
- [x] Integrate nested/flat conversion, validation/commands, retained persistence, renderer, React codegen, layer insertion/selection and read-only derived schema inspector. Empty special nodes remain insertable/configurable. Verify style prohibition at validation, UI and output boundaries, heterogeneous samples, changes to target lists/contracts, Undo and round trips.
- Refactoring prerequisite: keep schema derivation/matching with Core's contract owner and consume public APIs. Keep renderer, React generation and editor interfaces in their owning packages; extract cohesive structural helpers next to each consumer rather than duplicate schema matching. Existing editing/session/layout/style files are size review signals; extend editing only for tree capabilities and preserve cohesive wiring. Unrelated decomposition candidates remain backlog signals, outside this feature.
- Validation: focused Core/schema/commands/persistence/runtime/codegen/editor regressions, workspace typecheck, scoped lint/format, detector rerun and actual browser interaction/visual checks. This supersedes the earlier frame-based Repeater/If-Else approach.

Result (2026-10-05): 180 test files / 1,013 tests pass; the subsequently adjusted renderer, generated React graph and editor controls pass another 74 focused tests. Package TypeScript checks, scoped ESLint/Prettier and diff checks pass. An isolated real-browser project verifies named component/section schemas with required fields, enum constraints and additionalProperties=false; CardList renders Card/Card2/Card correctly both directly and placed on a page. Right-click insertion, automatic selection, content-only structural inspector, exact union schema and Undo were checked in the browser. The temporary server/tab and Next-generated configuration edits were cleaned up. Generated structural React components import the public Core schema matcher; the UI workspace declares that dependency.

Refactoring outcome: renderer structural expansion is colocated in `structural-children.ts`, separating schema selection from DOM reconciliation while preserving rendered identity paths and forwarding. Viewport creation only forwards its existing schema catalog to the renderer; no further split is warranted. Core's validation directory and editor data controls remain cohesive domain owners despite their directory concentration signals.

Schema boundary follow-up (2026-10-05): automatic field collection explicitly stops at repeater/switch nodes. Alternatives contribute only to their fixed `items`/`props` value schema, even with `forwardFields: true`; ordinary sibling instances keep their existing forwarding. Exact root-key assertions cover nested/flat documents, transitive placement, nested frame -> repeater -> switch, and a normal sibling. The existing Core-owned collector already had this behavior; explicit guards document the boundary, with no ownership split needed. Validation: 60 Core/editor/codegen regression tests, Core typecheck, scoped lint/format and candidate scan.

Layer move follow-up (2026-10-05): a layer-drag regression verifies moving a sibling Switch into the middle of an empty Repeater row, automatic selection, the owner contract changing from `items` + `props` to only `items`, preservation of the child schema inside its array union, and Undo. Root layers remain non-draggable; edge drops place siblings, while middle drops nest. No production change is needed for this supported move. The existing editing module remains cohesive for this test-only scope; the deferred token-query extraction above is unchanged. Validation: four layer-insertion/movement tests, editor typecheck and scoped format/lint.

### Refactoring backlog: editor editing responsibilities

- [x] Retire the unmounted flat-document schema-library editor and its private composition UI.
      Current catalog schema authoring stays in `CatalogSchemasPanel`; legacy schema data and
      recovery migration remain separate compatibility paths. See the completed schema-UI cleanup
      entry above.
- [x] Refactor: extract Core field-compatibility semantics.
      Evidence: `data-contracts.ts` owns both the legacy validation traversal and a pure recursive
      `FieldDefinition` compatibility check for scalars, enums, arrays, and nested objects.
      `assertFieldBinding` also formats the catalog-specific error but does not own that comparison.
      Action: move the pure comparison and its private shape helpers into
      `validation/field-compatibility.ts`; leave required/default checks, field-path scope,
      traversal, and error messages in `data-contracts.ts`. Cover compatibility directly without
      constructing a DocumentFile or invoking tree validation. Scope: private Core refactor only;
      preserve the legacy validator required by API and Store Yjs. Contracts: preserve enum subset,
      required/default, nested item, and object-field semantics; no Core public export or document
      format change. Validation: focused compatibility assertions, root suite, workspace typecheck,
      detector rerun, formatting, and `git diff --check`. Result: extracted the recursive
      compatibility rules into the private pure module with five focused assertions. Compatibility,
      Core catalog/token suites pass 40 tests; root tests pass 69 files / 242 tests; workspace
      typecheck and formatting pass. The detector reports `data-contracts.ts` at 451 lines after
      extraction; retain it because remaining catalog traversal, required/default validation, and
      error formatting form one legacy validation flow, and another split would add indirection.
      `git diff --check` passes.

Post-commit review found a behavioral defect while inspecting the latter candidate: definitions
and data-contracts duplicate schemaAtPath, traversing a nested composed path twice. Regressions
confirmed valid oneOf/anyOf event mappings were rejected as undefined. Extract the actually shared
path resolver into private validation/schema-path.ts and correct traversal once per branch;
accepted/rejected nested mappings for allOf/oneOf/anyOf now pass, with no public export changes.
This removes path resolution from the pending compatibility extraction. Retain the
other detector signals as cohesive validation, command, inspector or session owners; the existing
token-query candidate below remains the next independently justified editor split.

Validation after the shared path correction: 1,107 tests in 196 files pass, workspace typecheck,
scoped lint/format and diff checks pass. The detector retains four cohesive Core validation size
signals and its 13-file domain concentration; no size-only reorganizations are warranted.

- [x] Extract editor token-reference queries from `apps/editor/src/domain/editing.ts` into `apps/editor/src/domain/token-references.ts`. Evidence: `editing.ts` owned both pure global/component token option queries and placement/drop geometry, while token controls consumed the query helpers directly. Keep placement logic together in `editing.ts`; route production token-query imports to the new domain module and retain re-exports from `editing.ts` for compatibility. Preserved ordering, UUID/component reference syntax and query fallback behavior. Validation: Prettier and diff checks pass; before/after detector scans show no candidate in the edited domain modules (two existing UI size signals remain); editor typecheck still reports pre-existing errors in Inline, Modal, Popover, VariantActionButton, CatalogPreviewDataStage and jsonjoy-type-editor, with no errors in changed files. The existing `editing.test.ts` imports removed JSON templates and cannot currently run, so its behavioral assertions remain for fixture migration.
- Retained candidates: session assembly remains cohesive lifecycle wiring; the existing layout panel and CSS declaration editor are coherent interaction surfaces and do not need a size-only split for this task. The flat `domain/` directory mixes these domains, but existing subdirectories already own session, selection, schemas and edits; reorganize only with a concrete cross-domain ownership need.

## Paused Editor tests and fixture migration

- [x] Refactor: make nested form paths shared by the Form package
  - Evidence: `apps/editor/src/ui/controls/form-binding/schema/path.ts` contains immutable
    `getPath`/`setPath` and path-formatting helpers used by the Editor's child-bound form adapter.
    The owning `@facadeur/form` package already owns form value updates but has no nested path
    contract; the helper test is currently misplaced under Editor. A form-element audit also
    confirms `ui/form` is gone, Editor binding controls delegate to `@facadeur/form`, and no raw
    HTML input controls remain in Editor source; retain those adapters for their Editor bindings.
  - Action: move the path primitives and their existing tests into `packages/form`, export them
    from the package entry point, and have Editor wrappers import that public API. Keep the
    Editor-only Form context, commit behavior, density, and design-prop binding in Editor.
  - Scope: consolidate form value-path semantics; no control rendering or persisted data changes.
  - Contracts: preserve dot paths, numeric array segments, escaped record keys, immutable updates,
    and all existing Editor binding behavior. Do not move Core prop-resolution ownership into Form.
  - Validation: the moved path suite passes 2/2, Editor Form integration passes 6/6, and the full
    root suite passes 43 files / 145 tests. Workspace typecheck passes for all 11 projects with
    scripts; refactor detector, import audit, formatting, and diff check pass.

- [x] Review candidate: repeated-list add/remove behavior remains with its form owner
  - Evidence: `packages/form/src/fields/repeater/RepeaterField.tsx` and the Editor's
    `ui/controls/form-binding/components/dynamic/ArrayField.tsx` both implement item creation,
    row removal, and repeated rows. The Form version renders fixed `FormFieldConfig`; the Editor
    version renders dynamic Catalog schema children under its own path-prefix context and supports
    collapsible rows.
  - Review: keep the implementations separate. `RepeaterField` is a field configured with static
    `FormFieldConfig[]` and emits nested `FormChangeMeta`; Editor `ArrayField` binds arbitrary
    Catalog schema children under `PathPrefixProvider`, supports collapsible rows and dynamic
    default factories, and emits through the Editor form context. Only append/remove mechanics
    overlap; sharing a renderer would add optional APIs for divergent row, metadata, and binding
    semantics. Both remain owned by their form systems, and Editor fields still render through
    `@facadeur/form`.
  - Scope: audit only; no behavioral or persisted contract change.
  - Contracts: preserve both APIs, commit and path semantics, disabled behavior, static Form field
    rendering, and dynamic Catalog schema rendering.
  - Validation: inspected both implementations and their consumers; the shared-field audit finds
    native input/select/textarea markup only under `packages/form`; Editor typecheck passes, scoped
    detector reports no size candidates for these modules, formatting and `git diff --check` pass.
    The same form-context audit found and removed the unused optional `registerCommitHandler` type
    member; no references remain.

- [x] Remove the unreferenced legacy `HistoryButtons` component and its tests.
  - Evidence: `apps/editor/src/ui/shell/HistoryButtons.tsx` has no product import; its only consumer
    is `history-buttons.test.tsx`. The latter's integration case expects the retired
    DocumentFile-backed undo/redo session, while the current catalog session refuses document
    commands. The two isolated button tests exercise a component that is not part of the shipped
    shell.
  - Action: delete the dead component and its component-only tests; preserve Core history APIs and
    all current catalog session behavior.
  - Scope: remove unreferenced Editor code and legacy-only test coverage.
  - Contracts: no rendered app behavior changes because the component has no product callers.
  - Validation: source import audit confirms no remaining component callers; detector reports no
    size candidates; the workspace suite passes 24 files / 95 tests and `git diff --check` passes.

- [x] Refactor: migrate paused Editor tests individually to the current `ProjectCatalog` model.
  - Evidence: `apps/editor/test/fixtures/example-catalog.ts` searches the removed root `examples/*.json` and `schemas.json`, and contains a locally invented fallback schema. The user chose individual test migration and explicitly rejected shims/adapters. Current Editor session inputs accept `projectCatalog`; `@facadeur/examples` owns canonical Catalog fixtures. Remaining tests cover a mix of active Catalog behavior and retired DocumentFile workflows, so batch deletion would discard unclassified coverage.
  - Affected tests: `bound-field-values`, `colors-domain`, `component-tokens`, `content-preview-options`, `design-domain`, `drill-navigation`, `event-contract-controls`, `fonts-domain`, `grid-context`, `grid-edits`, `history-buttons`, `icons-domain`, `instance-context`, `instance-token-labels`, `layout-variant-context`, `left-rail-split`, `navigation`, `preview-chrome`, `properties-tabs`, `radius-domain`, `save-state`, `selection-model`, `self-alignment`, `session`, `shadow-domain`, `shell`, `sizing-context`, `spacing-domain`, `structured-options`, `style-inspector-context`, `token-tables`, `typography-domain`, `viewport-edit`, `viewport-layers` (all `.test.ts` / `.test.tsx` under `apps/editor/test`). `editing.test.ts` was subsequently migrated to its current active behavior.
  - Action: migrate each retained test directly to current Core/Examples APIs, with test-local current-model fixtures for behavior not covered by canonical examples. Remove fixture helpers and tests only after imports are gone or evidence shows they only exercise retired behavior. Do not restore JSON templates or add conversion helpers.
  - Scope: cleanup migration; only make product changes when required to preserve currently supported Catalog behavior. Keep API/API-client and Store Yjs untouched.
  - Contracts: preserve supported Editor behavior; Examples remain the reusable static-data owner; no v1-to-v2 adapter or compatibility shim.
  - Validation: re-enable only directly migrated suites, then run focused checks and the workspace suite in the approved host context; rerun the refactor detector and diff checks.
  - Completed migration: `layers-navigation.test.tsx` no longer reads `examples/button.json` or
    mounts the legacy document shell. It uses `createExampleCatalog()` with the active
    `CatalogLayersPanel` and covers node selection/expansion, Catalog layer insertion and deletion.
    Nested-instance drill assertions were retired because `NodeDefinition` has no nested instance
    navigation model and the current Catalog layer panel does not expose that behavior. Added the
    migrated suite to the root Vitest allowlist; its three tests pass.
  - Progress: `layout-icon-control.test.tsx`, `navigation.test.tsx`, `token-tables.test.tsx`, `properties-tabs.test.tsx`, `session.test.ts`, and `shell.test.tsx` now directly exercise current controls and Catalog APIs with canonical Examples or local current-model fixtures. The old `example-catalog.ts` helper, its v1 JSON enumerator, conversion helper, and invented fallback schema have been deleted after all imports were migrated or classified. Root Vitest passes 36 files / 125 tests. Workspace typecheck passes for domain, form, core, examples, style-engine, tokens, api, store-yjs, api-client, and server; Editor still reports the two unrelated diagnostics at `CatalogPreviewDataStage.tsx:53` (nullable `FieldValue`) and `jsonjoy-type-editor.ts` (missing declaration for the dependency's `TypeEditor` module).
  - Classification: removed the duplicate, paused component-token label-after-undo assertion from `token-tables.test.tsx`. It tested the legacy DocumentFile inspector; `ComponentTokensPanel` has no product imports, and current `PropertiesPanel` renders the Catalog inspector. The separate paused `component-tokens.test.tsx` remains for individual review; no product behavior or Core compatibility code was removed.
  - Classification: `save-state.test.ts` only tests per-FlatDocument JSON baselines; its implementation was imported only by `session/save.ts`. `session-save.test.ts` only tested `persistEditorJsonSave`, and `session/save.ts` had no production importers. The Catalog session explicitly refuses individual DocumentFile load/save commands, so these suites did not represent current project persistence (owned by `connectProject`/Core catalog persistence). Removed these unreferenced legacy helpers and isolated tests. The follow-up product-path audit removed the nonfunctional DocumentFile Open action and loader, as recorded in the project/session cleanup entry below; current project and asset Open actions remain Catalog-backed. No shim or Catalog-to-FlatDocument conversion was added. The full workspace suite passes 24 files / 95 tests. Editor typecheck remains blocked by its two existing diagnostics (`CatalogPreviewDataStage` FieldValue nullability and the missing `jsonjoy-builder` declaration).
  - Completed safe cleanup: delete `apps/editor/test/fixtures/example-catalog.test.ts`, which tested only the removed v1 JSON enumerator. The shared v1 fixture builder has since been removed after its last consumer was migrated or retired with evidence.
  - Classification (completed): removed the unreferenced `controls/instance` group, its instance-only CSS, `domain/schema/structural-item-choices.ts`, the unused `parseInstanceFieldValue` wrapper/tests, and the FlatDocument-only directives editor with its paused tests. Their only imports were internal composition, barrels, and those tests; the APIs took `DocumentFile`/`FlatDocument` and modeled `fieldBindings`, instance variant overrides, display/repeat directives, and structural component traversal, with no active Catalog editor route or Catalog data contract. Kept `fieldTypeOptions`, shared `parseFieldValue`, `fieldPathOptions` for active event editing, current Catalog field exposure, schema-backed preview editing, structural item controls, and Core's current schema resolution. No compatibility shim or Catalog-to-FlatDocument adapter was added. Source import audit and scoped detector show no leftovers or size candidates; focused/full validation is recorded with this cleanup result.
  - Result: removed those paused legacy UI tests instead of porting tests for unreachable `FlatDocument`
    behavior. The active event-binding suite remains included. Full host-context `pnpm test` passes
    40 files / 137 tests. Editor typecheck reaches TypeScript and reports only the known
    `CatalogPreviewDataStage` FieldValue-nullability mismatch and missing `jsonjoy-builder` type
    declaration; neither diagnostic points to the changed files.
  - Classification: replaced `properties-tabs.test.tsx`'s 16 test cases over the old `EditorShell`/DocumentFile properties UI with a Catalog-backed test of the active inspector tabs and Properties content. The old assertions targeted retired token, variant, layout, manual CSS, and viewport inspector surfaces; current-model tests cover active preview data and HTML attributes. The old viewport-context assertions have no corresponding active viewport inspector fields. This removes one consumer of the old fixture helper without changing product behavior.
  - Classification: removed `component-tokens.test.tsx`, which exclusively exercised the unmounted `ComponentTokensPanel` over DocumentFile component-token records. The panel has no product imports, and the test was paused; Core component-token contracts and current global token editing remain untouched.
  - Completed removal: `ComponentTokensPanel.tsx` had no imports anywhere in Editor source/tests; its paused test was removed because it only exercised the retired DocumentFile inspector.
  - Action: deleted this unreachable legacy UI. Keep Core component-token contracts and current global token editing intact; do not add a forwarding component or compatibility wrapper.
  - Contracts: no active product imports or reachable UI behavior change. Do not modify `@facadeur/api`, `api-client`, `store-yjs`, or the token compatibility package.
  - Validation: source/test import audit found no consumers; root suite passes 37 files / 128 tests. Editor typecheck retains only the two previously documented diagnostics (`CatalogPreviewDataStage` FieldValue nullability and missing `jsonjoy-builder` TypeEditor declaration). Candidate detector reports no size candidates; `git diff --check` passes.
  - Classification: retiring paused tests that imported the old `LayoutPanel`/`StyleInspector` surfaces: `grid-context`, `grid-edits`, `layout-variant-context`, `self-alignment`, `sizing-context`, `style-inspector-context`, `instance-token-labels`, and `instance-style-editor`. Import audit confirms these inspector components have no product callers; the tests instantiate their DocumentFile-backed UI directly, and the current `PropertiesPanel` routes catalog definitions to `CatalogNodeInspector`. Current layout-control, viewport, and global-token tests remain. The shared fixture helper is reduced to three remaining consumers (`instance-context`, `session`, and `shell`); no Core token or responsive-style contract is changed.
  - Migration: replaced `session.test.ts`'s DocumentFile variants and JSON persistence cases with current Catalog session coverage for workspace filtering and zoom reset. The legacy nested-variant inspector test in `instance-context.test.tsx` has no corresponding `Node`/`NodeDefinition` representation or active inspector behavior and was retired; the current Catalog model has no instance-node reference or variant rules. The fixture helper is now used only by the paused legacy `shell.test.tsx` pending shell migration.
  - Migration: rewrote `shell.test.tsx` around `createExampleCatalog()` and the current shell navigation contract. Preserved viewport-height/scroll CSS and a shell render on the active Colors surface; legacy document-save, variant viewport overrides, and instance breadcrumb assertions have no current catalog-shell path. Added the migrated shell and Catalog session suites to the root allowlist. Import audit found no consumers of the old fixture helper, so the v1 example enumerator, conversion helper, and invented fallback schema were deleted.
  - Classification: removed paused `structured-options.test.tsx`, which imported an old JSON fixture and tested `InstanceFieldOverride`/`EditorShell` instance behavior. `InstanceOverridesControl` is only composed by the unmounted legacy `ContentPanel`; the file also referenced the deleted fixture function without importing it. The active Catalog inspector and shared `@facadeur/form` fields retain their current coverage.
  - Migration: re-enabled the pure `color-control`, `border-control`, and `shadow-control` value suites. They exercise current editor value functions and use canonical token IDs from `@facadeur/examples`; repaired the stale undefined color-test UUID reference with the existing accent token fixture. Focused runs exposed that Color/Shadow recognized the retired path-style token syntax while current fixtures and Core use `{token:<UUID>}`. Update those two value parsers to the canonical UUID reference contract and retain custom CSS handling; do not add a legacy matcher or conversion shim.
  - Validation: focused suites and the root workspace suite, Editor typecheck, formatting, scoped candidate detector, and `git diff --check`.
  - Result: Color and Shadow now use Core's `tokenReference` parser, removing duplicate token syntax and correctly identifying current UUID references. Focused tests pass 19/19, Editor typecheck passes, and root tests pass 50 files / 175 tests. Formatting, detector, and diff checks pass.
  - Additional migrated behavior: `project-client.test.ts` now covers Catalog load/change/save;
    `connectProject` consumes only current project/catalog fields and the forwarding save wrapper is
    removed. Project diagnostics no longer accept unused DocumentFile/schema/command metadata. Token
    color suggestions use Core's case-insensitive custom-property semantics, and font/selection
    suites exercise current Catalog identities.
  - Final verification: all remaining Editor test files are present in the root Vitest allowlist;
    repository search finds no `example-catalog` fixture helper or Editor tests naming
    `DocumentFile`/`FlatDocument`. `pnpm test` passes 71 files / 253 tests and `pnpm typecheck`
    passes all 11 configured workspace projects in the approved host context. No v1 fixture or
    conversion shim was restored.

- [x] Refactor: remove synthetic FlatDocument projections from the active Catalog session.
  - Evidence: `EditorSnapshot.design` was a fabricated `FlatDocument` carrying only Catalog tokens,
    icons, and breakpoints plus empty nodes/fields/variants. Core's design command path converted
    Catalog data to this placeholder and back so it could reuse legacy document commands.
  - Action: expose only Catalog-backed design fields in the Editor snapshot, apply global token and
    breakpoint commands directly to `ProjectCatalog`, and remove the bridge and unused FlatDocument
    breakpoint helper. Migrate token-preview tests to the current design data shape.
  - Scope: current no-shims cleanup; preserve reachable Catalog selection, layer editing, and stage
    behavior. Keep API/API-client and Store Yjs untouched.
  - Contracts: Core remains the only owner of Catalog mutations; preserve active selection and
    layer operations, and do not change persisted Catalog shapes.
  - Validation: Catalog session/layer/stage behavior tests, Editor typecheck, import audit, detector
    rerun, and `git diff --check`.
  - Progress: active Catalog Properties/Layers titles and shell chrome now read the design slice
    or `openDefinition`; shell delete and wrap keyboard actions use Core UUID tree operations.
    Added shell regression tests for delete, wrap, and keyboard nudging; Stage selection, placement,
    and iframe rendering were subsequently migrated to Catalog nodes and React portals.
  - Completed current navigation migration: `useEditorNavigation` now validates Catalog layer UUIDs
    against `openDefinition`, validates breakpoints against Core's active global breakpoints, and
    canonicalizes unsupported legacy `variant` query state away. The former dormant v1 URL test now
    uses `createExampleCatalog()` and checks valid deep links, invalid UUID fallback, unrelated query
    preservation, and URL updates when selection changes. It is included in root Vitest.

  - Completed insertion-policy migration: the active context menu now derives choices from the
    open Catalog definition kind and reusable Catalog assets in `domain/catalog/catalog-layer-insert`;
    Core remains the sole mutation owner. Migrated the former FlatDocument policy tests to current
    Catalog fixtures and enabled them in root Vitest. Removed the unreferenced FlatDocument
    `LayerContextMenu`, its actions, and the old `layer-insert-policy`; the active insertion choices
    and nesting-rule filtering are preserved. Focused layer/shell suites pass 10 tests. Remaining
    snapshot consumers still need classification before `document`/`activeDocument` can be removed.
  - Classified nested selection: the active Catalog snapshot always supplied `nestedSelection: null`,
    and only the unmounted `PropertiesPanel` placeholder and deprecated `NestedStyleInspector` read
    it. Removed that dead route and its shell guard; active properties now depend only on the open
    Catalog definition. The old nested-selection resolver, inspector, and their DocumentFile-only
    tests have no active consumers and are retired without adding a Catalog adapter.
  - Classified the remaining sidebar inspector tree: the active `PropertiesPanel` routes to
    `CatalogNodeInspector`; old `ContentPanel`, `StyleInspector`, `LayoutPanel`, variant tabs,
    viewport override controls, and root token override UI only imported one another. Their tests
    use DocumentFile fixtures and are not in the current root Vitest allowlist (the nested inspector
    suite is skipped). Remove this unreachable UI and tests rather than retaining dead shim routes.
    Retain `CssDeclarationsControl` for its active Storybook story. The standalone `LayoutControl`
    and `SpacingControl` have no product or Storybook callers; their only callers are their own
    legacy-model tests. The `layout-capabilities` contract is likewise used only by these controls
    and the unused optional capability prop on `CssDeclarationsControl`.
  - Ownership: `LayerItem` is consumed by the Catalog layer tree, insert policy, and layer UI, but was
    declared beside deprecated FlatDocument selection traversal. Move that structural type to the
    Catalog layer-tree module and remove the unreferenced legacy hit/layer projection functions;
    keep the separate iframe `SelectionController`, which is active in Stage pointer interactions.
  - Next boundary: the source import audit finds no product reads of `EditorSnapshot.document`,
    `activeDocument`, or the old inspector/undo/chrome fields. Remove those fields and the empty
    FlatDocument placeholder; preserve the actual Catalog `openDefinition`, design slice, and
    selection fields. Keep old DocumentFile-only tests out of the maintained suite or migrate tests
    whose behavior still has a current Catalog equivalent.
  - Further audit: the ProjectTree's variant rows have no supplied Catalog data, its context-menu
    variant action is hard-disabled, and the session action refuses the command. Remove only this
    unreachable presentation and its no-op callbacks/tests; preserve Core's current variant model
    and style/codegen contracts.
  - Session contract cleanup: `EditorSession` still exposes `DocumentStore` operations, flat
    document commands, legacy save metadata, `DesignInput`, and methods whose Catalog
    implementation returns empty lists or `false`; source imports show no consumers except the
    token panels reading the always-empty `boardDocuments()`. Remove these unused session
    contracts and the redundant empty-list reference checks, retaining the active `executeDesign`
    path and Core-owned Catalog persistence. Keep undo/redo only if a Catalog history owner exists;
    otherwise remove the nonfunctional hotkey callbacks. The visible `Open` action opened a legacy
    DocumentFile that the Catalog session refused; remove that action, its JSON file reader, and
    its DocumentFile-only tests as approved. Keep the current Catalog export and save actions.
  - Asset-tree stubs: `catalogAssetSummaries` never supplies groups and the group dialog only
    returns a “not available” notice. Remove that dead menu/dialog and its DocumentFile-only test;
    keep Catalog rename/delete and per-kind browsing.
  - Progress: removed the Catalog snapshot's empty FlatDocument and obsolete inspector/undo/chrome
    fields, replaced the unreachable drill breadcrumb with a title, and removed its refusal methods.
    Removed disabled asset-group/variant menu paths and their old DocumentFile UI tests. Migrated
    asset rename and context-menu interaction tests to `createExampleCatalog()` and added them to
    the maintained Vitest allowlist. Updated Catalog design tests to assert direct token and
    breakpoint records.
    Removed the nonfunctional legacy `Open` action, its DocumentFile loader/session contract, and
    its format-only test; retained Catalog export/save. Removed the empty `boardDocuments()` token
    reference guard; current design-token reference checks remain.
  - Validation: source import audit finds no synthetic snapshot/document, design bridge, drill,
    group, or variant UI references. Core design and Editor token-preview tests pass; the full root
    suite passes 42 files / 145 tests. Core and Form typechecks pass; Editor typecheck reports only
    the known `CatalogPreviewDataStage` nullability mismatch and missing `jsonjoy-builder`
    declaration. Final detector, formatting, and diff checks pass.

## Standalone generated workspace (2026-10-06)

- [x] Extract React workspace scaffolding before changing CLI output.
  - Evidence: generated UI/Storybook/Next manifests belong to the source workspace and runtime tests resolve React through Storybook. Bootstrap configuration changes independently of component rendering. The detector found no size candidates; existing React engine modules remain cohesive.
  - Boundary: private `engines/react/src/workspace/` owns templates and workspace assembly; CLI owns validation/writing, component generation stays unchanged. Move maintained demo configuration into templates and remove internal generated packages.
  - Contracts: preserve React exports, schemas, styles, stories and legacy `--out`/`--storybook`; add `--workspace` with optional Next sample. Preserve staging and document data.
  - Validation: workspace CLI regeneration/preservation tests, React runtime tests, source typecheck, standalone install/typecheck/Storybook build, detector rerun.

Result: `pnpm codegen` writes an independent ignored `dist/facadeur` pnpm workspace. Bootstrap templates own UI/Storybook configuration and the optional Next demo; internal generated packages and their lockfile importers are removed. Runtime tests resolve React through codegen itself. Legacy component-only CLI modes remain supported. Independent install, source and generated workspace typechecks, Storybook production build, 77 generator/preview tests, scoped ESLint and formatting pass. The detector still reports only the cohesive 12-module React engine directory. Prior output was backed up under `.facadeur/output-migration-2026-10-06`; staging was preserved.

Event implementation scope: extract reusable schema selection before extending event editing; Core owns canonical legacy/data schema resolution, binding validation and persistence, the editor owns reusable controls and command routing, React codegen owns DOM event envelopes and native form defaults. Source event definitions stay serializable, callbacks derive from declarations, explicit forwarding and Undo remain intact. Review the canonical Core API across workers before integration; migrate only the existing FormInput event example and regenerate output. Validation will include focused Core/adapter/editor/generator tests, schema export, source/generated typechecks, standalone build and a browser interaction check.

React event ownership review: `component/catalog.ts` currently builds flat event callback types; `render/event-attributes.ts` owns native extraction; `print.ts` and `data-contracts.ts` own emitted contracts; `render-instance.ts` owns forwarding. Retain these cohesive boundaries and share Core schema/mapping resolution, preserving the native event envelope, typed data and explicit forwarding. No generic runtime library or unrelated split is needed.

## Structured form options and choice groups (2026-10-06)

Select already declares typed option items, but bound/instance field editors fall back to raw
JSON. Reuse the existing SchemaValueForm for structured arrays and objects. Extract Core's
existing field-to-JSON-schema conversion from data-contract validation as a focused public
contract helper; validation and editor consume the same conversion. Preserve unsupported raw
JSON editing as an advanced fallback, existing validation, overrides and binding semantics.
Add declarative Radio group and Checkbox group components with labeled options, preserving
the existing single-input atoms. Options add an optional checked flag for initial selection.
Colocate their labeled-option components in the form examples; the existing repeater and
instance data mappings render rows without adding generator-specific component behavior.
Validate edits/add/remove, generated contracts/native controls, starter upgrades and source types.

## Derive example references from definitions

The manually maintained `EXAMPLE_CATALOG_IDS` duplicates node and schema UUIDs already owned
by their typed definitions. Build catalog maps from imported definitions and derive external
references from the exported definitions/schema identity. Preserve the API seed UUID exports
and Storybook selection behavior. Validate examples and API consumers, Storybook build, and
the scoped refactor detector; no persisted IDs change.

## Give every stable UUID one source

- [x] Centralize static UUID declarations and use package-local `idList.ts` exports.
  - Evidence: the initial scan found 1,323 UUID literal occurrences across TypeScript files,
    representing 323 values; 750 occurrences were in `packages/examples/src`. Component node IDs,
    global token IDs, and test references repeated the same UUID strings, including duplicate map
    keys and record fields.
  - Action: define node/schema identities beside each Example module, token identities beside the
    token catalog, and breakpoint identities beside global styles. Import these IDs wherever the
    same identity is referenced. Replace real fixture UUIDs in tests with public Example IDs and
    keep intentionally synthetic test identities local/generated. Keep the Catalog UUID-keyed
    shape unchanged.
  - Scope: prerequisite refactor for reliable static Example data and UUID-based style references.
  - Contracts: preserve every prior UUID value, serialized reference, map key, Catalog shape, and
    runtime behavior. Examples remain independent of Core; Core imports only the Example ID
    subpath for its stable default breakpoint identities. Do not generate Example IDs at runtime
    or change Forms.
  - Validation: `node scripts/check-uuid-uniqueness.mjs` confirms all 276 static UUIDs occur once
    and are declared only in Example `idList.ts` files. Example and Core typechecks pass using the
    local TypeScript compiler. The authoritative workspace install/typecheck remains blocked
    because Corepack cannot fetch pinned pnpm 10.33.3 in this environment; see `docs/friction.md`.
    The scoped detector was rerun; its remaining cohesive Example file and documented codegen
    organization candidate were retained.

## Share the editor subnav with its Storybook story

`EditorShell` currently owns the subnav markup inline, while the Header story omits it. Extract the
subnav into the shell UI as a focused component and render that same component in both places.
Preserve the existing surface ids, active state, accessible labels, and Settings-to-colors fallback.
Validate the scoped detector, formatting, editor typecheck, and Storybook rendering when the local
Storybook toolchain is available.

## Add external autocomplete suggestions to inspector records

The reusable form record control currently has plain key/value inputs, so CSS editing offers no
help when adding declarations. Add optional key suggestions and value suggestions keyed by the
current key to the generic record field config. Keep suggestions optional and allow arbitrary
values; the editor supplies them, and `@facadeur/form` stays free of CSS vocabulary. For the
inspector, derive suggestions from existing project catalog styles so they stay in step with
actual project data. Validate package/editor types, detector, and Storybook where the local runtime
allows it.

## Replace the form class-list field with generic chips

`packages/form/src/fields/class-list` duplicates the chip collection behavior in
`packages/form/src/fields/chips`, while Core already supplies the class suggestions and values.
Map inspector class lists to the generic `chips` config, remove the duplicate package field and
its dispatch/public exports, and preserve Core's `classList` inspector contract. The editor's
older `ClassListInput` remains a separate migration candidate because it is owned by the legacy
schema form. Validate form/editor typechecks, detector, formatting, and diff review.

- [x] Refactor: migrate the legacy editor class-list input to the shared chips field
  - Evidence: `apps/editor/src/ui/form/components/selection/ClassListInput.tsx` repeats chips,
    free-form input, suggestions, and removal behavior outside `@facadeur/form`.
  - Action: when replacing the legacy schema form, use the public `@facadeur/form` chips control
    and remove its local component and `.eu-class-list` styles.
  - Scope: current cleanup goal.
  - Contracts: preserve class-token split/add/remove behavior and suggestion filtering.
  - Validation: editor typecheck, relevant form stories, detector, and diff review.
  - Result: editor consumers and the Storybook component story now use `@facadeur/form`'s
    `ChipsField`; the duplicate control and unused `.eu-class-list`/`.eu-class-badge` styles were
    removed. Existing editor typecheck diagnostics remain unrelated to this field.

## Keep new record rows stable while editing

`packages/form/src/fields/record/RecordField.tsx` commits a draft from the key input's blur
handler. Moving focus from the key to the value therefore commits and removes/recreates the row
mid-interaction, which can drop focus and send subsequent typing to the wrong control. Keep draft
identity explicit, commit only after focus leaves the whole row, and preserve the row id when it
moves from draft state into the stored record. Preserve existing-value editing, bind controls, and
record serialization. Form typecheck, formatting, detector, and diff check pass. Manual Storybook
interaction is still needed when its server is available; the current page reports a lost
connection and localhost refused the check from this process.

## Suggest bindable properties in record value fields

`RecordField` receives bindable property options. Keep CSS value suggestions in the text input's
datalist, and expose design props through the same explicit bind mode used by other CSS values:
the bind button switches to a select whose options show prop names. Do not mix prop references into
the native datalist, which does not expose a discoverable dropdown consistently. Preserve draft
row identity and the string-based record contract. Form typecheck, formatting, detector, and diff
check pass. Storybook interaction remains to be confirmed after its server reconnects.

## Reuse the labeled token picker pattern in generic forms

The editor already has a searchable, labeled token picker (`TokenValueControl`), while
`@facadeur/form` comboboxes and record suggestions use native datalists that cannot present rich
labels or a discoverable option list. Extract the picker interaction into a generic form control
whose option records, labels, groups, and direct-value behavior come from callers. Use it in
`ComboboxField` and `RecordField`; the editor supplies CSS values, design-token references, and
bindable prop references. Keep token parsing/resolution and token-specific preview out of the
form package. Preserve existing scalar values and record serialization. Validate package/editor
The form package typecheck, Prettier check, refactor candidate scan, and diff check pass. The editor
typecheck remains blocked by existing errors in nested API/core dependencies and legacy editor
forms; it reports no errors in the changed inspector service. Storybook is disconnected in the
current browser session, so its visual interaction remains unverified.

## Keep autocomplete popovers inside their field area

The generic autocomplete popover is clipped by the inspector's `.side-scroll`, which must remain
scrollable. Position the popover against the viewport while keeping it in the field subtree so
record-row focus behavior remains intact. Preserve scrolling, option selection, and direct-value
behavior. Validate formatting, form typecheck, detector, and diff check; inspect the current
Storybook page if its connection is available.

## Use component data as inspector suggestions

`CatalogNodeInspector` currently shows both the definition's preview defaults and the selected
node's effective schema data in its Preview data tab. Keep the schema defaults in the Schema view,
show only the node data section here as Component defaults, and use those component values as
labeled autocomplete suggestions for record values. Keep the values literal and preserve existing
schema and node-data write paths. Validate editor/form typechecks, formatting, detector, and diff
check; inspect Storybook if available.

## Reconcile catalog previews in stable iframe roots

`useStageViewportBoard` currently rebuilds the board for every `designRevision`, and the v2
board replaces each iframe body with a fresh DOM tree. Add a portable Core predicate for HTML
void elements and an editor-only React adapter for `ElementBuildConfig`; keep iframe/style-engine
lifecycle separate and update stable React roots with `nodeUuid` keys. Preserve the generic DOM
renderer and its public contract. Validate void-tag semantics, adapter behavior, form/editor types,
Storybook, and the refactor detector.

## Add bindable text content to catalog elements

Give element text content its own `dom.text` value, separate from HTML attributes and arbitrary DOM
properties. Resolve literal values and stable prop references through the existing preview pipeline;
surface a bindable Text content control in the inspector; keep React responsible for text children.
Bind the Card mock's eyebrow, title, and body nodes to their schema prop IDs. Preserve legacy
`textContent` values as a read fallback while removing them from imperative React property writes.
Validate catalog schema, binding resolution, inspector editing, React updates, and renderer parity.

Follow-up: `{token:uuid}` is currently emitted literally in preview text because Core resolves
property references there but does not resolve stable token IDs. Resolve token IDs to their current
token values for text preview, so token renames keep bindings intact and the canvas shows authored
content. Keep stable IDs in the document and leave CSS/style token resolution unchanged. Validate
stable-ID lookup, token rename, missing-token fallback, and editor typecheck.

Follow-up: keep HTML attribute names as direct text inputs. Use a declarative transformable field
configuration whose generic option groups are supplied by the editor for bindable text and record
values; `@facadeur/form` owns the control, filters empty prop/token groups, and shows the transform
button only when there is more than one available mode. Keep prop/token choices and binding syntax
in the editor.
Preserve the record string contract, CSS key suggestions, and existing autocomplete for other
records. Validate form/editor types and focused Storybook interaction.

Follow-up: the screenshot's `TokenValueControl` mixed direct-value editing and token selection in one
clunky popover. Replace it with a selection-only autocomplete in `@facadeur/form` that shows each
supplied option's label and example, and can only emit one of the supplied option values. Use it for
transformable prop/token modes and token selection in `TokenValueControl`; keep direct text editing
as a separate input where allowed. Replace the old general `AutocompleteField` with plain text
inputs plus native datalist suggestions for editable fields such as records and comboboxes. Preserve
stable prop/token references as stored values and keep option construction in the editor. Validate
form/editor typechecks, selection-only value semantics, and the refactor detector.

## Backlog: split the form-controls section DOM fixture

The refactor detector reports `packages/examples/src/form-controls-section/dom.ts` at 526 lines.
Review completed: retain it as one canonical static Catalog definition. Its sections share one
stable-ID namespace and present related form controls as a single example; splitting static node
data would add fragment indirection without reusing behavior. Preserve the exported definition and
Catalog preview behavior.

## Refactoring backlog: recent editor changes

Backlog: the scoped detector also reports `apps/editor/src/ui/sidebar/properties/layout/LayoutPanel.tsx`
(510 lines), `content/ContentPanel.tsx` (481), and `style/declarations/declaration-editor.tsx` (478).
These are outside this text-field task; review whether layout composition, content editing, or style
declaration editing have independently changing responsibilities before splitting them. Preserve
their inspector behavior and command contracts, and validate the relevant panel interactions after
any future boundary change.

The text binding adds one mutation method to `packages/core/src/controller/project/controller.ts`
(470 lines after the change). Retain it there: the class already owns the corresponding catalog
node mutations and inspector dispatch; extracting only this operation would split the same
responsibility without changing ownership or improving validation.

## Keep catalog model types in domain

- [x] Refactor: publish `NodeDefinitionModel` and `ProjectCatalogModel` from `@facadeur/domain`.
  - Evidence: their structural definitions already live in `packages/domain/src/node.ts` and
    `catalog.ts`, while `api-client` imports the names through `@facadeur/core`.
  - Action: export the model aliases from Domain, keep Core's existing re-exports as compatible
    forwarding exports, and point `api-client` directly at Domain.
  - Scope: current package-boundary correction.
  - Contracts: preserve both model shapes, Core public exports and API request/response behavior;
    no runtime or persistence changes.
  - Validation: domain, core, API and API-client typechecks pass; workspace typecheck reaches only
    three unchanged Editor errors (`SchemaForm.placeholder`, nullable `FieldValue`, and missing
    `jsonjoy-builder` declarations). Detector and diff check pass; no tests run.
  - Result: aliases now live in Domain; Core forwards them for existing imports, the API contract
    reads the catalog type from Domain, and `api-client` no longer directly depends on Core. No
    model shape, runtime behavior or persisted data changed.

- [ ] Backlog: review server module boundaries in `packages/api/src/server/project/files.ts` and
      `management/service.ts`, flagged by the candidate detector. Keep this separate from the type
      ownership change; preserve file persistence and management behavior if a future split is justified.

- [x] Refactor: keep token behavior tests with Core ownership
  - Evidence: at the time, `packages/tokens/test/parse.test.ts` and `roundtrip.test.ts` tested UUID token
    resolution, breakpoint semantics, canonical document serialization, and Core token commands,
    while token behavior already belonged to Core; the facade has since been removed.
  - Action: move both suites to `packages/core/test`, import Core APIs from Core, and retain shared
    fixture data from `@facadeur/examples/test-support`. Keep every existing assertion.
  - Scope: current package-ownership cleanup.
  - Contracts: preserve token UUID identity, reference validation, breakpoint overrides, canonical
    serialization, and command behavior; no runtime or persisted data changes.
  - Validation: Core typecheck, both suites pass in CMD (10 tests total), detector, and
    `git diff --check` pass. Parse tests now supply the semantic tier extension they verify and
    compare the font's stored fields while allowing Core's indexed metadata. AJV UUID-format
    warnings are non-fatal. The event binding test separately passed in CMD (2 tests).

- [x] Docs: align refactoring ownership guidance with current package boundaries
  - Evidence: `docs/refactoring-checklist.md` assigns token resolution to Core and CSS output to
    Style Engine; `packages/domain/src/index.ts` uses type exports.
  - Action: update the checklist to assign token indexing/resolution to Core, stylesheet output to
    Style Engine. Keep Domain type-only.
  - Scope: current architecture cleanup.
  - Contracts: documentation-only; no code, runtime, or package API changes.
  - Validation: compared package README ownership statements and inspected Domain's type-only
    index; detector and diff check pass.

- [x] Refactor: remove the deprecated `@facadeur/tokens` shim.
  - Evidence: its implementation only forwarded Core and Examples exports; its remaining consumers
    were API and Store Yjs, and the user explicitly authorized migrating those imports and workspace
    dependencies for shim removal.
  - Action: import token resolution from Core and project fixtures from Examples; delete the facade,
    package dependency edges, and test alias.
  - Scope: token ownership cleanup; only the imports and package manifests in API and Store Yjs
    changed, with no changes to their runtime logic or persistence.
  - Contracts: preserve token resolution, starter catalog contents, and Yjs store validation.
  - Validation: `pnpm install --lockfile-only --offline --ignore-scripts` completed and removed the
    workspace package/dependency edges. API, Store Yjs, Core, and Examples typechecks pass; the
    focused Store Yjs design suite passes 4/4; root tests pass 37 files / 128 tests. No source,
    package manifest, lockfile, or Vitest config imports remain; detector reports no size candidates
    on changed paths and `git diff --check` passes. Workspace typecheck reaches all packages; only
    Editor's two already documented diagnostics remain (`CatalogPreviewDataStage` FieldValue
    nullability and missing `jsonjoy-builder` TypeEditor declaration).

- [x] Refactor: remove unused project starter lists from Examples
  - Evidence: `starterAtomIds` and `starterFormIds` had no consumers, while `docs/dsl.md` claimed
    the disabled project generator used them to add catalog assets to new projects. The active
    `createProjectTemplate()` only supplies shared design tokens, icons, and breakpoints. The
    removed `packages/tokens` package also retained a tracked, unreferenced `tsconfig.json`. The
    DSL docs also implied the deleted React codegen engine remained importable.
  - Action: remove the dead starter-list exports and orphaned config, correct the template and
    codegen docs, and mark `createProjectTemplateDocument()` deprecated while API and Store Yjs still
    consume that legacy seed.
  - Scope: Examples contract cleanup; no catalog definitions or generated-project behavior change.
  - Contracts: retain the current catalog fixtures and the DocumentFile seed until its remaining
    API/Store Yjs consumers migrate; new Catalog code should use `createProjectTemplate()` or
    `createExampleCatalog()`.
  - Validation: source import audit, Examples and Style Engine typechecks, focused template tests,
    detector rerun, and diff check.

- [x] Refactor: remove deprecated renderer integrations from Style Engine tests
  - Evidence: `packages/style-engine/test/engine.test.ts` combines stylesheet compiler/runtime
    tests with multiple `createDomRenderer` + Store Yjs integration cases. Both compatibility
    packages were only test-time Style Engine dependencies; the Editor canvas uses React.
  - Action: keep compile and direct stylesheet-runtime assertions in Style Engine; drop cases that
    exercise the deprecated DOM renderer or Yjs store there, then remove their test-only package
    dependencies. Leave Renderer DOM and Store Yjs source and package APIs untouched.
  - Scope: current ownership cleanup; deprecated integration tests only.
  - Contracts: no runtime or user-visible behavior changes. Keep existing Core/Style Engine
    compiler tests and active React canvas behavior.
  - Validation: Style Engine typecheck, focused tests, Renderer DOM coverage review, detector, and
    diff check. The three Style Engine suites were added to the root Vitest allowlist after CMD
    confirmed they were otherwise not discoverable; final CMD run passes all 24 tests.
  - Result: removed six renderer+store cases and the test-only package edges; compiler and direct
    runtime tests remain. The deprecated DOM renderer package and its paused legacy suites were
    later retired; active canvas behavior remains in React tests.

- [x] Refactor: retire unmounted flat-document schema UI
  - Evidence: `SchemaStage`, `SchemaLibraryStage`, and `SchemaUseControl` are not imported by the
    active Editor shell. The old screens edit flat-document `schemaUse` and `schemaCatalog`; active
    schema editing now uses `CatalogSchemaStage` and `CatalogSchemasPanel`. The old schema screen,
    composition UI, and defaults form are held only by paused tests. `ComponentEvents` and the
    shared event schema selector remain active in the properties inspector.
  - Action: remove the unmounted screens and UI-only composition/default-preview widgets plus tests
    that only verify those deprecated screens. Preserve Core's flat-document compatibility,
    schema migration/recovery code, active event controls, and catalog schema editing. Update the
    event controls test to render the still-active `ComponentEvents` directly. Rename the shared
    schema editor stylesheet to reflect its active consumers.
  - Scope: current deprecated UI cleanup; no migration or persistence removal.
  - Contracts: no document-format or runtime-preview change. Keep stored flat `schemaCatalog` and
    `schemaUse` data readable, preserve migration/recovery, and preserve event editing semantics.
  - Validation: full root test suite, Editor/Core typechecks, source import audit, candidate
    detector rerun, and `git diff --check`. Editor typecheck diagnostics already present before
    this cleanup must be reported separately.
  - Result: removed the obsolete `SchemaStage`, `SchemaLibraryStage`, `SchemaUseControl`, and
    `SchemaPreviewForm` surfaces plus their paused stage-only tests and old global preview styles.
    Preserved active `ComponentEvents`, event schema selection, and flat schema data/default
    resolution. Moved active schema styles into
    `ui/schema/schema-editor.module.css`. Root tests pass 21 files /
    86 tests. Editor typecheck still reports only the existing nullable `FieldValue` mismatch and
    missing `jsonjoy-builder` declaration. The source audit, detector, and diff check pass.

- [x] Refactor: retire the disconnected Editor localStorage schema-library shim
  - Evidence: no maintained product source uses the Editor's localStorage `schema-library` store;
    the only runtime import was the deprecated migration module, which is excluded from Editor
    typecheck and whose `EditorSession.documentStores()` now returns an empty list. Its dormant
    migration suite failed 6 of 8 cases against the current session/data model. Active event schema
    pickers only need Core's `NamedSchema` contract.
  - Action: remove the unreachable localStorage CRUD/composition store, its uncallable migration,
    and tests that only exercise that retired path. Reuse `@facadeur/core`'s `NamedSchema` type in
    active event schema selectors. Preserve Core flat-document `schemaCatalog`/`schemaUse` data and
    its runtime resolver/default compatibility; do not modify API or API-client.
  - Scope: current dead-shim cleanup; no persisted project data rewrite.
  - Contracts: do not clear browser storage or alter document serialization; active catalog schema
    editing and event selection remain unchanged.
  - Validation: full root tests, Editor typecheck, import audit, detector, and diff check. Editor
    typecheck's known unrelated diagnostics remain recorded.
  - Result: removed the unused localStorage CRUD/composition modules and their dormant migration
    tests after confirming the migration could not run with the current EditorSession. Root tests
    pass 21 files / 86 tests; Editor typecheck retains only its two known unrelated diagnostics.
    The old `facadeur.schema-library.v1` key is not cleared, but no maintained Editor code reads it.
    Core flat-document schema data and all API reconciliation logic remain untouched.

- [x] Refactor: remove the deprecated DocumentFile React code generator
  - Evidence: every export from `@facadeur/codegen/engines/react` is annotated deprecated and
    accepts the legacy Core `DocumentFile` model. The root `pnpm codegen` command is disabled,
    there are no product imports or maintained tests for this engine, and the Editor's active
    Catalog Code view uses Core build configuration instead.
  - Action: remove the old React engine implementation, templates, export, and Vitest alias. Keep
    `@facadeur/codegen` as the designated owner for future catalog-to-project generation, but
    leave generation disabled until that catalog implementation is built.
  - Scope: current deprecated-code cleanup; no catalog-generation feature work.
  - Contracts: preserve current Editor behavior and the disabled root command. This removes the
    private deprecated engine subpath; do not change API/API-client or Store Yjs.
  - Validation: source-import audit, workspace install/lockfile consistency, root tests,
    typecheck, detector rerun, and `git diff --check`.
  - Result: removed the engine implementation, templates, CLI, package export, and Vitest alias;
    `@facadeur/codegen` remains a dependency-free workspace placeholder for the catalog-driven
    implementation. Lockfile updated, no old engine imports remain, and root tests pass 21 files /
    86 tests. Workspace typecheck still reports only the two known Editor diagnostics. Root lint
    is blocked by an unused variable in the protected API test; scoped lint for this cleanup passes.

- [x] Refactor: remove the completed Core legacy-import repair script
  - Evidence: `scripts/fix-legacy-flat-imports.mjs` rewrites imports after a completed directory
    move; no package script, docs workflow, or other source invokes it.
  - Action: delete the one-off migration script after verifying the current import paths; retain
    the general extensionless-import maintenance script.
  - Scope: current deprecated-tool cleanup.
  - Contracts: no runtime/package behavior; no API/API-client source changes.
  - Validation: repository import audit, script lint, detector, and diff check.

- [x] Refactor: remove the unreferenced legacy viewport layer panel
  - Evidence: `ViewportLayersList` and `ViewportOptionsPanel` have no source or test imports. The
    active viewport editor is `ViewportsSettingsPanel`, and viewport selection/chrome editing is
    handled by the current stage/inspector. The dead panel also contains its own viewport-creation
    path alongside the active design panel.
  - Action: delete the unreferenced old panel and keep the active design and inspector workflows.
  - Scope: current dead-UI cleanup; no viewport data or stage behavior changes.
  - Contracts: preserve current breakpoint editing, stage selection, and preview chrome behavior.
  - Validation: import audit found no remaining panel consumers, detector reports no size
    candidates, and the user's full test suite passes 21 files / 86 tests. Editor typecheck retains
    the two documented unrelated diagnostics; diff check passes.
  - Result: removed the old viewport layer panel; current breakpoint editing and stage selection
    remain in their active design and inspector owners.

- [x] Refactor: share the common layer editability predicate
  - Evidence: `layer-context-actions.ts` and `catalog-layer-context-policy.ts` implement the same
    rule (`!virtual && documentId === openId`) for the same `LayerItem` and `EditorSnapshot` types;
    only the model-specific root and placement rules differ.
  - Action: move the shared predicate into a private sibling policy module and keep flat-document
    and catalog-specific delete/insert rules in their current owners.
  - Scope: current editor duplication cleanup; no command or UI behavior change.
  - Contracts: preserve both existing helper names and the virtual/open-document edit guard.
  - Validation: the user's full test suite passes 21 files / 86 tests; scoped ESLint and formatting
    pass for the changed layer modules. Editor typecheck retains the two documented unrelated
    diagnostics. Detector reports no size candidates; `layers` remains a cohesive editor feature
    directory with 14 direct source files.
  - Result: both flat and catalog layer policies now reuse one private predicate while retaining
    their existing helper exports and model-specific root/placement rules.

- Retained detector candidates: `packages/core/src/legacy/flat/document/commands/nodes/structure.ts`
  groups flat-tree structural commands that share validation and mutation invariants; splitting
  these operations would not create a separate owner. `apps/editor/src/ui/sidebar/layers/` is a
  cohesive sidebar feature containing asset navigation and catalog-node interactions; keep its
  current files grouped by those workflows, with only the shared editability rule extracted.
  Validation: final detector reports only this structural file and the layer directory
  concentration; focused layer ESLint, Prettier, the full root tests, and `git diff --check` pass.

- [x] Remove debug logging from the shared settings table
  - Evidence: `Table` logged its entire rows/groups input on every render, flooding Vitest and
    application output as users typed in token tables. No consumer or test depended on the log.
  - Action: remove the unconditional `console.log`; preserve table rendering and interaction.
  - Scope: remove diagnostic noise surfaced during the current token-table test migration.
  - Contracts: no UI or data behavior change; no package ownership changes.
  - Validation: full root test suite and `git diff --check`.

- [x] Refactor: retire the unused DocumentFile style compiler tests without fixture shims
  - Evidence: the Editor's only `@facadeur/style-engine` product import is `renderDesignCss` for
    Catalog-backed design tokens. `compileDocument`, `createStyleEngine`, and the CSSOM controller
    have no product consumers and accept only the legacy `DocumentFile`; `engine.test.ts` was
    converting Examples' current `NodeDefinitionModel` into that legacy shape through
    `documentFromExample`.
  - Action: keep the active UUID-token design CSS API and tests. Mark the legacy compiler/runtime
    exports as deprecated and remove tests/helpers that only exercise that unused legacy path;
    do not add adapters from current Examples into `DocumentFile`. A future Catalog style compiler
    must consume the current model directly and retain behavior that is still part of the product.
  - Scope: current no-shims cleanup; no API/API-client or Store Yjs changes.
  - Contracts: preserve current design token CSS, responsive values, and font output. Preserve the
    legacy package exports for now but clearly signal their deprecated status; no product behavior
    or persisted data changes.
  - Validation: only `DesignDomainStage` imports Style Engine in product code, and it imports
    `renderDesignCss`. The current design CSS suite passes 6/6; Style Engine typecheck passes;
    full root suite passes 37 files / 128 tests. Detector reports no size candidates and
    `git diff --check` passes. Direct sandbox Vitest still fails before collection on `EPERM`
    resolving the pnpm virtual store; the same focused suite passes in the approved host context.
  - Follow-up: the deprecated exports and implementation retained at this stage were subsequently
    removed in the completed cleanup entry below.

- [x] Refactor: use the shared option contract across selection fields
  - Evidence: Editor Select, RadioGroup, and SegmentedControl wrappers currently type options as
    `AutocompleteOption`, while their package fields consume `SelectOption`; the autocomplete
    shape adds search-only metadata that these controls do not use.
  - Action: have the shared autocomplete option extend `SelectOption`, and type the Editor wrappers
    against the package's common `SelectOption` export.
  - Scope: current form ownership cleanup; no API/API-client or Store Yjs changes.
  - Contracts: preserve option values, labels, and accepted richer option records through structural
    typing; no runtime behavior or package runtime dependency changes.
  - Validation: Form typecheck passes; Editor typecheck reports only its two existing diagnostics
    in `CatalogPreviewDataStage` nullability and the missing `jsonjoy-builder` declaration. Root
    tests pass 37 files / 128 tests; Prettier, candidate detector, and `git diff --check` pass.

- [x] Refactor: remove the legacy named-variant style fallback
  - Evidence: `apps/editor/src/domain/edits/style-edit.ts` reads both current
    `variantPresets[].overrides.styles` and the retired `styles.variants.variant` layout. The
    fallback exists only to migrate the old format on first edit; the component test explicitly
    preserves that shim.
  - Action: keep reads from the current `variantPresets` document shape and remove the legacy
    fallback and its compatibility-only assertion. Do not add a fixture adapter.
  - Scope: current no-shims cleanup; no API/API-client, persistence, or Store Yjs behavior changes.
  - Contracts: preserve sparse style overrides for current named variants, states, breakpoints,
    and child nodes.
  - Validation: focused editor style tests, root tests, Editor typecheck, detector rerun, and
    `git diff --check`.
  - Result: removed the `styles.variants.variant` read and its compatibility-only test assertion.
    The full root suite passes 37 files / 128 tests; the requested focused files are outside the
    root Vitest allowlist, so that filtered invocation reported no test files. Editor typecheck
    still reports the two known unrelated errors in `CatalogPreviewDataStage` and the
    `jsonjoy-builder` declaration. Detector reports no size candidate and `git diff --check` passes.

- [x] Refactor: remove the unused legacy DocumentFile style compiler and CSSOM engine
  - Evidence: product import audit finds only `DesignDomainStage` consuming `@facadeur/style-engine`,
    and it uses `renderDesignCss`. `compileDocument`, `createStyleEngine`, `StyleController`,
    `Rule`, compiler helpers, and selectors have no product/test consumers; the deprecated API
    tests were already retired because they depended on legacy `DocumentFile` and a fixture adapter.
  - Action: delete the deprecated compiler/CSSOM engine and their private-only modules. Keep
    Catalog-backed design CSS generation, responsive token output, and the current package-owned
    exports under `design/css.ts`.
  - Scope: current deprecated implementation cleanup; no API/API-client or Store Yjs changes.
  - Contracts: preserve `renderDesignCss` output and all active imports; this package is private
    and the removed exports were marked deprecated. Do not add a Catalog-to-DocumentFile adapter.
  - Validation: complete import audit, style-engine typecheck, design CSS tests, root tests,
    candidate detector, and `git diff --check`.
  - Result: removed the deprecated compiler, DocumentFile controller/engine, and their private
    selector/layout/CSS helpers. Kept `renderDesignCss` and the private resolved-design stylesheet
    insertion helper. Product import audit finds no references to removed exports; Style Engine
    typecheck passes, design CSS tests pass 6/6, and root tests pass 37 files / 128 tests. Detector
    reports no size candidates.

- [x] Refactor: use Catalog records for Stage pointer interactions
  - Evidence: the old Stage handlers resolved selection and insertion through the synthetic
    `EditorSnapshot.document`, while the active model is Core's open Catalog definition. The
    previous iframe implementation also created nested React roots, which raced with React teardown.
  - Action: map rendered UUIDs to authored Catalog nodes, perform placement and reorder through Core,
    and persist edits through the app service. Render iframe contents as React portals owned by the
    Editor tree; retain keyboard nudging through Catalog style records. Do not add a FlatDocument
    adapter.
  - Scope: current Catalog interaction migration; API/API-client and Store Yjs remain untouched.
  - Contracts: retain viewport focus, click depth, hover, insert tools, asset/node drag/drop,
    reorder, absolute-position keyboard nudging, and persisted edits. Preview-expanded components
    remain mapped to their authored instance UUID only.
  - Validation: the Stage path has no `snap.document` reads; iframe portal reconciliation and shell
    behavior pass. The full root suite passed 37 files / 131 tests in the approved host context.
    The focused shell suite passes 5/5 without React warnings after its helper began draining two
    animation frames within `act`, covering Stage zoom-session updates. This was confirmed in the
    approved host context on 2026-10-11. Editor typecheck still has the previously documented
    unrelated diagnostics.
    Detector reports no size candidates; formatting and `git diff --check` pass.

- [x] Refactor: keep native control styling in Form
  - Evidence: `packages/form` owns the actual input/select/textarea elements and styles them with
    shared CSS modules, while `apps/editor/src/ui/styles/form.css` repeats their base sizing,
    spacing, border, focus, invalid, and disabled rules under `.eu-control`.
  - Action: leave Editor-specific sizing/layout hooks in the Editor stylesheet; move the shared
    invalid-state rule to the Form-owned shared control module.
  - Scope: remove duplicate form-control styling while auditing Editor form reuse.
  - Contracts: preserve existing control visual states and field layout; continue using only native
    control elements from `@facadeur/form`; no API, persistence, or form data contract changes.
  - Validation: Form package typecheck passes; the active Editor event-bindings suite passes 2/2
    in the approved host context and loads the Form-backed Editor controls; Prettier, detector,
    and `git diff --check` pass. Direct sandbox Vitest remains blocked before collection by
    `EPERM` resolving the pnpm virtual store.
- [x] Refactor: remove dormant FlatDocument editing helpers
  - Evidence: `editing.ts` still contains legacy drop-parent, layer-reorder, layout-write, and
    placement-eligibility helpers. Repository-wide source search finds no production callers for
    those functions; Catalog layer moves and Core style commands are already active owners.
    `editing.test.ts` imported removed root JSON fixtures, so the suite was excluded from Vitest.
  - Action: remove the unused helpers and their compatibility-only assertions; keep active pointer
    geometry, insert-mode messaging, nesting-policy display, and layout value lookup. Move the
    shared `DropZone` union to the active Catalog layer-move module and update its Editor callers.
    Rewrite the remaining focused tests around current-model-independent active behavior and add
    that suite to Vitest.
  - Scope: continue the current no-shims cleanup; no API/API-client or Store Yjs changes.
  - Contracts: preserve the live Stage insertion cue/geometry, layout display, and Catalog layer
    drag/drop behavior; do not add DocumentFile adapters or retain uncalled compatibility exports.
  - Validation: focused editing and Catalog layer suites, Editor typecheck, candidate detector,
    import audit, formatting, and `git diff --check`.
  - Result: removed the uncalled DocumentFile/FlatDocument drop-parent, reorder, and layout-write
    helpers; retained current layout-layer lookup, shared patch typing, Stage geometry, and insert
    policy. `DropZone` now belongs to Catalog layer movement. Rewrote and enabled the active editing
    suite without removed JSON fixtures. Focused behavior passes 14/14; root suite passes 44 files /
    150 tests; Editor typecheck passes. Import audit and detector show no old helper references or
    size candidates; formatting and diff checks pass.
- [x] Refactor: remove unused DocumentFile preview-data adapters
  - Evidence: `apps/editor/src/domain/preview-data.ts` only has consumers in two non-allowlisted
    test files. Its migration, sparse patch, and source-selection helpers accept the deprecated
    `DocumentFile`/`FlatDocument` envelope. Current preview UI reads and writes Catalog
    `config.previewData` through `CatalogPreviewFields`; `parseFieldValue` is the parser actually
    used by active Catalog UI and definition editing.
  - Action: delete the unreferenced legacy preview-data module and its DocumentFile-only behavior
    suite. Keep parser coverage in `field-values.test.ts`, call the active `parseFieldValue`
    directly, remove its unused empty-string preservation mode, and add that test to the root Vitest
    allowlist.
  - Scope: no-shims cleanup of unreachable Editor code; no API/API-client, Core persistence, or
    Store Yjs changes.
  - Contracts: preserve active Catalog preview defaults and parser behavior, including structured
    schema validation, unset empty strings, trimming at the call site, zero, and false.
  - Validation: focused parser and preview UI tests, root suite, Editor typecheck, import audit,
    detector, formatting, and `git diff --check`.
  - Result: removed the unreferenced `preview-data.ts` module and its tests for DocumentFile
    migration/patching. Migrated active parser coverage to `parseFieldValue`, removed its unused
    empty-string preservation option, and enabled the parser suite. Catalog preview and parser
    focused suites pass 9/9; root suite passes 45 files / 156 tests. Editor typecheck, source audit,
    detector, formatting, and diff checks pass.
- [x] Refactor: remove orphaned DocumentFile asset factory
  - Evidence: `domain/assets/new-asset.ts` returns a deprecated `DocumentFile`; repository search
    finds only `apps/editor/test/new-asset.test.ts` importing it. The active ProjectTree New actions
    already call `blankCatalogDefinition` and `AppService.createDefinition` with Catalog records.
  - Action: remove the dead DocumentFile factory and its factory-only tests; retain the current
    Catalog definition factory and ProjectTree creation flow.
  - Scope: no-shims cleanup; no API/API-client or Store Yjs changes.
  - Contracts: preserve visible New atom/component/page behavior, unique naming, Catalog UUIDs, and
    Core-backed creation.
  - Validation: active ProjectTree test, root suite, import audit, detector, formatting, and
    `git diff --check`.
  - Result: removed `blankAsset` and its tests after confirming `ProjectTree` already creates
    Catalog definitions through `blankCatalogDefinition` and Core. Extended the active ProjectTree
    test to click New and assert the Catalog definition is created/opened. That test passes; the
    root suite passes 45 files / 156 tests and Editor typecheck passes. No old factory imports or
    detector size candidates remain.
- [x] Refactor: remove the unreachable legacy FieldDefinition editor
  - Evidence: `ui/controls/data/fields/FieldsEditorControl` has no production caller; only its
    own paused test imports it. The containing `ui/controls/data/index.ts` only exports that
    component and has no callers. Current Catalog schema editing uses `JsonSchemaContractEditor`
    and Catalog schema stages. The associated draft/retarget helpers are only consumed by this
    editor or legacy tests; parser and variant-axis helpers in `domain/definitions.ts` still have
    active callers.
  - Action: delete the unreachable field editor and its barrel, remove only FieldDefinition-draft
    helpers and their exclusive tests, and keep active value parsing, list splitting, and variant
    axis editing coverage.
  - Scope: continue the authorized no-shims cleanup; no API/API-client, persistence, data-model, or
    Store Yjs changes.
  - Contracts: preserve active Catalog schema editing, `parseFieldValue`, and variant-axis creation.
  - Validation: scoped Editor tests/typecheck, import audit, candidate detector, formatting, and
    `git diff --check`.
  - Result: deleted the unreferenced `FieldsEditorControl`, its field editor barrels, and its
    FieldDefinition-only tests/helpers. Kept `parseFieldValue`, active list splitting, and variant
    axis draft coverage. The root suite passes 45 files / 156 tests and Editor typecheck passes;
    detector, import audit, formatting, and diff checks pass.
- [x] Refactor: use the canonical `dom.text` field throughout preview rendering
  - Evidence: the shared `DomSpec` defines `text` separately from DOM properties, but Editor
    `DynamicElement`, Core preview resolution/inspection, and `@facadeur/examples` still interpret
    `dom.properties.textContent` as rendered text. Example fixtures use this old representation.
  - Action: migrate Example fixture text into `dom.text`, remove the textContent extraction/filter
    fallback from Editor/Core preview paths, and derive fixture labels from `dom.text` only. Keep
    actual non-text DOM properties intact.
  - Scope: current no-shims cleanup; do not change API/API-client or persistence, and preserve
    rendered fixture contents.
  - Contracts: `DomSpec.text` remains the single content channel; `properties` continue to encode
    DOM properties and all generated `ElementBuildConfig` behavior for non-text props is preserved.
  - Validation: Core/Examples/Editor typechecks and root tests, text rendering assertions, import
    audit, candidate detector, formatting, and `git diff --check`.
  - Review: `form-controls-section/dom.ts` is 551 lines, but remains one cohesive static Storybook
    fixture tree for a single form-controls showcase; the migration does not add another
    responsibility or justify splitting the fixture.
  - Result: migrated all 47 Example `textContent` fixture values to `dom.text`; removed the
    special-case fallback/filter from Core preview resolution and inspector values, Editor's React
    element builder, and Example layer naming. Generic DOM properties remain passed through. Core,
    Examples, and Editor typechecks pass; the root suite passes 45 files / 156 tests. The final
    source search finds no `dom.properties.textContent` compatibility branches; detector, formatter,
    and diff checks pass.
- [x] Refactor: remove the unreachable Editor form demo
  - Evidence: `apps/editor/src/form-demo.tsx` is the only source defining `FormDemoApp` and mounting
    it with `createRoot`; repository-wide search finds no route, script, Storybook story, test, or
    other import that can launch it. Active form elements are covered through the Editor integration
    tests and Storybook stories.
  - Action: remove the orphaned manual demo and its stale documentation reference; keep the active
    Form package fields, Editor binding wrappers, and integration/story coverage.
  - Scope: remove unreachable developer-only duplicate UI; no product behavior, API/API-client,
    persistence, or Store Yjs changes.
  - Contracts: preserve all reachable form workflows and the package ownership boundary documented
    in `docs/editor-form.md`.
  - Validation: import/route/story audit, Editor typecheck, root tests, candidate detector,
    formatting, and `git diff --check`.
  - Result: removed `form-demo.tsx` and its documentation reference. Repository search finds no
    remaining demo references; the Editor typecheck passes and the root suite passes 45 files / 156
    tests. The pre-edit detector found no size candidates; the post-edit detector reports no size
    candidates on the remaining documentation paths. `git diff --check` passes.
- [x] Refactor: remove unused FlatDocument schema/variant adapters from Editor
  - Evidence: `session-variant-context.ts` has no production callers. The Editor
    `component-contract.ts` adapter is used only by that context and a paused test that builds
    legacy `DocumentFile` objects; `schema-defaults.ts` is used only by the same context and its
    isolated DocumentFile test. Current Catalog inspector/validation owns field exposure and
    preview defaults in Core; variant editing uses the active Catalog style path.
  - Action: delete the unreachable session adapter, its schema/variant façade and defaults helper,
    plus tests that exclusively exercise those retired FlatDocument contracts. Preserve active Core
    Catalog contract tests and Editor Catalog schema/variant behavior tests.
  - Scope: no-shims cleanup of unreachable Editor code and tests; no API/API-client, persistence, or
    Store Yjs changes.
  - Contracts: keep current Catalog schema field exposure, preview defaults, event controls, and
    responsive variant editing unchanged; do not add a Catalog-to-FlatDocument bridge.
  - Validation: source/test consumer audit, Core/Editor typechecks, root tests, candidate detector,
    formatting, and `git diff --check`.
  - Result: removed the uncalled Editor variant session adapter, its DocumentFile component-contract
    façade and schema-default overlay, and their two paused legacy-only suites. Current Core
    Catalog field-exposure tests remain intact. Core and Editor typechecks pass; root tests pass
    45 files / 156 tests. Consumer search and detector report no remaining references/candidates;
    `git diff --check` passes.
- [x] Refactor: retire unconsumed Editor style-rule mutation helpers
  - Evidence: repository and Storybook import search finds no consumers of `style-rule-edit`,
    `node-style-draft`, or the CSS declaration parser. Their only consumers were paused tests using
    old style-rule/FlatDocument records. `CssDeclarationsControl` does not use those algorithms and
    was retained with a locally owned declaration row shape. A full Storybook import audit found
    `apps/editor/.storybook/stories/forms/components/css.stories.tsx` actively renders it.
  - Action: remove the unconsumed Editor style-rule helpers and parser, their legacy-only tests, and
    the now-unused generic style-edit algorithms; define the display-row contract next to the
    retained CSS declarations control.
  - Scope: remove unreachable Editor editing logic/tests; no current Catalog behavior, API/API-client,
    persistence, or Store Yjs changes.
  - Contracts: preserve the CSS declaration row shape, shared Form-backed control behavior, Core
    Catalog styles, and any layout controls still accepted as supported reusable surfaces.
  - Validation: product/story import audit, Editor typecheck, root tests, candidate detector,
    formatting, and `git diff --check`.
  - Result: removed the uncalled style-rule, node-style draft, CSS parser, and legacy style-edit
    algorithms plus their DocumentFile-oriented suites. Kept `CssDeclarationsControl` with a locally
    owned `CssDeclarationEntry` contract and preserved its active Storybook story and Catalog variant
    draft coverage.
    Editor typecheck passes and root tests pass 46 files / 157 tests. Import audit finds no
    references to removed helpers; detector, Prettier, and `git diff --check` pass.

- [x] Refactor: retire unmounted layout controls and legacy capability path
  - Evidence: `LayoutControl`, `SpacingControl`, `layoutCapabilities`, and their tests have no
    product or Storybook callers. The active CSS Storybook story renders `CssDeclarationsControl`,
    but does not supply its optional `layoutCapabilities` prop; only a legacy `FlatDocument` test
    exercises that optional path.
  - Action: remove the unmounted Layout/Spacing control family and its tests, then remove the
    capability module and the unused CSS capability prop/test. Keep `CssDeclarationsControl`, its
    active Storybook story, shared Form-backed editing, and the active Catalog inspector intact.
    Update the Properties Storybook example to the current `schema/form` module path so the build
    validates the maintained form surface.
  - Scope: no-shims cleanup; no API/API-client, persistence, or Store Yjs changes.
  - Contracts: preserve the rendered CSS declaration UI and its manual/guided edits; do not add a
    Catalog-to-FlatDocument adapter.
  - Validation: product/story import audit, Editor typecheck, root suite, Storybook build,
    candidate detector, formatting, and `git diff --check`.
  - Result: removed unmounted layout/spacing controls and their legacy tests, preserving the active
    CSS declarations story and removing only its unused capability path. Updated the Properties
    Storybook example from the deleted schema-form path to the current module. Editor typecheck
    passes; root tests pass 46 files / 154 tests; Storybook builds successfully. The final detector,
    formatting, import audit, and diff checks pass.

- [x] Refactor: remove orphaned FlatDocument session utilities and preset test
  - Evidence: repository search finds no imports of `domain/session/kinds.ts` or any of its exported
    helpers. `variant-edit.test.ts` only imports the already-removed `domain/edits/variant-edit.ts`
    and asserts legacy `FlatDocument.variantPresets` labels/IDs; no active Catalog surface consumes
    those functions.
  - Action: delete the unreferenced utility module and the test that targets the removed variant
    implementation. Keep Core's Catalog variant contracts and the active Editor variant draft test.
  - Scope: no-shims cleanup; no API/API-client, persistence, or Store Yjs changes.
  - Contracts: no runtime callers or Storybook imports; preserve current Catalog variant behavior.
  - Validation: source/test import audit, Editor typecheck, root tests, detector, formatting, and
    `git diff --check`.
  - Result: deleted `domain/session/kinds.ts` and the stale variant preset test; no product or
    Storybook callers remain. Editor typecheck passes and root tests pass 47 files / 161 tests.
    Final detector, Prettier, import audit, and diff checks pass.

- [x] Refactor: restore active overlay coverage at its owning UI boundary
  - Evidence: `apps/editor/test/form/overlay.test.tsx` covers the live Modal and Popover components,
    but imports them from `form-binding`, which does not export them. Their implementation and
    consumers belong to `ui/components/overlay`; this stale test import excluded useful active
    coverage from the curated root suite.
  - Action: import the controls from their overlay owner and include the test in the root Vitest
    allowlist. Keep overlays as Editor UI, separate from reusable form fields in `@facadeur/form`.
  - Scope: current cleanup; no behavior or package API changes.
  - Contracts: preserve open/close and Escape behavior; do not move generic overlays into the Form
    package.
  - Validation: focused overlay suite and root tests, Editor typecheck, import audit, detector,
    formatting, and `git diff --check`.
  - Result: the focused overlay test passes 2/2; the Editor typecheck passes; root tests pass 47
    files / 156 tests. Detector, Prettier, import audit, and diff checks pass.

- [x] Remove the orphaned Editor test for DocumentFile project-file persistence
  - Evidence: `apps/editor/test/project-files.test.ts` directly tests API `readProjectFiles` and
    `saveProjectFile` using legacy `DocumentFile` records, then calls `session.saveOpenDocument()`
    and inspects per-document style state. The current Editor connection only exposes Catalog-wide
    `saveAllChanges`; no Editor production path imports these file APIs. API storage behavior has
    its own package tests and remains outside this Editor cleanup.
  - Action: delete the stale Editor integration test rather than adding a Catalog-to-DocumentFile
    shim or changing API-owned storage tests.
  - Scope: retire obsolete Editor test coverage only; no API/API-client or persistence changes.
  - Contracts: preserve current Catalog project save behavior and leave API storage implementation
    and package tests untouched.
  - Validation: import audit, Editor typecheck, root tests, detector, formatting, and diff check.
  - Result: deleted the obsolete Editor test. Editor typecheck passes and root tests pass 47 files /
    156 tests. API source/tests were not modified; detector, formatting, import audit, and diff check
    pass.

- [x] Refactor: finish reviewing paused Editor control suites individually.
  - Evidence: `css-declarations-control.test.tsx` covers the maintained Storybook CSS declarations
    control but still references removed `testUuid*` values; `typography-control.test.ts` similarly
    has one removed UUID while exercising helpers used by the active CSS declarations control. The `bindings-editor` and
    `binding-slots` suites exercise `BindingsEditorControl`, which has no product or Storybook
    callers; `data-control.test.ts` also tests the uncalled `VariantsEditorControl` helpers alongside
    binding value helpers. These controls use Core `Binding`/`VariantAxis` data, but there is no
    current Catalog route composed from them, so their product status is not established merely by
    their tests.
  - Action: migrate tests for maintained Storybook/editor controls to canonical `@facadeur/examples`
    fixtures and re-enable them individually; use a minimal local UUID only where the one-font
    Example fixture cannot exercise sorting. Following the user's decision, remove uncalled
    Binding/Variant controls and isolated tests; do not add Catalog adapters or shims.
  - Scope: current Editor control and fixture cleanup. Do not touch API/API-client or Store Yjs.
  - Contracts: preserve active Storybook behavior and `@facadeur/form` ownership; only claim
    coverage for controls reachable in maintained product/story composition.
  - Validation: focused migrated suites, root Vitest, Editor typecheck, source/story import audit,
    candidate detector, formatting, and `git diff --check`.
  - Completed coverage: the CSS declarations test now wraps the control in Core's token preview
    provider using canonical Example token data and asserts the active form controls by their
    current names. The typography value suite uses the Example Inter font plus one minimal local ID
    for its sorting case. Both are in the root allowlist.
  - Result: both focused suites pass (12 tests); Editor typecheck passes and root tests pass 52 files /
    187 tests. Formatting, detector, and `git diff --check` pass.
  - Completed migration: the active `DesignTypographyEditor` and `DesignShadowEditor` tests now
    import the current `ui/design` owners and use canonical Examples token IDs. Added those suites
    and the ProjectWorkspace load/resume suite to the root allowlist; its fixture supplies
    `createExampleCatalog()` while retaining only the API-required `DocumentFile` snapshot fields.
    Removed the five orphaned path-keyed `*edit.test.ts` suites and their unconsumed
    `tokenMatchesDomain` path helper. Active UUID-keyed token CRUD and token-table editors remain.
  - Token-picker migration: paused `token-value-control.test.tsx` and `token-presentation.test.ts`
    exercised active picker/presentation owners but relied on undefined UUIDs, obsolete ARIA labels,
    and path-shaped references. Migrated them to Example token UUIDs and the active form labels;
    unknown-reference preservation is covered by using an Example token omitted from the picker
    options. Path label formatting remains tested directly, while live Catalog labels stay covered
    by TokenPreview tests. Added both suites to the root allowlist.
  - Current-model-independent coverage: `geometry.test.ts` and `frame-host.test.ts` exercise active
    stage geometry and the iframe host without DocumentFile fixtures or adapters. Re-enable both in
    the root allowlist; retain the existing Form-backed Editor adapters, which delegate each field
    to `@facadeur/form` and only add Catalog path binding.
  - Result: both suites pass (7 tests); the full root suite passes 59 files / 212 tests. Prettier,
    candidate detector, and scoped `git diff --check` pass.
  - Additional active-suite migration: retire the Editor component-token authoring helpers and
    their paused tests because the removed authoring panel has no product caller; keep Core-owned
    component-token validation and the active preview of existing records. Move the shared global
    token CSS-variable preview into a design-token-specific Editor module. Rewrite Font edit tests
    to cover current `FontFamily` records from the Example Catalog, dropping assertions for two
    helpers that no longer exist. Re-enable active stage, schema-array, style-property, design
    settings, management, navigation, event, and Editor route tests individually; leave
    `@facadeur/api` and `api-client` source untouched.
  - Additional retirement: remove the paused undo-history test, whose imported helper and any
    product Undo/Redo surface are absent from the current Editor tree; it only covered the removed
    multi-store document session.
  - Result: focused suites pass (18 tests across both migrations), Editor typecheck passes, and the
    root suite passes 57 files / 205 tests. Prettier, source candidate detector, stale-import and
    placeholder audit, and scoped `git diff --check` pass. API and API-client source were not changed.
  - Product decision: the user confirmed removing `BindingsEditorControl`, `VariantsEditorControl`,
    `VariantStyleLayers`, and their isolated tests. Import audits show no product or Storybook
    callers; their implementation and tests only cover legacy `Binding` / `VariantAxis` editors.
    Preserve Core's legacy document contracts because API and Store Yjs still consume them.
  - Retired controls: deleted the uncomposed Editor Binding/Variant editors and helper modules,
    including the variant-draft helper/test. Kept `fieldDisplayLabel`, which has active Catalog and
    schema-editor callers, with focused coverage; moved the comma-list parser into the font edit
    module that still needs it. Core's legacy contracts remain for API and Store Yjs consumers. No
    API, Store Yjs, Catalog model, or persisted behavior changes.
  - Project workspace coverage: update `project-workspace.test.tsx` to supply the current Example
    Catalog alongside the API snapshot's required legacy design/document fields. Keep API source and
    contracts unchanged; assert only the current project loading/resume behavior.
  - Explicit product direction: remove the project-level `Open` button from the management list and
    its UI callback plumbing. Keep URL-driven project loading and the manage-projects return path;
    management actions continue to cover rename/archive/create and access management.
  - Latest result: migrated the active design-domain test to current Example UUIDs, breakpoint
    snapshots, responsive token tabs, and Catalog save semantics; migrated font-edit assertions to
    the current nested FontFamily record. Removed the project Open action and callback while keeping
    URL-driven loading. The Editor typecheck passes and the full root suite passes 70 files / 247
    tests. Focused suites pass 11/11; the final detector reports no size candidates. Prettier and
    scoped `git diff --check` pass. Test rendering still emits React controlled-field warnings in
    `design-domain.test.tsx`; track these separately from the refactor.
  - Validation after retiring the unused controls: `pnpm test` passes 71 files / 253 tests;
    `pnpm --filter @facadeur/editor typecheck` passes. Scoped candidate scan reports no size
    candidates, import audit finds no references to deleted Binding/Variant modules, and
    `git diff --check` passes. Existing React controlled-field warnings in `design-domain.test.tsx`
    remain unrelated.
  - Legacy controller audit: remove the deprecated flat `ProjectController`, its
    `createControllerStore` adapter, and the two tests that exclusively exercise that retired
    controller stack. Evidence: no production consumers remain; Store-Yjs uses only the separate
    `DocumentChange` / `DocumentStore` contracts. Preserve those contracts and the flat command
    functions still consumed by Store-Yjs. Keep API and Store-Yjs untouched. Validate imports and
    run Core typecheck plus the current root suite after removal.
  - Follow-up dead-facade audit: remove the exported `StyleController` / `DocumentStyle` facade,
    which was only constructed by the retired `ProjectController` and has no other consumer.
    Preserve pure style command algorithms and the `GlobalTokenCommand` / `DesignLibraryCommand`
    types used by Catalog design commands. Update Core ownership docs to describe the surviving
    command layer rather than the deleted project facade.
  - Detector review: retain `legacy-migration.ts` as one cohesive read-boundary migration. It is
    called by Catalog validation and legacy DocumentFile validation and directly by Store-Yjs;
    its token, font, breakpoint, reference, and token-interface rewrites share the same generated
    identity maps. Splitting it now would add cross-module plumbing without changing ownership.
  - Result: removed the unused flat `ProjectController`, `createControllerStore`, their legacy
    project notifications/types, and the two tests devoted to that retired controller behavior.
    Removed the now-unconsumed `StyleController` / `DocumentStyle` facade and corrected the Core
    ownership docs. Kept `DocumentStore` / `DocumentChange` and pure flat commands for Store-Yjs and
    API compatibility. No API or Store-Yjs source changed. Core and workspace typechecks pass;
    root suite passes 70 files / 247 tests. Touched-file Prettier and scoped `git diff --check` pass.
  - Form ownership check: no native `<input>`, `<select>`, or `<textarea>` declarations exist under
    `apps/editor/src`; the only matching JSX tag is an Editor adapter that delegates `TextArea` to
    `@facadeur/form`. The `ui/controls/form-binding` directory is a Catalog-binding integration
    layer over `@facadeur/form` fields, not a second field implementation, so it remains.
  - Repeater comparison: Editor `ArrayField` is used by schema-driven `SchemaForm` and renders
    caller-provided children under a Catalog path prefix, including scalar and nested schema items.
    `@facadeur/form` `RepeaterField` accepts only static `itemFields` record configurations. Keep
    the Editor adapter as distinct behavior; replacing it would narrow current schema forms.
    Candidate detector reports no size candidates for either implementation.
  - Latest validation (2026-10-11): the complete root suite passes 71 files / 253 tests. The form
    ownership audit finds no native input, select, or textarea elements under `apps/editor/src`;
    editor field adapters delegate rendering to `@facadeur/form`. `design-domain.test.tsx` still
    emits React warnings for native example attributes and controlled values; track that separately
    from form-element ownership.
  - No-op controller shim: `packages/core/src/controller/project/node/style/controller.ts` only
    exposes `ready = true`; `NodeController` constructs it but has no callers or style behavior
    routed through it. Remove the property, import, class, and one-line barrel. Preserve preview
    style resolution and the actual style commands under `controller/style`. Validate Core and
    workspace typechecks, root tests, detector, and formatting.
  - Result: removed the unused `NodeController.style` property and its empty `StyleController`
    class/barrel. Core typecheck, full workspace typecheck, and root suite pass (70 files / 247
    tests); the detector reports no size candidates, and the remaining `StyleController` search
    hits are unrelated flat node style records. API and Store-Yjs source were not changed.

- [x] Refactor: remove Core's `exposedFields` forwarding export.
  - Evidence: `packages/core/src/controller/validation/catalog-exposed.ts` labels `exposedFields`
    a backwards-compatible internal name and delegates directly to the canonical
    `publicFieldsFor` resolution. Only two Core legacy-validator call sites use it; no other
    repository consumer exists. Its third `seen` argument is unused by all current call sites.
  - Action: switch those call sites to `publicFieldsFor` and remove the forwarding function and
    its validation/root exports. Keep `publicFieldsFor` and all field-resolution behavior.
  - Scope: remove an unconsumed Core compatibility shim; no API/API-client, Store Yjs, persistence,
    or Catalog contract changes.
  - Contracts: preserve legacy validation results and the canonical `publicFieldsFor` API. The
    detector flags `catalog.ts` at 451 lines; retain it as the cohesive flat-catalog validator
    orchestrator while its assertions and schema-resolution details stay in owned modules.
  - Validation: Core and workspace typechecks, root tests, repository-wide export/import audit,
    candidate detector, formatting, and `git diff --check`.
  - Result: replaced both validator calls with `publicFieldsFor` and removed the forwarding function
    from Core's validation and root exports. No source references remain. Core and workspace
    typechecks pass; the root suite passes 71 files / 253 tests. The detector retains only the
    reviewed 451-line cohesive Catalog validator; formatting and `git diff --check` pass.

- [x] Refactor: remove Core's unused legacy re-export subpath.
  - Evidence: `packages/core/src/legacy/index.ts` only forwards symbols already exported by
    `packages/core/src/index.ts`; `@facadeur/core/legacy` has no repository consumers, and Core is
    marked private. Current Server and Store Yjs consumers still use the Core root legacy exports.
  - Action: remove the unused `./legacy` package export and forwarding barrel, export the same
    retained legacy symbols directly from the Core root, and update ownership documentation. Keep
    the root legacy symbols until active Server/Store Yjs migrations can remove them safely.
  - Scope: Core's private package export surface; no API/API-client or Store Yjs source changes.
  - Contracts: preserve all current root imports, signatures, runtime implementations, and legacy
    DocumentFile behavior. New Catalog code continues to use the Catalog controller APIs.
  - Validation: repository-wide subpath import audit, Core/workspace typechecks, root tests,
    candidate detector, formatting, and `git diff --check`.
  - Result: removed the unused package subpath and its forwarding barrel; retained root symbols
    now export directly from their legacy implementation modules and remain deprecated in favor of
    Catalog APIs. No source subpath imports remain. Workspace typecheck passes and root tests pass
    68 files / 237 tests; detector, changed-file Prettier, and `git diff --check` pass.

- [x] Fix React attribute normalization for `autocomplete` in Catalog previews.
  - Evidence: the canonical FormInput example uses lowercase HTML `autocomplete`, but Editor's
    `DynamicElement` forwards it as a React prop unchanged; React reports `Invalid DOM property`
    during the active design-domain test.
  - Action: map lowercase `autocomplete` to React's `autoComplete` prop and cover the rendered
    attribute in the existing DynamicElement behavior suite.
  - Scope: Editor HTML preview rendering only; no document/example data change.
  - Contracts: preserve the authored HTML value and Node/ElementBuildConfig output; leave the
    separate no-`onChange` controlled-value warnings unchanged because a fix may alter editing
    behavior.
  - Validation: focused DynamicElement test, root tests, Editor typecheck, detector, formatting,
    and `git diff --check`.
  - Result: DynamicElement now maps `autocomplete` to React's `autoComplete`; focused coverage passes
    5/5, Editor typecheck passes, and the root suite passes 71 files / 254 tests. The invalid DOM
    property warning is gone; controlled-value warnings remain for the static example inputs.

- [x] Refactor: share Core structural-node enumeration.
  - Evidence: `structural-nodes.ts` contains two separate Flat/Nested tree traversals for the same
    repeater/switch nodes. `structuralNodesForContract` is used by catalog field derivation, while
    `structuralNodesInDocument` is used by case-value and scope-field derivation; both visit frames
    in document order and emit the same node union.
  - Action: route the internal case/scope derivations through `structuralNodesForContract` and
    remove the duplicate private traversal.
  - Scope: private Core validation consolidation only; keep Core as the Catalog/schema owner and
    leave API/API-client and Store Yjs untouched.
  - Contracts: preserve Flat and Nested traversal order, structural-node inclusion rules, case
    collision behavior, scope fields, Core public exports, and all catalog data.
  - Validation: focused structural-node/catalog contract tests, Core/workspace typechecks, detector,
    formatting, and `git diff --check`.
  - Result: case-value and scope derivation now reuse the existing contract traversal; removed the
    duplicate Flat/Nested walk. Updated a stale round-trip assertion to allow canonical token
    metadata added during normalization while still checking identity and structural root. The
    focused suite passes 17/17, workspace typecheck passes, root tests pass 68 files / 237 tests,
    detector findings are documented for cohesive validation modules, and `git diff --check` passes.

- [x] Refactor: split Core's mixed validation assertions by document contract.
  - Evidence: `packages/core/src/controller/validation/assertions.ts` contains field/value rules,
    event definitions and mappings, expose contracts, variants, and node-property assertions.
    These are consumed independently by definition validation, data-contract validation, tree
    validation, and flat commands. The current file is 530 lines and the validation directory has
    16 direct modules.
  - Action: move field/value, event/expose, variant, and node-property assertions into cohesive
    modules; update internal imports to the owning modules and keep the supported Core root exports
    unchanged. Do not add a catch-all forwarding shim at the old internal path.
  - Scope: Core validation organization only. Preserve flat DocumentFile behavior needed by API
    and Store Yjs; do not edit API/API-client or Store Yjs.
  - Contracts: preserve validation errors/messages, type guards, legacy behavior, command callers,
    and Core's public exports.
  - Validation: focused Core validation/command suites, full workspace typecheck and root tests,
    export/import audit, candidate detector, formatting, and `git diff --check`.
  - Result: split the old assertion module into field/value, event/expose, variant, and node-property
    validators; migrated Core and flat-command imports and kept Core root exports unchanged. The
    curated root suite passes 70 files / 247 tests, and full workspace typecheck passes. The
    explicitly invoked, root-excluded flat suites are not a clean verification baseline: the
    contracts and schema-use suites pass, while the others expose stale token-path, layout, and
    roundtrip expectations unrelated to the module move; keep their per-suite fixture migration in
    the existing legacy-test cleanup item. API/API-client and Store-Yjs source were untouched.

- [x] Consolidate duplicate Core token-path validation.
  - Evidence: component-token contracts, component-token commands, style-block parsing, and style
    contract validation each define the same `TOKEN_PATH` expression. The same lowercase
    `family.group.name` grammar is therefore duplicated four times within Core.
  - Action: add a private Core style-token path predicate and use it at all four call sites.
  - Scope: internal Core validation only; no public export or data-format change.
  - Contracts: preserve the current accepted token path grammar and existing error messages.
  - Validation: focused component-token/style tests, Core typecheck, detector, formatting, and
    `git diff --check`.
  - Component-token test migration: the excluded `component-tokens.test.ts` suite exercises active
    UUID component-token commands and passes its five behavior tests, but its nested/flat roundtrip
    fixture omits the canonical empty global token families. Reuse Core's `emptyTokenTree()` in
    that fixture and add the suite to the curated root allowlist after it passes.
  - Result: Core now exposes one internal `isTokenPath` predicate used by component-token
    parsing/commands and style-block parse/contract validation. Updated the component-token
    roundtrip fixture with Core's `emptyTokenTree()` and added that suite to Vitest's curated root
    list. Focused token/catalog/style suites pass 18/18; full workspace typecheck passes and root
    suite passes 71 files / 253 tests. API/API-client and Store-Yjs source were not changed in this
    step.

- [x] Refactor: reuse the Examples Catalog in the Editor asset-list test.
  - Evidence: `apps/editor/test/catalog/asset-list.test.ts` imports `seedProjectCatalog` and
    `IMAGE_ATOM_UUID` from `@facadeur/api/server`, although the Examples package already supplies
    the same Image atom and its stable ID. This couples an Editor unit test to the API server's
    fixture implementation and duplicates fixture ownership.
  - Action: use `createExampleCatalog()` and `exampleIds.components.image.definition`; keep the
    intentional malformed-name mutation local to the schema-title fallback test.
  - Scope: Editor test fixture only. Do not modify API/API-client or product code.
  - Contracts: preserve asset kind, stable identity, schema-title fallback, and sorting assertions.
  - Validation: focused asset-list test, candidate detector, formatting, and `git diff --check`.
  - Result: migrated all three asset-list cases to `createExampleCatalog()` and the stable Example
    Image atom UUID. The focused suite passes 3/3; detector reports no size candidates; scoped
    Prettier and `git diff --check` pass. The Editor test no longer imports API server fixtures.

- [x] Remove unconsumed Storybook Catalog debug exposure.
  - Evidence: `apps/editor/.storybook/stories/app/editor.stories.tsx` logs the entire example
    Catalog and writes it to `window.__facadeurExampleCatalog`; a repository-wide search finds no
    consumer of that global.
  - Action: remove the debug log and window assignment/cleanup while retaining the Example Catalog
    fixture and Editor story behavior.
  - Scope: Storybook-only cleanup; no app behavior or package API changes.
  - Contracts: preserve the story's catalog initialization, navigation, inspector callbacks, and
    Editor rendering.
  - Validation: Storybook build, candidate detector, formatting, and `git diff --check`.
  - Result: removed the unused console dump and `window` global. Storybook builds successfully;
    detector, scoped Prettier, and `git diff --check` pass. Existing Vite Next.js directive and
    sourcemap warnings remain unrelated.

- [x] Refactor: remove the Storybook properties-story barrel cycle.
  - Evidence: `pnpm --filter @facadeur/editor build-storybook` succeeds but Rollup reports that
    `properties.stories.tsx` imports `SchemaForm` through `data/schema/form/index.ts`, producing a
    circular dependency between the barrel and implementation chunks.
  - Action: import `SchemaForm` and its field config type directly from their implementation/type
    modules in the Storybook story. Keep the package-internal barrel unchanged for supported app
    consumers.
  - Scope: Storybook-only import path; no runtime behavior or public API change.
  - Contracts: preserve property story fields and rendering.
  - Validation: Storybook build and confirm this specific Rollup warning is gone, candidate
    detector, formatting, and `git diff --check`.
  - Result: the properties story imports `SchemaForm` and `FieldConfig` from their implementation
    and type modules; the filtered Storybook build succeeds with no `SchemaForm` or circular-chunk
    warning. Candidate detector, scoped Prettier, and `git diff --check` pass.

- [x] Refactor: remove unused Storybook Form type aliases.
  - Evidence: `.storybook/lib/schema-form/types.ts` aliases eight `@facadeur/form` field types
    under duplicate `*SchemaField` names. Repository search finds no consumers; active story
    config only needs the canonical `FormFieldConfig` and Storybook-specific parameter type.
  - Action: keep `StorybookSchemaFormConfig.fields` typed directly as `FormFieldConfig[]` and remove
    the unused alias declarations and barrel exports.
  - Scope: Storybook-only type surface; `@facadeur/form` contracts and runtime behavior unchanged.
  - Contracts: preserve `storybookSchemaForm` parameter shape and panel registration.
  - Validation: Storybook build, alias consumer audit, candidate detector, formatting, and
    `git diff --check`.
  - Result: removed seven unused aliases and made `StorybookSchemaFormConfig.fields` use the
    canonical `FormFieldConfig` directly. Alias search is clean; Storybook builds successfully;
    detector, Prettier, and `git diff --check` pass.

- [x] Refactor: remove the unconsumed Editor `FieldBinding` type export.
  - Evidence: `apps/editor/src/ui/controls/form-binding/types/form.ts` declares this type and the
    package-local barrels re-export it, but repository-wide search finds no consumer. Active
    controls derive their binding behavior through `useBindable` and `FormContextValue` instead.
  - Action: remove only `FieldBinding` and its two barrel exports; keep the Form integration
    context and all package-owned field wrappers intact.
  - Scope: remove dead Editor type surface; no runtime behavior or `@facadeur/form` API changes.
  - Contracts: preserve `Form`, `FormProps`, `FormChangeMeta`, and Catalog path binding behavior.
  - Validation: repository-wide symbol search, Editor typecheck, root tests, scoped detector,
    formatting, and `git diff --check`.
  - Result: removed the unused type and both barrel exports. No Editor consumers remain;
    `@facadeur/editor` typecheck passes and root tests pass 71 files / 254 tests. The scoped
    detector reports no size candidates; formatting and `git diff --check` pass.

- [x] Refactor: remove the unconsumed Editor `RadioGroup` adapter.
  - Evidence: repository-wide search finds the Editor wrapper only in its declaration and two
    barrels. No product, Storybook, or test consumer uses it. The reusable `RadioGroupField`
    implementation remains owned and exported by `@facadeur/form`.
  - Action: remove the Editor-only binding wrapper and its barrel exports; retain the package field.
  - Scope: remove unused Editor adapter only; no reusable Form API or runtime behavior changes.
  - Contracts: preserve active field adapters and the package-owned `RadioGroupField` API.
  - Validation: repository-wide consumer search, Editor typecheck, root tests, scoped detector,
    formatting, and `git diff --check`.
  - Result: removed the unused Editor wrapper and barrel exports; retained the Form package field.
    No active consumers remain. Editor typecheck passes, root tests pass 71 files / 254 tests,
    detector reports no size candidates, and formatting and `git diff --check` pass.

- [x] Refactor: remove the orphaned Editor token-option builder.
  - Evidence: `ui/controls/token-options.ts` exports a hook, a generic option builder, and three
    family wrappers, but repository search finds no product or Storybook consumers. Its only
    external caller is one test of the generic builder. `TokenValueControl` independently owns the
    active Catalog picker options and their live labels, values, and unknown-reference retention.
  - Action: remove the unused builder and its family wrappers; drop only the test that exercises
    that unconsumed builder. Keep token label formatting/search tests and active picker behavior
    tests.
  - Scope: remove a dead duplicate token-picker path; no Catalog data, UI behavior, or persistence
    changes.
  - Contracts: preserve active option labels, search behavior, current unknown references, UUIDs,
    direct values, and commit semantics through `TokenValueControl`.
  - Validation: repository-wide symbol search, focused token presentation/picker tests, Editor
    typecheck, root tests, scoped detector, formatting, and `git diff --check`.
  - Result: removed the orphaned builder and its isolated test while retaining active picker
    coverage. Focused tests pass 7/7, Editor typecheck passes, root tests pass 71 files / 253 tests,
    and the scoped detector and `git diff --check` pass. No remaining source/test references exist.

- [x] Refactor: retire the unreachable legacy ItemArray editor.
  - Evidence: `ItemArrayControl` and `SwitchCaseControl` have no product or Storybook consumers.
    The active `SchemaValueForm` routes structural unions and arrays to
    `StructuralSchemaValueForm`, which already implements the supported nested-array and case
    editing path. `item-array-control.test.tsx` contains one test for this active path alongside
    eight tests that exclusively test the unmounted control.
  - Action: remove the dead controls and their private-only helpers/styles; preserve and rename the
    active nested structural-schema test as a focused SchemaValueForm suite.
  - Scope: retire unreachable editor UI only; no package Form API, catalog data, or persistence
    changes.
  - Contracts: keep active structural union, nested array editing, validation, and commit behavior;
    retain shared initial-value and path-update helpers used by `JsonSchemaContractEditor` and
    `StructuralSchemaValueForm`.
  - Validation: active SchemaValueForm test, Editor typecheck, root suite, candidate detector,
    formatting, consumer audit, and `git diff --check`.
  - Result: removed `ItemArrayControl`, its dead `SwitchCaseControl`, dedicated stylesheet, and
    helpers used only by those controls. Preserved and renamed the nested typed-array assertion as
    `schema-value-form.test.tsx`. The focused test passes, Editor typecheck passes, and root tests
    pass 71 files / 244 tests. The detector reports no size candidates; formatting and
    `git diff --check` pass.

- [x] Refactor: remove the unmounted Event definition/binding editor UI.
  - Evidence: `EventsEditorControl` and `EventBindingsEditorControl` have no product or Storybook
    consumers; their only callers are two UI test suites. Editor `domain/events.ts`,
    `domain/schema/schema-use.ts`, `field-paths.ts`, and the schema selector/options are also
    private to those unmounted controls. `events.test.ts` only tests `eventDataSelection`, now
    private to the retired event-definition editor. Core event records and validation remain used
    by API and Core.
  - Action: remove the unmounted controls and their UI-only adapters, helpers, and isolated tests.
    Preserve Core event types, validation, and API consumers unchanged.
  - Scope: Editor UI-only removal; no Core/API/API-client/Store Yjs or persisted event-contract
    changes.
  - Contracts: preserve Core's event definitions, event data sources/mappings, and validation; no
    active product or Storybook route currently exposes the removed controls.
  - Validation: consumer audit, Editor typecheck, root suite, candidate detector, formatting, and
    `git diff --check`.
  - Result: removed the unreferenced controls, Editor-only duplicate event/schema contracts, and
    their isolated UI/helper tests; removed the retired tests from the Vitest allowlist. Consumer
    search found no remaining references, Editor typecheck passes, and the root suite passes 68
    files / 237 tests. The candidate detector reports no size candidates; changed-file formatting
    and `git diff --check` pass.

- [x] Refactor: reuse Form path lookup in the Editor inspector.
  - Evidence: `app-service/inspector.ts` and `ui/sidebar/properties/CatalogNodeInspector.tsx`
    each define `valueAtPath` by splitting dot paths and traversing object properties. The Form
    package already owns `getPath`, including numeric array segments and escaped record keys.
  - Action: replace both private traversal helpers with the public `@facadeur/form` `getPath`;
    keep InspectorService event and update behavior in the Editor.
  - Scope: remove duplicate Editor form-path logic only; no Core, data-model, or persistence change.
  - Contracts: preserve current nested value lookup and previous-value reporting while using the
    Form package's canonical path grammar.
  - Validation: form-path and Inspector UI tests, Editor/workspace typecheck, root suite, detector,
    formatting, and `git diff --check`. Result: both helpers now call `@facadeur/form` `getPath`;
    focused suites pass 4/4, the root suite passes 69 files / 242 tests, and workspace typecheck
    passes. Detector reports no candidates in the affected paths; Prettier and `git diff --check`
    pass.

- [x] Refactor: share the Form package's record value guard.
  - Evidence: `field/FormField.tsx` and `fields/repeater/RepeaterField.tsx` define the same
    `isRecord` guard, checking for a non-null, non-array object. Both use it to normalize field
    values inside the Form package.
  - Action: move the predicate to a private helper in the existing `field/` domain and import it
    from both components; keep component-specific string-record validation local to FormField.
  - Scope: private Form package deduplication; no Editor, Core, public export, or data changes.
  - Contracts: preserve rejection of null, arrays, and primitives and acceptance of object records.
  - Validation: Form and Editor field suites are included in the root suite (69 files / 242 tests
    pass); workspace typecheck passes. Detector reports no size candidates; Prettier and
    `git diff --check` pass.
