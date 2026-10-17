# Facadeur cleanup plan

- [x] Examples/Editor: add a reusable Icon atom backed by project icon references.
  - Evidence: Core already resolves an SVG node's `data-icon` key against `ProjectCatalog.icons`, but the reusable example atoms do not expose an SVG Icon atom; the app seed only has an Icon button component.
  - Action: add an `Icon` atom with an Icon-target schema reference, a `data-icon` prop binding, and a preview default; merge that atom into the Editor seed catalog alongside its existing Tree Node example.
  - Scope: reusable project icon rendering only; keep SVG geometry resolution in Core and leave icon upload and SVG editing out of scope.
  - Contracts: use stable prop IDs and catalog icon IDs, render the selected icon's existing path geometry directly in the SVG root, and add no wrapper element.
  - Validation: Examples and Editor typechecks, Prettier, targeted UUID search, candidate detector rerun, and `git diff --check` passed; tests were not run. The repository UUID-check script could not run because it imports a non-exported `console` from `node:console`.
  - Structure: keep the definition under Examples, which owns reusable catalog fixtures; keep seed composition in `EditorBootstrap`, where the app already adds the Tree Node fixture.

- [x] Core: keep default flat field exposure from shadowing local fields.
  - Evidence: inserting `Css Rule Set` into `CSS rule row` reproduces `Invalid repeater source on node "Repeater"`: both definitions expose a `rules` field, and the child’s default flat exposure replaces the parent’s schema property ID, invalidating the parent Repeater source.
  - Action: when an unconfigured child instance has any field-name collision with the owning definition’s effective fields, default that instance to grouped exposure under a unique instance label. Use the same inferred exposure in the Inspector config UI; preserve explicitly configured flat, grouped, and manual exposure.
  - Scope: default field exposure for nested component instances; do not rename user schema fields or alter persisted node data.
  - Contracts: keep local schema properties and their UUIDs stable, preserve existing explicit exposure choices and non-colliding flat exposure, and keep the derived group name deterministic.
  - Validation: Core and Editor typechecks, in-memory catalog insertion and preview-resolution reproduction, Prettier, candidate detector rerun, and `git diff --check` passed; tests were not run.
  - Structure: keep collision detection with effective schema composition in `field-contract.ts`; have preview resolution and Inspector config consume that same helper rather than duplicating the rule. `resolve.ts` remains the cohesive recursive preview-tree walker.

- [x] Editor: include CSS shorthand properties in the layer declaration picker.
  - Evidence: `LayerStylesEditor` derives available names only from `getComputedStyle`, which
    enumerates resolved longhands and omits unset shorthands such as `padding`, `margin`, and
    `border-radius`; declarations already present on the selected layer are appended separately.
  - Action: expose a static list of standard and vendor CSS properties, including shorthand names;
    retain existing declarations that are absent from that list so custom or legacy properties
    remain editable. Remove the browser CSSOM discovery and runtime support filter.
  - Scope: property choices for adding layer declarations; keep the existing per-breakpoint
    declaration and override behavior unchanged.
  - Contracts: preserve existing declaration names, custom-property choices, and breakpoint
    behavior; avoid duplicate options. Property availability is based on the checked-in list,
    independent of the browser running the editor.
  - Validation: Editor typecheck, Storybook production build, Prettier, candidate detector, and
    `git diff --check` passed. The property list stays in a dedicated data module because it is
    generated static vocabulary, separate from the cohesive editor behavior. Automated tests were
    not run.

- [x] Core/Editor: support one default child slot for component instances.
  - Evidence: Repeater and Switch already expand their own authored `dom.children` as templates,
    but a fixed or dynamic `definitionRef` expands the referenced definition and currently ignores
    the referencing node's `dom.children`. Sidebar drag targeting only recognizes `frame` and
    `instance`, while Core's current child check only excludes a partial list of void HTML tags.
    Neither rule models whether a component actually accepts children.
  - Action: add one explicit, render-positioned default Children/Slot outlet to component
    definitions. This is structural template content, not a persisted `canHaveChildren` flag.
    Derive a catalog-aware child capability for each authored node and expose it as a computed
    sidebar DTO field. Ordinary non-void DOM nodes and Repeater/Switch template nodes can accept
    children; component instances can accept them only when their referenced definition declares
    exactly one default outlet. Components without an outlet and void HTML nodes cannot accept
    children. Use the same Core-owned capability for sidebar drop zones, canvas placement,
    insertion/move/paste operations, and Catalog validation. Resolve instance-authored children at
    the outlet in the shared Core preview/codegen resolver, in the embedding definition's data
    context, so preview and generated examples agree. Prevent authoring more than one default
    outlet; leave named slots for a later extension.
  - Scope: first default slot only; no named/multiple slots, new per-node capability flag, or
    changes to current Repeater/Switch template semantics.
  - Contracts: preserve existing `definitionRef`/`definitionRefBinding` identities, child order,
    style UUID bindings, preview data and item context, and common preview/codegen resolution.
    Reject or diagnose instance children when the target has no default slot, and reject a second
    default slot in one component definition. For dynamic references, permit authored children
    only when every schema-allowed target definition has the default slot.
  - Validation: Core and Editor typechecks, Prettier, Storybook production build, candidate
    detector, and `git diff --check` passed. Focused automated tests were not run.
  - Refactoring review: keep child capability and slot count in Core's Catalog tree operations,
    with its shared preview expansion in `resolve.ts` and catalog invariants in `validate.ts`;
    these are the existing owners for the corresponding semantics. The detector flags
    `validate.ts`, `resolve.ts`, `inspector-view.ts`, and `AppService.ts` by size. The inspector
    change only excludes slot outlets from source controls. `AppService.ts` remains the existing
    command router; this change only threads catalog context to existing placement paths. No new
    responsibility or duplicated resolver/validator was introduced.

