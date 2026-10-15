# Facadeur cleanup plan

- [x] Catalog: bind SVG icons by catalog key and expose dynamic choices.
  - Evidence: Icon Btn still stores a data URI, while icon geometry already lives in
    `ProjectCatalog.icons`; the current transform menu only offers text, props, and tokens.
  - Action: bind the SVG node's `data-icon` to the Icon Btn `icon` prop; resolve its final key to
    catalog geometry in Core. Source choices dynamically from the catalog for both the prop field
    and the SVG transform menu, with no copied enum list.
  - Scope: requested reusable icon binding and editor selection; no custom icon upload flow.
  - Contracts: keep icon IDs as strings, preserve authored SVG children when a key is missing, and
    emit the existing declarative `ElementBuildConfig` shape.
  - Validation: Form and Core typechecks, catalog JSON validation, candidate detector, and diff
    check passed. Editor typecheck remains blocked by existing errors in Inline.tsx, Modal.tsx, and
    Popover.tsx. No test was added or run; the earlier test had been discarded.

Updated: 2026-10-12

## Goal and scope

Keep the Storybook editor working while reducing duplicated ownership and removing retired
architecture. Reuse package-owned behavior and the shared Examples fixtures. Do not add features.

## Current package boundaries

- `apps/editor`: Storybook/editor UI and thin adapters to package APIs.
- `packages/form`: reusable form controls. Editor may bind them to editor state, but should not
  implement native form controls again.
- `packages/core`: catalog controller and catalog/token logic.
- `packages/domain`: shared types only.
- `packages/examples`: canonical fixture/catalog data for Storybook and tests.
- `packages/style-engine`: CSS generation and style previews.
- `packages/codegen`: generate projects from the Catalog.

The API, API client, server, Yjs store, standalone tokens package, renderer-dom package, and
DocumentFile model have been removed from this Storybook-focused workspace. Do not reintroduce
compatibility shims for them. A future server or persistence layer is a separate design task.

## Completed cleanup

- [x] Core: store field exposure on the embedding definition by node UUID.
  - Evidence: `fieldExposure` was accepted both on `NodeConfig` and on `DefinitionConfig` as a
    single definition-wide default. Node ownership made an embedded component decide how its
    parent exposes fields, while a definition-wide value could not configure two instances
    independently.
  - Action: remove `fieldExposure` from `NodeConfig`; make `DefinitionConfig.fieldExposure` a
    UUID-keyed per-instance map; resolve and write each instance's exposure through its parent
    definition; migrate legacy node settings into that map and discard legacy scalar defaults;
    move example mappings from nodes to their definition configs.
  - Scope: preserve the existing per-instance Inspector controls and modes, with no visual UI
    redesign. Remove the obsolete definition-wide default control. Unconfigured instances remain
    flat, and later visited instances continue to win field collisions.
  - Contracts: preserve required fields, preview defaults, recursive schema composition, and
    manual/grouped mappings; map keys must identify reachable embedded definition nodes.
  - Validation: 11 focused field-exposure tests and workspace typechecks passed; scoped ESLint,
    Prettier, schema regeneration, candidate detector, and `git diff --check` passed.

- [x] Design: make the Facadeur workspace and settings concepts responsive.
  - Evidence: `packages/examples/src/facadeur-editor.ts` fixes both root frames at 1280px, the
    workspace canvas at a 500px minimum, and preview/inspector/settings panels at fixed widths;
    these styles overflow narrow viewport frames and make frame selection appear oversized.
  - Action: use full-width outer frames and fluid flex sizing for composed panels; reserve fixed
    dimensions only for deliberate controls such as the navigation rail. Add a mobile-specific
    concept with collapsible-style navigation/inspector affordances because Catalog node inline
    styles do not express media queries. Keep this design-only and reuse the existing fixture
    helpers.
  - Scope: current UI design prototype; no Core/style-engine behavior or CSS cascade changes.
  - Contracts: preserve existing workspace/settings concepts and Catalog format; the mobile
    composition is a separate visual example, not responsive runtime behavior.
  - Validation: example tests, full suite (66 files, 236 tests), Examples and Editor typechecks,
    Storybook build, candidate scan, responsive dimension audit, and `git diff --check` passed.

- [x] Style: use intrinsic frame height and a shared border-box reset.
  - Evidence: Facadeur mockup roots use `height: 100%` although viewport frame hosts measure
    content height; `frame-host.ts` sets `boxSizing` on only `body`, while iframe descendants do
    not inherit it. The editor's `base.css` reset does not cross into those iframe documents.
  - Action: let the mockup roots and shared panel wrappers size from content; add one
    style-engine-owned box-sizing reset and consume it in iframe previews and generated
    `components.css` so both rendering paths agree.
  - Scope: current layout correctness; no Catalog schema or style semantics beyond the standard
    CSS box model baseline.
  - Contracts: keep iframe content-height measurement and node declarations intact; do not add
    reset behavior to design-token-only CSS output.
  - Validation: frame-host and codegen tests, focused examples test, package typechecks, full
    suite (66 files, 236 tests), Storybook build, candidate scan, reset-consumer audit, and diff check.