- [x] Schema editor: warn about forced recursive catalog schema references.
  - Evidence: schema `$ref` values can connect catalog schemas in direct and indirect cycles; the editor currently exposes no diagnostic when a cycle has no optional-field or array exit.
  - Action: derive a reference graph from catalog schema entries, detect cycles that remain after optional-property and array-item edges are treated as termination points, and show a non-blocking warning for the selected schema. Bound dynamic component expansion in the shared preview/codegen resolver so recursive data cannot overflow the call stack.
  - Scope: catalog and inline schema editing surfaces; no new reference format or strict recursion prohibition.
  - Contracts: preserve `$ref` values and allow saving recursive schemas; describe the detected path and note that union analysis is heuristic. Dynamic component recursion remains allowed up to a 32-level expansion limit.
  - Validation: Core and Editor typechecks, Prettier, Storybook production build, candidate detector, and `git diff --check` passed. Added a Storybook example for an indirect required cycle. Tests were not run.

- [x] Catalog: support data-driven repeater and switch nodes for recursive components.
  - Evidence: Catalog node contracts, placement, inspector controls, validation, and Core preview/codegen resolution now cover repeater templates and switch cases; dynamic component references are supported in repeater items.
  - Action: add a Tree Node example with grouped component references and load it alongside the app's JSON seed catalog.
  - Scope: recursive composition of Catalog definitions using schema data. Ordinary DOM nodes and existing fixed `definitionRef` instances remain supported.
  - Contracts: Repeater reads an array prop and renders its child template with each item as
    binding context. Switch reads an enum value and renders the child matching that value. Catalog
    component references remain UUID-based and are validated against allowed catalog targets.
  - Validation: Core and Editor typechecks, inspect Catalog validation and preview/codegen
    behavior, candidate detector and diff check. Do not alter the user's staged seed-catalog JSON.
  - Refactoring review: keep the Catalog composition walk in `resolve.ts` with field binding and
    definition expansion, and keep its new invariants in Catalog validation. The large
    `components.ts` remains the example catalog registry; the new TreeNode itself lives in
    `tree-node.ts`. Existing AppService and Catalog directory boundaries stay intact because
    insertion routing and catalog mutations remain within their current owners.

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

- [x] Catalog: remove legacy node and path style formats after migrating stored catalogs.
  - Evidence: `Node.style` and `globalStyles.block.children` duplicated UUID-bound style rules and
    kept import-time conversion, path parsing, and pruning branches alive after the editor moved to
    bound rules.
  - Action: migrate the checked-in editor Catalog and example fixtures to UUID-bound rules; remove
    the migration helper, legacy schema/type fields, path parser/editing/pruning branches, and
    assertions for retired formats. Keep component prop bindings ephemeral on build config.
  - Scope: finish the requested style-model transition; no Inspector redesign.
  - Contracts: preserve selector bindings, CSS cascade/scoping, tokens, responsive rules, Undo,
    and codegen output. Keep UUID-bound rule cleanup coverage.
  - Validation: workspace typecheck, candidate detector, and `git diff --check` passed. Tests were
    updated for the canonical rule format and were not run in this pass.
  - Refactoring review: `packages/examples/src/facadeur-editor/components.ts` (685 lines) and
    `packages/examples/src/form-controls-section/dom.ts` (526 lines) remain cohesive fixture trees;
    this migration adds no independent responsibility to either. The 13-file Catalog controller
    directory keeps related Catalog queries, validation, tree, definition, and style operations at
    their current package boundary.

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
  - Validation: Core typecheck, regression coverage for removed subtree paths/bindings and
    unrelated-style preservation, candidate detector, and diff check passed.

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
  - Evidence: the Inspector previously exposed per-node `node.style` declarations, while Catalog
    global style rules support selectors, node bindings, and sparse breakpoint overrides.
  - Action: derive a valid class selector from each layer name, group its CSS controls in a
    collapsible layer section, and edit base or per-viewport declarations through global style
    rules. Apply compiled rules in iframe previews and keep selectors synchronized with renames.
    Catalog definitions now store style only as UUID-bound rules; `Node` has no style property.
  - Scope: Editor inspector style workflow; no second style format or dependency.
  - Contracts: preserve selector bindings, token/raw CSS values, sparse breakpoint overrides,
    undo/history, canonical catalog style rules, and generated CSS behavior.
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
- `apps/editor/src/app-service/AppService.ts` (614 lines): one event-to-operation coordinator;
  its switch is the single dispatch boundary and its private helpers own related Catalog actions.
  Splitting cases into per-event services would scatter the operation contract again.