- [x] Design: compose the Facadeur concepts from schema-backed Catalog components.
  - Evidence: `facadeur-editor.ts` builds workspace and settings pages as large inline trees;
    the settings categories and CSS rules duplicate row markup, and the workspace includes an
    always-visible context menu that represents an active state.
  - Action: extract reusable Header, left/right Sidebar, Canvas, and Shell definitions; use
    schema-backed component instances with preview data for repeated settings-category and CSS
    rule rows (including the active category style); remove the open context menu from the default
    workspace concept; add only icons needed by this design to the shared Example icon catalog.
    Keep one shared header definition with left/right groups and nested desktop/mobile action
    groups; use accessible Save buttons in both responsive groups, show project context and save
    status on desktop, and show the menu on mobile. Switch groups through project-level Catalog
    breakpoint styles (mobile below 1024 px, desktop from the Laptop breakpoint). Omit search until
    it has a real control contract, and keep mobile copy compact. Keep literal fixture copy so raw
    component-property bindings do not appear when an editable definition itself is previewed.
  - Scope: design-only Example Catalog composition. Keep existing page identities and Catalog
    contracts; do not add Core preview/repeater behavior or an event system.
  - Contracts: use existing `definitionRef`, component schema, `previewData.fields`, and global
    breakpoint-style contracts. Align `styleTargetSchema` with the UUID child paths already used
    by style-engine when resolving Catalog nodes. Catalog currently has no runtime array-repeater
    expansion, so row repetitions must use supported component instances; do not claim they are
    driven by an array repeater.
  - Validation: workspace typecheck; full suite (66 files, 237 tests); Storybook production build;
    composed PreviewData resolution and responsive CSS tests; candidate detector and diff check.

- Removed DocumentFile/Flat adapters, legacy-only Core behaviors and tests, and the generated
  DocumentFile schema. Catalog is the active data contract; no shim remains.
- Removed unused API/server/Yjs/token packages and orphaned Editor controls. `packages/form` owns
  reusable native fields; Editor wrappers provide Catalog binding where needed.
- Consolidated Catalog editing and token operations around Core; kept shared example data in
  `packages/examples` and retained Catalog-based project generation.
- Replaced stale architecture and DSL guidance with the current Catalog-based workflow.

Detailed implementation history is in Git and the existing [plan history](plan-history.md). Keep
completed change logs out of this file.

## Remaining follow-up

- [x] Style Engine: nest referenced component styles under their definition root.
  - Evidence: resolving a `definitionRef` replaces its root `nodeUuid` with the instance UUID,
    while child-path styles still target the definition-root UUID and authored descendant rules
    are emitted as unscoped classes.
  - Action: preserve the source root as a style identity on the expanded root; scope child-path
    selectors and descendant-bound authored rules beneath that root class. Keep the instance UUID
    as the editor selection identity.
  - Scope: requested nested styles for referenced child components; no Catalog format changes.
  - Contracts: preserve existing authored selectors, breakpoint behavior, component reuse, and
    code generation output semantics.
  - Validation: Core, Style Engine, Editor, and Codegen typechecks; browser Preview, candidate
    detector, and diff check passed.

- [x] Catalog: clean global style references when deleting a layer.
  - Evidence: `removeCatalogNode` removes the node tree but leaves `globalStyles.block.children`
    paths and authored rule bindings that can point to deleted nodes; style-engine rejects those
    references while rendering the editor.
  - Action: collect UUIDs from the removed subtree and prune child-path entries and authored rules
    bound to any removed UUID. Keep the existing Catalog tree operation cohesive in `tree-ops.ts`.
  - Scope: prerequisite fix for layer deletion; no serialized schema or UI changes.
  - Contracts: preserve unrelated styles, tokens, breakpoints, and Catalog definitions; failed or
    root deletions remain no-ops.
  - Validation: Core typecheck, candidate detector, and diff check passed. No tests run per the
    current task instructions.

- [x] Icons: replace embedded preset SVG data URLs with local Font Awesome Free SVG assets.
  - Evidence: `packages/examples/src/catalog/icons.ts` stores each shared icon as an encoded
    data URL; the catalog is reused by project templates, the Facadeur fixture, and editor
    navigation.
  - Action: use Font Awesome Free Solid as a temporary source, store the selected vector geometry
    in `packages/examples` as serializable `data.viewBox` and `data.paths`, retain the upstream
    license and attribution there, and render the data directly as SVG. Keep the dev Editor's
    runtime icon list in `facadeur-editor.catalog.json`; Examples supplies canonical data when
    that snapshot is authored, while the Editor loads icons only from its catalog. Remove
    temporary package and path-based assets. Keep IDs, names, categories, and the selected icon
    set intact.
  - Scope: current icon asset migration; no icon upload or preset editing behavior.
  - Contracts: replace `IconDefinition.src` with serializable SVG path data; keep stable icon IDs
    and Core validation. The Examples package owns preset geometry and the attribution file.
  - Validation: Examples and Core typechecks passed; Editor typecheck reports existing errors in
    `Inline.tsx`, `Modal.tsx`, and `Popover.tsx`; all 24 preset entries contain 23 unique SVG
    geometries; browser confirmed each rendered inline SVG is visible; candidate detector and
    `git diff --check` passed. Tests and build were not run.

- [x] Refactor: separate Catalog subtree deepcopy from insertion.
  - Evidence: `tree-ops.ts` previously performed recursive ID replacement inline while also
    placing the clone into a target definition.
  - Action: keep the recursive fresh-ID clone and bound-style remapping in a private tree helper;
    let the existing insertion operation place its result. Defer component creation to a later
    change.
  - Scope: prepare the existing clipboard insert path for a future component insertion strategy.
  - Contracts: preserve recursive node data, fresh UUIDs, style bindings, and existing paste
    behavior; Core remains independent of Editor.
  - Validation: focused layer clipboard tests, Core and Editor typechecks, full suite (66 files,
    239 tests), candidate detector, and diff check passed.

- [x] App: keep Next workspace aliases from capturing package subpaths.
  - Evidence: the broad `@facadeur/core` Webpack alias also matches
    `@facadeur/core/default-breakpoint-ids`, producing an invalid `src/index.ts/...` path in
    `pnpm dev` and a Watchpack `ENOTDIR` scan.
  - Action: make workspace aliases exact package-name aliases so package subpaths resolve through
    their declared `exports` entries.
  - Scope: fix dev-server module resolution; preserve existing root package imports and workspace
    transpilation.
  - Contracts: keep public package subpath exports usable from the Editor.
  - Validation: Editor typecheck passed; `pnpm dev` compiled and `/` returned HTTP 200 with no
    module-resolution or Watchpack scan errors; the app rendered in the browser; candidate scan
    and diff check passed.

- [x] App: seed the dev editor with a Facadeur-only JSON Catalog snapshot.
  - Evidence: `EditorBootstrap` previously started from the full Example Catalog, while the
    Storybook story has a separate fixture bootstrap; the app's catalog export serialized the
    live Catalog.
  - Action: add a curated Catalog factory containing Facadeur components/pages, shared tokens,
    required icons and responsive global styles; generate an editable JSON seed and use it only
    in the app bootstrap. Make the app's Save action download the current JSON snapshot and clear
    the dirty indicator.
  - Scope: app-only JSON seed and download-based save/export; no DB, API, autosave or Yjs.
  - Contracts: retain the existing ProjectCatalog JSON shape and stable Facadeur IDs/references;
    leave Storybook's full example fixtures unchanged.
  - Validation: app and Examples typechecks, snapshot/factory comparison, candidate scan, and diff
    check. (Automated tests were not run.)

- [ ] Examples: review `form-controls-section/dom.ts` for a component boundary.
  - Evidence: the 526-line Catalog node tree contains multiple sections of form-control examples
    and repeated `definitionRef` setup.
  - Action: check whether repeated preview setup can be composed from existing schema-backed
    Example components while preserving the current specimen and its stable IDs.
  - Scope: backlog; unrelated to the Facadeur editor concept composition.
  - Contracts: retain canonical Example IDs, form package ownership, and current preview data.
  - Validation: focused Example Catalog validation and visual Storybook inspection.

- [x] Design: build a Facadeur editor UI prototype in Examples.
  - Evidence: the current reusable Catalog pages are form/specimen demonstrations; they do not
    provide a screen-level design for the Facadeur editor. The current document supports node
    styles and project breakpoints, but has no stylesheet rule model for global selectors or
    active class declarations.
  - Action: add separate Catalog pages for a redesigned editor workspace and global-style
    settings. Use stable Example IDs and existing Catalog/Node/style contracts; render CSS
    provenance as clearly separated visual groups without claiming real cascade behavior. Make
    the editor Storybook composition open the workspace prototype by default.
  - Scope: design-only prototype; existing examples remain available. Exclude variants and product
    logic, new APIs, persistence, and real event management. One-off visual parts stay in the
    page tree; extract reusable example components only when genuine reuse appears.
  - Contracts: preserve current Example exports and IDs; add pages through the existing Catalog
    shape. Keep source identities visually distinct (local, active class, inherited, global), keep
    CSS property names fixed while showing editable value affordances, and represent context-menu
    layer actions. Use no native form-element implementations in the Catalog mockup.
  - Validation: Examples and Editor typechecks, canonical Example Catalog tests (66 files / 236
    total tests in the full run), Storybook build, no-variant/API audit, candidate detector rerun,
    and diff check passed.