- `packages/core/src/controller/project/catalog` (13 direct source files): keep the files together
  because they all implement Catalog-owned queries, validation, tree, definition, and style
  operations. The new layer-style behavior belongs in this domain and the existing `index.ts`
  remains its public boundary; a finer split would add indirection without separating ownership.
- `packages/examples/src/facadeur-editor/components.ts` (688 lines): retain the non-header
  definitions, schemas, preview defaults, and registry together as one cohesive Catalog component
  set for the Facadeur design concepts. The responsive header lives in `header.ts` because its
  breakpoint-based layout changes independently from the other design components.
- `packages/core/src/controller/project/node/preview/resolve.ts` (528 lines), `inspector-view.ts`
  (494 lines), and Catalog `validate.ts` (538 lines): keep the preview walker, declarative
  Inspector model, and Catalog invariants in their current owners. This change adds composition
  branches and a bounded dynamic-reference depth to the existing recursive resolver and validation
  walk without introducing a separate lifecycle or shared behavior that would justify another
  module. The schema editor's independent graph diagnostic remains in its feature directory.
- `apps/editor/src/ui/sidebar/right/components/css-property-options.ts` (508 lines): retain the
  curated CSS property option list as one data-only catalog; splitting its constant entries would
  add navigation without separating behavior or ownership.

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

- [x] Editor: restore full-height layout and scrolling for the catalog schema view.
  - Evidence: unlike neighboring settings views, `SchemaCatalogEditor` renders directly as workspace content and was missing the stage's flex sizing and bounded scroll region.
  - Action: make the catalog editor a full-height flex column with a fixed header and an independently scrollable content area; stack the schema list and editor at narrow widths and compact property-card headers based on their available width.
  - Scope: layout only for the new catalog schema view, shared by the app and Storybook stories.
  - Contracts: preserve schema editing, list selection, CRUD/save events, current header content, and small-screen layout.
  - Validation: inspected the app Storybook view at narrow width and confirmed list/editor stack, field controls remain within the panel, and the schema area scrolls. Editor typecheck, Storybook production build, Prettier, candidate detector, and `git diff --check` passed; the build retains existing Vite sourcemap/client-directive/chunk-size warnings.

- [x] Editor: keep project font resources loaded across editor surfaces.
  - Evidence: `DesignDomainStage` injects `renderDesignCss` locally, so file-backed `@font-face` rules and Google font imports are removed when navigating to the schema surface; shell chrome such as the topbar and project sidebar can then fall back to another font.
  - Action: mount the design stylesheet once in `AppShell` and keep its token declarations scoped to `.design-domain-stage`; remove the per-stage style injection.
  - Scope: preserve project fonts while switching surfaces without applying project token values to the editor shell.
  - Contracts: retain current token values, breakpoint overrides, font sources, and existing design-stage CSS selector semantics.
  - Validation: switched Fonts → Schemas in the App Storybook view; added and passed a regression test verifying the font imports persist while token rules remain scoped. Editor typecheck, the focused design-domain test suite (5 tests), Prettier, candidate detector, and `git diff --check` passed.

- [ ] Core/Editor: replace icon options-source metadata with typed catalog references.
  - Evidence: the Icon Button schema uses the one-off `x-facadeur-options-source: "icons"` keyword, and Core converts that one marker into enum fields inside `inspector-view.ts`; schema editing has no UI for choosing a reusable reference target.
  - Action: represent resource references as string schemas with `x-facadeur-reference: { target }`; make the controlled SchemaEditor accept host-supplied target choices and edit this annotation on string properties. Pass the Icon target from the app schema surfaces, resolve Icon IDs to inspector choices centrally, and validate referenced defaults/field values against the catalog icon IDs. Update the seed Icon Button schema and remove the options-source path.
  - Scope: make icon references authorable and usable through the existing schema and inspector surfaces; keep `$ref` for schema-to-schema references and leave future target kinds additive.
  - Contracts: preserve the string value and stable icon ID (`save`), JSON Schema validity, controlled editor updates, preview rendering, and strict catalog validation; unknown reference targets/IDs must be rejected rather than silently accepted.
  - Validation: focused Core validation and Editor schema UI checks, relevant Core/Editor typechecks, candidate detector rerun, and `git diff --check`.