- [x] Refactor: decouple project/layer sidebar and inspector from Core.
  - Evidence: `ui/sidebar/layers` and `ui/sidebar/properties` receive `AppService`,
    `EditorSession`, or full `EditorSnapshot`; layer/asset controls compute Catalog rules and
    invoke Core-backed workflows directly. The Inspector consumes a Core-derived model.
  - Action: organize sidebar UI under `base/`, `left/`, and `right/`; add editor-owned flat
    sidebar DTOs/adapters to the existing session snapshot; route minimal typed intents through
    `AppService` for resolution, validation, persistence, selection, and drag operations. Build
    Storybook/test DTOs from the canonical Examples Catalog.
  - Scope: complete; settings panels remain unchanged.
  - Contracts: preserve asset create/open/rename/delete, layer selection/context actions/drop
    zones and legal moves, inspector fields/tabs/form values, notices, and persistence behavior.
  - Validation: DTO-only sidebar tests, Example adapter and service behavior tests, workspace
    typecheck/full tests/Storybook build, import audit, candidate detector, and diff check.

- [x] Refactor: standardize root-level sidebar events.
  - Evidence: Sidebar controls currently expose `onIntent` and individual callbacks; service
    dispatch is repeated in Shell, Storybook stories, and UI tests, so the event boundary is not
    a single consistent contract.
  - Action: define a string-valued `EditorEventType` enum and a payload map that derives a
    discriminated `EditorEvent` union; pass one event callback to sidebars and dispatch events
    only at the Shell/root boundary to `AppService`.
  - Scope: complete as a follow-up to sidebar/Core decoupling; keep current behavior and service
    ownership.
  - Contracts: preserve minimal ID/action payloads, typed form values, selection, asset and
    layer actions, drag zones, notices, and persistence behavior.
  - Validation: DTO-only UI event assertions and integration coverage; workspace typecheck, full
    tests, Storybook build, import audit, and candidate detector passed.

- [x] Refactor: route editor UI actions through the root event boundary.
  - Evidence: `EditorShell` handles sidebar events, while toolbars, viewport/font/token editors,
    schema/props panels, and preview stages call `EditorSession` or `AppService` mutations
    directly. This spreads action ownership and makes behavior harder to change consistently.
  - Action: extend the single typed `EditorEvent` contract for user actions; child UI emits events
    and keeps only presentation/draft state. `EditorShell` is the sole UI event coordinator:
    it routes navigation locally and delegates data/catalog operations to `AppService`. Keep
    AppService focused on editor operations, with no navigation responsibilities. Preserve the
    existing AppService read/query API where needed; pointer/canvas interaction internals stay
    with their dedicated stage controllers unless they cross the UI action boundary.
  - Scope: current cleanup; do not change features or Core/persistence semantics.
  - Contracts: preserve viewport, token/font, schema/props, preview, tool/zoom, sidebar actions,
    keyboard behavior, notices, and save/persistence behavior. Maintain one public EditorEvent
    union, without parallel action-event types.
  - Validation: UI event assertions and behavior tests, editor typecheck, full suite (66 files,
    235 tests), Storybook build, direct-mutation/import audit, detector rerun, and diff check.

- [x] Refactor: reuse the root event boundary in Storybook compositions.
  - Evidence: `left-sidebar.stories.tsx` reimplements navigation, asset opening/creation, and
    AppService dispatch in a local handler; the context-menu test repeats part of that routing.
  - Action: extract the root event coordinator as a focused Editor composition helper and reuse
    it from `EditorShell`, Storybook stories, and focused composition tests. Keep navigation
    injected by the composition root; AppService remains responsible for editor operations only.
  - Scope: current follow-up; no feature or Core/persistence changes.
  - Contracts: preserve the single EditorEvent union, navigation behavior, asset lifecycle, and
    AppService operation ownership.
  - Validation: focused tests (3 files, 8 tests), editor typecheck, Storybook build, detector
    rerun, and diff check.

- [x] Refactor: separate the editor host from the presentational AppShell.
  - Evidence: `EditorShell` currently creates/fetches `AppService`, subscribes to editor state,
    owns navigation and event dispatch, and also renders the UI. Keyboard shortcuts and several
    stage/settings children still call AppService or EditorSession directly, so a Storybook
    composition cannot replace the host without inheriting runtime behavior.
  - Action: move runtime creation, subscriptions, navigation, keyboard command translation,
    event dispatch, and surface composition into `EditorHost`. Make `AppShell` receive the editor
    snapshot, display labels, composed main content, and `onEvent`; it no longer accepts
    `AppService` or `EditorSession`. Update the Storybook app story to use the replaceable host.
    Keep `AppService` as the operation boundary.
  - Scope: current cleanup; preserve existing editor and Storybook behavior. The stage's DOM
    interaction hooks still receive runtime adapters for catalog reads and session view state;
    a future stage-specific contract can remove those direct reads without changing AppShell.
  - Contracts: preserve the single `EditorEvent` union, navigation, keyboard behavior, selection,
    Catalog operations, notice/error handling, save/export, schema/token editing, and stage
    geometry/drag behavior. Avoid adding a second event union or a new store.
  - Validation: editor typecheck, full tests (66 files, 235 tests), Storybook build, AppShell
    service/session import audit, detector rerun, and diff check passed. Existing integration tests
    cover host wiring and event behavior.

- [x] Refactor: route Catalog queries through Core.
  - Evidence: Editor session, stage, schema/props panels, layer tree, and Inspector still read
    Catalog fields directly or pass the whole Catalog to helpers such as viewport-board creation,
    definition labeling, and layer tag resolution. `ProjectCatalogModel` is only a type alias for
    `ProjectCatalog`.
  - Action: add focused CoreController queries for active/configured breakpoints, definition
    lookup/display names and summaries, effective node tags, schemas, design props, design preview
    data, and project style suggestions. Migrate consumers; remove the Editor Catalog query helpers
    and the `ProjectCatalogModel` alias. Keep editor-only presentation and snapshot formatting in
    Editor. Keep raw Catalog access only for explicit whole-document operations such as export,
    initial fixture input, dirty comparison, and the Catalog port.
  - Contracts: preserve UUID identity, schema-derived display-name fallback, recursive instance
    tag resolution and cycle fallback, breakpoint ordering/enabled filtering, sorted UI labels,
    and Catalog serialization. Do not change Catalog shape or add compatibility shims.
  - Validation: focused Core query and Editor behavior coverage, workspace typecheck and full tests,
    consumer audit, detector rerun, formatting, and `git diff --check`.
- [ ] Decide whether Settings token labels/search should use the same CSS custom-property names as
      compiled styles. The current preview uses `--fcdr-` plus a hyphenated token path, while Core's
      compiler naming is different. After the display/search contract is decided, consolidate naming
      at the Style Engine boundary and cover both labels and compiled CSS with focused tests.

- [x] Editor: edit layer styles through name-derived global class rules.
  - Evidence: the Inspector previously exposed `node.style` declarations, while Catalog global
    style rules already supported selectors, node bindings, and sparse breakpoint overrides; the
    preview did not apply those global rules.
  - Action: derive a valid class selector from each layer name, group its CSS controls in a
    collapsible layer section, and edit base or per-viewport declarations through global style
    rules. Apply compiled rules in iframe previews. On first edit, migrate that layer's legacy
    `node.style` declarations into its class rule; keep the selector synchronized with renames.
  - Scope: Editor inspector style workflow; no second style format or dependency.
  - Contracts: preserve selector bindings, token/raw CSS values, sparse breakpoint overrides,
    undo/history, legacy catalog style values, and generated CSS behavior.
  - Validation: Core and Editor typechecks, candidate detector rerun, formatting, and
    `git diff --check` passed. Tests were not run because they were not requested.

## Refactoring review

The maintained-source candidate scan found two size signals and one directory concentration
signal. The review decisions are:

- `packages/core/src/controller/project/controller.ts` (569 lines): the single Core catalog
  coordination facade, including its public query surface. Query implementations live in the
  adjacent `catalog/queries.ts` module; nested preview updates delegate to a Catalog operation.
- `packages/examples/src/form-controls-section/dom.ts` (526 lines): one canonical reusable
  Catalog fixture tree.
- `apps/editor/src/app-service/AppService.ts` (565 lines): one event-to-operation coordinator;
  its switch is the single dispatch boundary and its private helpers own related Catalog actions.
  Splitting cases into per-event services would scatter the operation contract again.
- `packages/core/src/controller/project/catalog` (12 direct source files): keep the files together
  because they all implement Catalog-owned queries, validation, tree, definition, and style
  operations. The new layer-style behavior belongs in this domain and the existing `index.ts`
  remains its public boundary; a finer split would add indirection without separating ownership.
- `packages/examples/src/facadeur-editor/components.ts` (688 lines): retain the non-header
  definitions, schemas, preview defaults, and registry together as one cohesive Catalog component
  set for the Facadeur design concepts. The responsive header lives in `header.ts` because its
  breakpoint-based layout changes independently from the other design components.

## Latest verification