- [x] Editor: edit static catalog-reference values with their schema control.
  - Evidence: `DefinitionFieldSettings` routes text-like static values through `TransformableField`, even when the field schema declares `x-facadeur-reference`; the ordinary inspector projection already resolves registered reference values to an enum/select.
  - Action: share the reference-options schema projection with root and child config-field models, then route referenced static fields through `SchemaValueForm` so their available catalog values render as a select.
  - Scope: correct static config editing for typed catalog references, starting with icons; no changes to token transforms or serialized static config.
  - Contracts: keep icon IDs as strings, preserve reference metadata and static config paths, and keep unknown literal IDs subject to existing strict validation.
  - Validation: regression tests verify projected config-field options and render the static reference as a select with the selected catalog ID; focused Core/Editor tests (11), Core/Editor typechecks, candidate detector, and `git diff --check` passed.

- [x] Core/Editor: mark array item paths in component prop choices.
  - Evidence: `componentPropsForSchema` traverses `items` using the same display prefix as the array property, so the prop selector shows `props.rules.selector` without indicating that `selector` belongs to an array item.
  - Action: keep stable prop UUIDs and canonical data paths intact while adding `[]` to displayed array-item paths (for example `props.rules[].selector`); update consumers that need canonical paths to use the explicit path field.
  - Scope: make array structure visible in prop selectors only; do not add index addressing or change repeater evaluation.
  - Contracts: preserve persisted `{props:uuid}` references, UUID identity, canonical resolver/codegen paths, and existing non-array labels.
  - Validation: Core and Codegen typechecks, Prettier, candidate detector rerun, and `git diff --check` passed; tests were not run. The detector also reports existing size-review signals in `validate.ts` and `resolve.ts`; this task only updated their use of the canonical path field.

- [x] Core/Editor: unify reference resolution and expose nested repeater scopes.
  - Evidence: `preview/resolve.ts` separately resolves global token UUIDs, component prop UUIDs, and `{item:path}` against one `itemContext`; repeater expansion passes the item but drops its index and replaces any outer item context. `inspector-view.ts` only offers definition props, while the generic `TransformableField` receives prebuilt options. `Node.config.composition` has no index-name override.
  - Action: add a typed Core reference context and resolver for global tokens, definition/component props, repeater-item paths, and repeater indices. Carry a scope stack through Core preview traversal; derive default index labels (`index`, `index1`, ...) from nesting depth and persist only an explicit `indexName` override on the repeater. Expose options from that context to the inspector, keep stable repeater UUIDs as index-reference identity, and adapt existing token/prop/item encodings without changing existing saved references. Keep `TransformableField` as an options-in/value-out control; conditions will consume this resolver in a follow-up step.
  - Scope: establish shared reference and nested repeater-scope foundations for conditions and bindings; no `contains` operator or full condition-builder UI in this step.
  - Contracts: preserve existing `{token:uuid}`, `{prop:uuid}`, `{props:uuid}`, `{item:path}` data and token-interface behavior; stable IDs must survive index-label changes. Preserve current preview/codegen tree shape outside active repeaters and keep global token filtering separate from resolution of already-authored references.
  - Validation: Core, Editor, and Codegen typechecks; Prettier; candidate detector rerun; and `git diff --check` passed. Tests and Storybook interaction were not run in this turn.
- [x] Storybook: author `oneOf` and `anyOf` compositions in the schema form.
  - Evidence: the JSON Schema contract accepts both keywords, but `kindOf` and the schema type selectors expose only primitive, object, array, enum, and reference forms. Editing a composition currently treats it as an object and cannot edit its branches.
  - Action: expose `oneOf` and `anyOf` as schema kinds; add a controlled branch editor that recursively reuses `SchemaEditor` and existing `packages/form` fields. Keep at least one branch and preserve branch schemas and metadata during edits. Keep `SchemaPropertiesEditor` cohesive because its field-card controls share one controlled update path; branch list presentation lives in `SchemaCompositionEditor`.
  - Scope: continue the Storybook schema editor and catalog manager; no new schema keywords, application workflow, or data migration.
  - Contracts: emit standard JSON Schema `oneOf`/`anyOf`; preserve existing branches and surrounding schema metadata; distinguish exact-one from at-least-one semantics in labels; keep object/array/ref/enum editing unchanged.
  - Validation: Editor typecheck, Storybook production build, Prettier, candidate detector, and `git diff --check` passed. The running dev server has a stale story index and could not open the new `Compositions` story for visual inspection; restart it to browse the built story. Tests were not run.
- [x] Core: make stale static-field validation errors actionable.
  - Evidence: schema fields can be renamed or have their types changed while catalog instances still store static values under the old field name or with the old value shape.
  - Action: include the owning definition and, for instance settings, the instance and referenced definition in validation errors; distinguish removed fields from values that no longer match the schema.
  - Scope: improve diagnostics only; no migration or silent config removal.
  - Contracts: preserve catalog data and validation rules; continue rejecting stale configs until the user updates them.
  - Validation: Core and Editor typechecks, candidate detector, and `git diff --check` passed; tests were not run.