The earlier batch passed workspace typecheck and the full test suite (64 files, 231 tests).
Formatting, source/import audits, candidate review, and `git diff --check` also passed. The
Storybook build still prints existing Vite `use client`, sourcemap, and large-chunk warnings.

- [x] Editor: create a component from a copied layer subtree.
  - Evidence: `Copy as component` currently shares `copyContextLayer` with `Copy layer`, so it
    only changes the AppService's transient layer clipboard and creates no catalog asset.
  - Action: give component creation its own editor event and AppService operation. Reuse Core's
    existing subtree duplication so node IDs and bound global style rules are cloned; create a
    component named after the layer with that cloned node as its root, then open it. Keep the
    existing clipboard event and paste behavior exclusive to `Copy layer`.
  - Scope: requested context-menu behavior; retain AppService as the cohesive event-to-operation
    coordinator and leave clone identity/style semantics in Core.
  - Contracts: preserve source node data, remap cloned IDs and in-subtree style bindings, keep the
    generated component's root equal to the clone, and do not alter the normal layer clipboard.
  - Validation: focused layer-navigation test (6 tests), Editor typecheck, ESLint, Prettier,
    candidate detector, and `git diff --check` passed.

- [x] Editor/Core: configure static and exposed fields per embedded child from the root Config tab.
  - Evidence: the Config tab previously listed only the definition's own schema fields; fields inherited from child definitions were controlled only by their `fieldExposure` mode, while static settings were keyed only by field name and could not distinguish repeated child instances.
  - Action: add a per-instance field settings map keyed by embedding node UUID, derive each instance's available fields from its inheritable schema, and reuse the existing field settings control. Show the child label plus UUID context in Config so duplicate names remain independently editable. Apply instance-scoped static/expose settings in schema resolution, validation, and preview resolution. Put flat/grouped/manual exposure controls in each child group on the root Config tab, including the configurable group name, and remove them from individual node selection.
  - Scope: requested continuation of static defaults; preserve existing flat/grouped/manual `fieldExposure` behavior and the existing collision winner ordering.
  - Contracts: child static values are defaults in the parent schema only when exposed; unexposed static fields are omitted; changing child schema remains reflected automatically; per-instance configuration does not mutate the child definition; preserve undo, catalog serialization, token values, and strict validation.
  - Validation: Domain/Core/Form typechecks, schema JSON inspection, ESLint, Prettier, candidate detector, and `git diff --check` passed. Editor typecheck reports existing errors in `Inline.tsx`, `Modal.tsx`, and `Popover.tsx`; tests were not run.
- [x] Refactor: isolate static field configuration and Config-tab field discovery.
  - Evidence: static field transitions and Config-tab field discovery had been added to `controller.ts` and `inspector-view.ts`, which crossed the candidate detector threshold during this feature.
  - Action: move static config transitions/default selection to a Catalog-owned helper, leaving `CoreController` to commit returned catalog snapshots. Move root Config field discovery to a private preview inspector helper; retain form layout and path mapping in `inspector-view.ts`.
  - Scope: prerequisite cleanup within per-instance static field settings.
  - Contracts: preserve UUID-keyed instance settings, preview clearing, child schema defaults, undo/commit behavior, inspector identity, and existing public APIs.
  - Validation: Domain/Core/Form typechecks, ESLint, Prettier, detector rerun, and `git diff --check` passed. Editor typecheck reports the existing `Inline.tsx`, `Modal.tsx`, and `Popover.tsx` errors; tests were not run.
  - Refactoring review: `CoreController` remains above the detector's 450-line signal because it is the cohesive catalog command coordinator; field config transitions now live in Catalog, and Config field discovery lives beside the preview inspector.

- [x] Core/Editor: offer the open component's props when binding a selected child instance.
  - Evidence: `buildInspectorFormModel` scopes the selected child to its referenced definition for the inspector fields and also passes that child schema to `designPropOptions`. This makes the binding picker list the child component's own `props.*` fields, while grouped fields exposed by the open parent component are absent.
  - Action: keep the selected child's schema for its preview and property fields, but derive component binding options from the open definition's effective schema. The existing recursive `componentPropsForSchema` already produces UUID-backed paths for nested/grouped properties.
  - Scope: fix the binding context for the current grouped exposure workflow; keep UUID references, field resolution, and preview defaults unchanged.
  - Contracts: offer the same fields in the open definition's effective schema, including nested group paths; retain catalog design-prop options and existing component prop reference encoding.
  - Validation: Core typecheck, candidate detector, and `git diff --check` passed. The active editor was not reloaded for a visual check.