- [x] Core/Editor: move element classes and their styles onto Nodes.
  - Evidence: `Node.dom.attributes.class` is copied directly to rendered elements, while layer-specific styles are stored in `catalog.globalStyles.block.rules` under UUID-bound `layer-*` rules. The class list and its styles are therefore split across DOM attributes and a misleading global-style location, and only the generated layer selector is editable.
  - Action: add Node-owned class definitions with a literal class name, optional prop condition, and sparse responsive styles; derive the rendered `class` attribute from active definitions. Migrate existing DOM class strings and each node-bound `layer-*` rule into the matching Node definition, then remove those legacy rules and the class-string mutation path. Update Inspector class/style editing to target every class definition, including the generated class.
  - Scope: establish local class ownership as the prerequisite for conditional classes; support a prop equality condition, while global reusable class definitions remain a separate future feature.
  - Contracts: keep non-class DOM attributes intact; preserve class order, style declarations, breakpoints, token and prop references, component preview behavior, generated React output, Undo/Redo through existing catalog commits, and prevent a local style from leaking to another node with the same class name.
  - Validation: workspace typecheck passed; static catalog check found 153/153 Nodes with generated classes, no class DOM attributes, and no `layer-*` rules; Prettier, candidate detector, and `git diff --check` passed. Updated existing contract tests but did not run tests.

- [x] Core/Editor/Codegen: add composable class conditions.
  - Evidence: `NodeClassDefinition.condition` and `effectiveClassList` only support one direct prop equality; `preview/resolve.ts` duplicates that predicate for dynamic class styles, and React codegen emits a separate strict-equality expression. Nested repeater references already have stable UUID encodings in the Core resolver but there is no reusable condition evaluator or editing UI.
  - Action: replace the equality-only condition with a discriminated condition tree (`rule` groups with AND/OR and boolean `condition` leaves); operands support stable Core references or typed literals. Add a pure Core evaluator using `ReferenceResolutionContext`, property-schema type metadata for operator suggestions, and an Editor control in the existing per-class style section to edit nested rules. Reuse the evaluator in preview for class inclusion and conditional styles; have React codegen emit equivalent prop and scoped repeater expressions using the same operators. Keep repeater UUIDs as persisted identity so index-name edits only change labels. Preserve old `prop-equals` conditions through a narrow normalization path until persisted catalogs have been migrated.
  - Refactor: `generate.ts` now combines JSX emission and a recursive class-condition expression compiler, each with separate behavior and review needs. Move condition expression generation and repeater-scope expression projection into a private React codegen module; keep JSX traversal and file assembly cohesive in `generate.ts`.
  - Refactoring review: boolean-default propagation takes `generate.ts` to 451 lines, triggering the detector. Condition expression and repeater-scope logic already live in `class-conditions.ts`; the remaining schema-to-files React generation pipeline is cohesive, so keep it intact rather than splitting solely at the size threshold.
  - Scope: conditions for node-owned classes, including generated components, active nested repeater item/index values, object presence, and array length. Operators: set/unset; typed equality/inequality; numeric comparisons; array length comparisons; and references on either side. No contains operator, arbitrary expressions, or global tokens as condition operands.
  - Contracts: preserve class order, sparse style declarations/breakpoints, existing reference encodings, `Object.is` equality and unset semantics (`undefined`/`null` are unset; empty string/array/object are set), and old `prop-equals` catalog data. Empty groups are invalid and evaluate false defensively. Generated repeater markup retains its existing preview-data cardinality; each emitted row's condition reads the current prop at that row's stable repeater index.
  - Validation: Core, Editor, and Codegen typechecks passed in the approved host context; Prettier, candidate detector rerun, and `git diff --check` passed. Automated tests and Storybook interaction were not run in this implementation.

- [ ] Editor: render nested object fields and preserve repeater form paths.
  - Evidence: `json-schema-form-config.ts` falls back to a text control for object-valued properties, so `rules[].declarations` serializes as a string. `SchemaForm.tsx` reads and writes nested schema fields without resolving the current `PathPrefix`, so editing a schema field inside an array targets the wrong path and the catalog rejects the malformed preview value.
  - Action: route object schemas through the recursive schema value editor and resolve `schemaField` values and commits against the active path prefix. Keep array-item indexing and outer form values intact.
  - Scope: fix nested object fields in array-valued preview data and inspector forms; no schema, persistence, or validation contract changes.
  - Contracts: retain JSON Schema object and array shapes, preserve current form bindings and preview-data field paths, and keep non-nested scalar controls on their existing form path.
  - Validation: Editor typecheck, focused source-level check of nested object and array path handling, candidate detector rerun, and `git diff --check`; no test suite added or run.