- [x] Core/Editor: make grouped parent fields editable and binding state identifiable.
  - Evidence: nested object controls emit paths such as `nodeData.menuBtn.label`, but `patchNodeData` stores the entire suffix as one field key, so the schema-backed value does not change. Also, two instances of the same definition inherit the same schema property UUIDs; `componentPropsForSchema` deduplicates by UUID, so grouped fields can disappear or collide in the binding picker. A stale component-prop binding is rendered with a design-prop fallback and can therefore appear blank. At runtime, explicit instance data was merged after grouped parent values, so it masked parent edits; effective grouped defaults also ignored the embedding node's own values.
  - Action: apply node data and preview field changes by nested path, preserving sibling values. Give inherited schema properties stable UUID identities scoped to the embedding instance and source field, so repeated instances expose distinct bindings while repeated schema resolution stays stable. Resolve child instance bindings against the containing component's effective props and display a clear missing-binding option when a stored reference is not present in the current picker options. Derive inherited preview defaults from the embedding node and let explicit parent exposure values win over child preview defaults and instance data.
  - Scope: make grouped parent preview fields editable and independently bindable; retain existing field names, grouped defaults, flat/manual exposure, and prop-reference format.
  - Contracts: nested preview data remains an object in Catalog; inherited prop refs remain UUID-backed and resolve to the correct instance field; direct child prop IDs remain unchanged.
  - Validation: Core and Editor typechecks, Prettier, candidate detector review, and `git diff --check` passed. Tests were not run.

- [x] Editor: prototype the schema form and catalog manager separately in Storybook.
  - Evidence: the current `SchemaEditor` only edits one schema; the existing catalog screen also manages selection, search, creation, deletion, and saving, which the prototype does not yet demonstrate.
  - Action: keep `SchemaEditor` as a controlled single-schema form and add a separate controlled catalog manager that receives schema entries and emits selection, create, change, delete, and save events. Keep catalog state and fixture data in the Storybook host.
  - Scope: Storybook prototype only; no application wiring, jsonjoy changes, dependency changes, or Core resolution work.
  - Contracts: serialize standard JSON Schema; preserve supplied schema keywords when editing supported fields; `$ref` choices are opaque strings supplied by the host so future resource kinds can be added by the host; all management state changes are emitted to the host.
  - Validation: Storybook build and Editor typecheck passed; Storybook play interaction passed while selecting existing schemas, creating/editing/deleting a schema, and saving; Prettier, candidate detector, and `git diff --check` passed.

- [x] Storybook: make the preview root scrollable.
  - Evidence: the shared app stylesheet sets the preview document's `html` and `body` to `overflow: hidden`, while Storybook's `#storybook-root` has no scrolling container; long stories cannot scroll.
  - Action: add Storybook preview-only CSS setting `#storybook-root` to `height: 100%` and `overflow-y: auto`.
  - Scope: apply to every Storybook story without changing the running app's layout.
  - Contracts: preserve story canvas sizing and allow vertical scrolling when story content exceeds the viewport.
  - Validation: the local Storybook browser reports `overflow-y: auto` on `#storybook-root`, with content height (1721px) greater than viewport height (642px); candidate detector and `git diff --check` passed.

- [x] Storybook: separate schema field presets and make catalog references selectable.
  - Evidence: `SchemaEditor.tsx` built repeated form controls inline and encoded reference groups as disabled pseudo-options. Empty reference values fell back to the first option, and switching to a reference kind briefly emitted `{}` because no `$ref` existed yet.
  - Action: extract parameterized, data-only schema form presets with shared field metadata (`title`, `description`, `required`) and explicit Select `options`, `placeholder`, and optional `preselected` data. Keep schema state and catalog CRUD in the Storybook host. Replace pseudo-options with real labeled catalog choices and ensure the controlled Select displays its placeholder while its value is empty. Default a newly selected reference kind to a valid host-supplied ref; preserve root, property, and array-item refs as `$ref`.
  - Scope: continue the Storybook schema-editor prototype; extend `packages/form` only for the controlled Select placeholder behavior required by these presets.
  - Contracts: preserve standard JSON Schema serialization, opaque host-supplied ref strings, controlled change emission, existing enum/object/array behavior, and public form control behavior when no placeholder is provided.
  - Validation: Storybook play interaction passed for creating/selecting catalog refs at root/property/array-item levels and verifying `$ref` serialization. Form and Editor typechecks, Storybook build, Prettier, candidate detector rerun, and `git diff --check` passed.