- [ ] Core/Editor: expose nested repeater item fields as composition sources.
  - Evidence: nested repeater scopes and `{ kind: 'item', path }` sources are supported by the Core resolver and catalog validation, but `inspector-view.ts` only builds the composition source dropdown from root component properties. The inner repeater cannot select an array from its parent item's schema.
  - Action: build source choices from the root component schema and the active parent repeater item's schema. Encode the selected source in the inspector view model, then map it to the existing prop UUID or item path source contract. Keep source-option generation in the inspector view model because it already owns composition controls; preserve the file's cohesive inspector-model responsibility.
  - Scope: make nested repeater arrays selectable in the Editor; no persisted model or reference-encoding changes.
  - Contracts: keep root `{ kind: 'prop', uuid }` sources and scoped `{ kind: 'item', path }` sources, repeater index UUID identity, item scope order, and Core validation/preview/codegen behavior intact.
  - Validation: Core and Editor typechecks, candidate detector rerun, and `git diff --check`; no tests run.

- [ ] Refactor: review `AppService.ts` ownership boundaries.
  - Evidence: the 652-line service coordinates session/catalog actions, asset workflows, event routing, and inspector/sidebar view-model assembly.
  - Action: identify existing domain owners for these responsibilities and move only independently changing workflows while preserving event order and public app-service behavior.
  - Scope: backlog; unrelated to class conditions.
  - Contracts: preserve EditorEvent dispatch, subscriptions, session lifecycle, snapshot shape, and catalog commit/undo semantics.
  - Validation: Editor typecheck, focused service behavior checks, candidate detector rerun, and `git diff --check`.

- [x] Core/Editor: keep stale root node values from masking definition preview defaults.
  - Evidence: the CSS rule row definition stores valid `rules` array defaults, while its root Node still has `data.rules` in the old object-map shape. `previewFieldsForNode` merged that stale value over the defaults. When editing nested Repeater items in the Inspector, the form emitted paths like `rules.0.declarations`, but Core's record-only path patch treated array indices as object keys, so new or changed items were written in the wrong shape and disappeared on rerender.
  - Action: reuse the catalog's existing partial-field validation semantics when merging node data with preview defaults; ignore only schema-declared node values that are neither valid partial schema values nor supported bindings. For Inspector changes that cross a Repeater index, emit the updated top-level schema field value so Core stores the complete array. Keep raw catalog data untouched so the user can inspect or migrate it explicitly.
  - Scope: fix preview and inspector value resolution for schema-invalid node overrides and nested Repeater edits; do not change the saved data contract or valid node-over-default precedence.
  - Contracts: preserve definition preview defaults, valid partial object values, dynamic field bindings, parent scope behavior, valid node-level overrides, and whole-array values in persisted node data.
  - Validation: Core and Editor typechecks, Prettier, candidate detector rerun, and `git diff --check` passed; tests were not run.

- [x] Core: resolve component prop references inside active repeater items.
  - Evidence: `{props:uuid}` resolution reads only the flattened root `componentProps` map, while nested array-item values live in the active `RepeaterReferenceScope`. Text bindings and conditions using component prop UUIDs therefore resolve to empty values inside repeaters.
  - Action: before root component values, find the referenced stable field UUID in the nearest active item schema and read it from that scope's item. Resolve any reference stored in the scoped value recursively, including token aliases. Skip fields nested under a further array unless that repeater scope is active; keep `reference-resolver.ts` as the owner of prop, item, index, and token reference semantics. Keep `resolve.ts` as the cohesive recursive preview-tree walker; no split is needed for this behavior.
  - Scope: fix rendering and condition evaluation for existing component prop references inside single and nested repeaters; no reference encoding or catalog migration.
  - Contracts: preserve `{props:uuid}` identity across schema renames and index-label changes, prefer the nearest active matching item scope, preserve root prop fallback and other reference encodings, and pass raw token values to the renderer after resolving aliases.
  - Validation: Core and Editor typechecks, focused scope-resolution inspection, Prettier, candidate detector, and `git diff --check` passed; tests were not run.

- [x] Core/Editor/Codegen/Style Engine: make Repeater nodes render as fragments.
  - Evidence: every Catalog `Node.dom` currently requires a `tagName`, and Core returns each Repeater as an ordinary `ElementBuildConfig`; the canvas and React codegen therefore emit a wrapper element for every Repeater.
  - Action: make the DOM tag optional in the shared Node contract, require it for actual DOM nodes in Catalog validation, and represent a tagless Repeater in the resolved tree as a fragment whose children are emitted directly. Create new Repeater nodes without a tag and hide tag, text, DOM-attribute, and element-style controls for them. Traverse fragments in dynamic style generation and flatten them in the canvas renderer and React codegen. Keep `resolve.ts` as the existing recursive tree walker and `inspector-view.ts` as the Inspector model owner.
  - Scope: Repeater nodes only; Switch keeps its current DOM behavior. Legacy Repeater tags remain readable but are ignored and removed when the Repeater composition is edited.
  - Contracts: preserve repeater item scope, render keys, child order, child selection/style UUIDs, component instances and slots, and generated React output apart from removing the Repeater wrapper. Preserve valid DOM-node tag validation and existing serialized data for other nodes.
  - Validation: Domain/Core/Editor/Style Engine/Codegen/Examples typechecks passed; Prettier and candidate detector ran; `git diff --check` passed. Tests were not run.
  - Refactoring review: detector flags `resolve.ts`, `inspector-view.ts`, `validate.ts`, and `controller.ts` by size. They remain cohesive owners for recursive preview expansion, declarative Inspector layout, Catalog invariants, and project orchestration; this task adds no independent lifecycle or duplicate behavior requiring extraction.
- [x] Domain/Core/Editor/Style Engine: replace Google font sources with system fonts.
- Evidence: persisted `FontSource` supported `google` and `file`; Editor exposed Google family editing, and Style Engine emitted remote Google `@import` rules. The requested direction is local system fonts now, with user-uploaded files later.
- Action: add a `system` source variant; normalize legacy Google font records to `system` at catalog validation, map known Google families to local equivalents (Inter to system-ui, Playfair Display to Georgia), and otherwise use an available fallback or system-ui. Remove Google UI fields, URL generation, and exports. Keep file-backed `@font-face` support for the later upload path.
- Refactoring: keep Catalog validation as the cohesive invariant gate; put legacy source normalization in a focused catalog migration helper because `validate.ts` is already 612 lines and should not gain another transformation responsibility. `packages/examples/src/facadeur-editor/components.ts` remains a cohesive set of example component definitions despite the detector's 688-line review signal.
- Scope: migrate all saved Google sources to system sources and remove runtime Google fetching; no font-file upload UI.
- Contracts: preserve font token IDs, typography references, labels, weights, fallbacks, and file source behavior; change only family values needed to select a local replacement.
- Validation: Domain/Core/Editor/Style Engine workspace typechecks passed; Prettier, candidate detector rerun, JSON parsing, and `git diff --check` passed. Existing Google-specific assertions were updated; tests were not run.

- [x] Editor: align typography token rows with the Fonts accordion.
  - Evidence: Fonts uses the shared Table row-details disclosure, while each typography token embeds a separate disclosure inside its value cell, leaving the editor controls visually detached from the token row.
  - Action: use the token label as the shared table disclosure header, move label and CSS variable editing into the expanded details, and arrange metadata beside the existing typography editor with the same two-section layout used by Fonts. Keep the compact style summary in the collapsed row.
  - Scope: typography token presentation in the design settings; preserve typography editing, token references, breakpoint overrides/resets, and other token-domain rows.
  - Contracts: keep the existing token data and command paths unchanged; use the shared row disclosure and avoid interactive controls in its header.
  - Structure: retain `token-table-row.tsx` as the cohesive token-row builder; it keeps token display, edits, and actions together, and splitting the current flow would add pass-through plumbing without a separate owner.
  - Validation: Workspace typechecks, Prettier, candidate detector rerun, and `git diff --check` passed; tests were not run.
- [x] Editor: remove the redundant default Type group from typography tokens.
  - Evidence: default typography tokens have an empty subgroup, so `groupTokens` places all of them beneath a table accordion named after their `type` family, adding a redundant level above the token rows.
  - Action: render the default typography-family group as ordinary rows and retain accordion grouping for explicitly named subgroups.
  - Scope: typography token presentation only; preserve token paths, labels, and custom groups.
  - Contracts: do not change token persistence or token group metadata.
  - Validation: Workspace typecheck, Prettier, candidate detector rerun, and `git diff --check`; tests not run.
- [x] Editor: render token typography fields with the Fonts detail layout.
  - Evidence: the typography token detail reused `ComboField`, which adds an inner bordered fieldset and horizontal label column unlike the stacked fields in the Fonts detail view.
  - Action: keep `ComboField` for the existing compact typography editor, but render a dedicated details grid when the host owns the disclosure: Style name beside Family, Size beside Weight, Line height beside Letter spacing, and Sample across the grid.
  - Scope: typography editing presentation in token detail rows; retain shared value parsing, validation, references, breakpoint handling, and other typography editor consumers.
  - Contracts: preserve field names, commit/reset behavior, and the existing default editor layout.
  - Structure: keep `DesignTypographyEditor` cohesive because it owns field parsing, validation, commits, and both presentation modes; extracting the details-only grid would split one editing contract across components.
  - Validation: Workspace typecheck, Prettier, candidate detector rerun, and `git diff --check` passed; tests not run.
- [x] Editor: make the style label the only typography-token name editor.
  - Evidence: the expanded typography row showed the editable label and an editable CSS variable suffix derived from that same label, while the separate metadata column reserved half the detail width.
  - Action: remove the typography CSS-path editor and metadata column; show the derived CSS variable beside the style label in the accordion header, with one visibly labeled style-name field in the full-width details grid.
  - Scope: typography token settings presentation and label editing; keep non-typography token path editing unchanged.
  - Contracts: changing the label continues to derive the token path; token references still resolve by UUID and export still emits the resolved value.
  - Structure: keep token-row table behavior shared while letting the existing typography editor own its full-width details layout.
  - Validation: Workspace typecheck, Prettier, candidate detector rerun, and `git diff --check`; tests not run.