- [x] Storybook: improve schema field cards with a compact accordion header.
  - Evidence: `PropertiesEditor` renders every control expanded in a `fieldset`, repeats the type selector in the body, and uses a wide text button for removal; the schema shape is difficult to scan.
  - Action: use the existing `packages/form` controls individually, keep parameterized `getField` as their shared config source, and put the chevron, editable name and description, type selector, required toggle, and accessible remove control in the header. Only the chevron toggles the body, which holds the title/display name and field-specific configuration such as enum values, references, and nested object/array settings.
  - Scope: Storybook schema editor presentation; use local layout styles and public controls from `packages/form`.
  - Contracts: preserve controlled schema updates, field order (Type, Title, Name, Description), required membership, enum/ref/array behavior, nested editors, and accessible labels. Name, description, and required remain editable while collapsed, and their controls do not toggle the card.
  - Validation: Storybook play interaction passed for editing collapsed header metadata and required status, expanding/collapsing cards, changing field type, removing a field, and preserving root/property/array `$ref` selection; Form and Editor typechecks, Storybook build, Prettier, candidate detector rerun, and `git diff --check` passed.

- [x] Storybook: provide browsing stories separately from the interaction playground.
  - Evidence: `SchemaEditor.stories.tsx` currently exports only `Playground`, whose play function runs the integration interaction sequence whenever it is opened.
  - Action: add a normal interactive catalog manager story and a focused single-schema form story; keep the automated interaction sequence only on `Playground`.
  - Scope: Storybook examples only; do not change editor behavior or application wiring.
  - Contracts: examples remain controlled by Storybook-local state and use catalog fixtures/references; opening browsing stories does not launch a play sequence.
  - Validation: Storybook production build passed and generated `Catalog Manager`, `Single Schema`, and `Playground` entries; Editor typecheck, Prettier, candidate detector, and `git diff --check` passed. The already-running dev server kept its old story index and needs a restart before the two new entries appear there; its Playground play interaction remains separate and unchanged.

- [x] Storybook: preserve property fields when adding after deletions and edit string constraints.
  - Evidence: `SchemaPropertiesEditor` derives the new key from property count, so sparse names can collide and overwrite an existing schema. The property body currently omits string `minLength`, `maxLength`, `pattern`, and `format` controls requested for field configuration.
  - Action: generate the next unused `fieldN` key; add controlled configuration inputs for the four standard JSON Schema string keywords, preserving unknown schema keywords and removing a constraint when its input is cleared. Reuse `packages/form` NumberField and TextField.
  - Scope: Storybook schema editor prototype; no application wiring or schema contract changes.
  - Contracts: avoid replacing existing properties after deletion gaps; serialize constraints with JSON Schema's numeric/string types; preserve schema property ordering, required membership, references, and same-kind annotations.
  - Validation: Playground interaction passed with a deleted-key gap and verified constraints serialize with the expected types and disappear when cleared; Editor/Form typechecks, Storybook production build, Prettier, candidate detector, and `git diff --check` passed. The Storybook build still reports the existing Vite client-directive, sourcemap, and large-chunk warnings.

- [x] Editor: replace legacy JSON Schema authoring controls with the Storybook editor.
  - Evidence: CatalogSchemasPanel and inline-schema editing in CatalogSchemaStage still render JsonSchemaTypeEditor from jsonjoy-builder, while the controlled SchemaCatalogEditor/SchemaEditor prototype already covers catalog management and JSON Schema editing in Storybook.
  - Action: adapt the new controlled editors to existing AppService schema events and navigation; use SchemaEditor for inline definition schemas; remove the superseded visual JSONJoy type editor, its deep import declaration, and its CSS. Keep JsonSchemaContractEditor and its JSONJoy provider because it edits schema-backed values, not schemas.
  - Scope: replace schema authoring UI in the app with the Storybook-proven editor; no change to serialized JSON Schema or event/data contracts.
  - Contracts: preserve schema CRUD/save behavior, current surface navigation, UUID identity, display titles, inline vs shared definition schema selection, schema references, and preview defaults; keep existing Storybook manager/form stories working.
  - Validation: Editor/Form typechecks, Schema Editor Playground interactions, App/Editor Catalog Storybook interactions, Storybook production build, Prettier, candidate detector, and `git diff --check` passed. The Editor app build compiled but its lint phase is blocked by the pre-existing unused `EditorSurface` import in `DesignDomainStage.tsx`.

- [ ] Editor: restore full-height layout and scrolling for the catalog schema view.
  - Evidence: unlike the neighboring settings views, `SchemaCatalogEditor` renders directly as workspace content and its `.catalog` styles only add padding; it lacks the stage's flex sizing, `min-height: 0`, and a bounded scroll region, so the view does not inherit the app's layout defaults.
  - Action: make the catalog editor a full-height flex column with a fixed header and an independently scrollable content area; stack the schema list and editor at narrow widths and compact property-card headers based on their available width.
  - Scope: layout only for the new catalog schema view, shared by the app and Storybook stories.
  - Contracts: preserve schema editing, list selection, CRUD/save events, current header content, and small-screen layout.
  - Validation: inspect the app Storybook view at desktop and narrow widths; Editor typecheck, Storybook build, Prettier, candidate detector, and `git diff --check`.