- [x] Editor: keep derived font-index data out of persisted font edits.
  - Evidence: `fontFamilyTokens` returns indexed tokens with derived fields, including an always-present empty `breakpoints` map. `editedFont` spread that runtime object into the `setToken` command, and Core rejects any `breakpoints` property on font tokens.
  - Action: construct edited font records from persisted fields only, while preserving font value metadata and extensions. No catalog migration is needed because the invalid field came from the in-memory index projection and failed validation before it could be persisted.
  - Scope: font edits in Settings; no responsive font support or index-model changes.
  - Contracts: preserve UUID, label, group, font family data, weights, fallbacks, source, value metadata, and extensions; omit derived path/type/family/breakpoint index fields from the command payload. Leave existing persisted font migration behavior unchanged.
  - Validation: Core and Editor typechecks, source inspection, Prettier, candidate detector rerun, and `git diff --check`; tests not run.
- [x] Editor/Style Engine: include design token CSS in stage frames.
  - Evidence: `StageCanvas` injects only dynamic node styles and authored global styles into each iframe. Typography declarations reference custom properties such as `--type-caption--font-family`, but unlike the Design settings surface, the stage frame receives no compiled token declarations, so computed typography properties are undefined.
  - Action: compile the current catalog's design tokens and breakpoints with `renderDesignCss` and include that stylesheet in each stage frame's existing global style injection.
  - Scope: stage preview styling only; preserve authored/dynamic style output and generated project CSS.
  - Contracts: token variables use the existing Core CSS names and viewport overrides; styles remain scoped to the frame document and update with the design revision.
  - Validation: Editor and Style Engine typechecks, source inspection, Prettier, candidate detector rerun, and `git diff --check` passed; tests were not run.
- [x] Editor: present typography tokens and font assets distinctly in pickers.
  - Evidence: the Typography picker combines `fontRefs` with `fontFamilyTokens`, which are the same UUID references, so each Font asset appears twice. Font option descriptions fall back to serialized object JSON, and standalone `type` paths are titled “Type” although the domain is Typography.
  - Action: use one source for font-family references, label those choices as Font assets, suppress raw JSON fallback descriptions, and title standalone `type` token groups “Typography”. Show Font asset labels without the redundant “Fonts /” prefix in picker contexts.
  - Scope: design token picker labels and the typography `font-family` picker; keep persisted token families and font asset records unchanged.
  - Contracts: retain UUID references, permit Font assets in font-family fields and Typography references in whole-style fields, preserve other token picker labels and descriptions.
  - Structure: `DesignTypographyEditor.tsx` remains a cohesive control that owns field presentation and token options; the detector's 506-line review signal does not identify a separate responsibility touched by this change.
  - Validation: Editor typecheck, source inspection, Prettier, candidate detector rerun, and `git diff --check` passed; tests were not run.
- [ ] Core: keep schema edits and preview defaults in sync.
  - Evidence: `CatalogSchemaStage` allows removing fields from an inline schema while `definition.config.previewData.fields` keeps values for those fields; `validateProjectCatalog` then rejects the next catalog commit, including inserting a component, with an invalid preview-default error.
  - Action: when an inline schema is replaced, remove definition preview defaults for fields no longer in the contract; make catalog validation tolerate stale or mistyped preview examples, and filter them from rendering. Keep strict validation for component instance data and type validation for active preview fields.
  - Scope: schema replacement and preview-default validation; do not change persisted schema or renderer contracts.
  - Contracts: preserve preview values for retained fields, preserve valid partial values and bindings, and keep invalid values for known fields rejected.
  - Validation: Core and Editor typechecks, focused in-memory reproduction for stale CSS rule preview values, candidate detector rerun, and `git diff --check`; no tests run.

- [x] Core: preserve Repeater layers when their schema changes.
  - Evidence: switching a definition from its inline schema to a shared schema can leave Repeater and child text/style bindings pointing at property IDs from the old schema; validation rejects an invalid Repeater source, and deleting children destroys authored layers.
  - Action: reconcile `{props:uuid}` bindings by schema path when a definition schema changes. Clear only bindings with no corresponding property in the new schema, remove only an invalid Repeater source, and retain its child layers. Preserve repeaters whose source remains valid.
  - Scope: schema-change commits only; do not alter manual Repeater editing or Switch behavior.
  - Contracts: keep node and Repeater identities, child order, and composition kind; remap matching paths to new stable field IDs and blank only removed property bindings.
  - Validation: Core and Editor typechecks, in-memory switch to the existing global CSS Rule Set schema confirming Repeater and child identities are retained and bindings remapped, candidate detector, and `git diff --check`; tests not run.
