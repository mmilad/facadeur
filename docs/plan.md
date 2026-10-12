# Facadeur cleanup plan

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

## Refactoring review

The maintained-source candidate scan found two size signals; all are cohesive and should remain
intact unless their responsibilities change:

- `packages/core/src/controller/project/controller.ts` (528 lines): the single Core catalog
  coordination facade, including its public query surface. Query implementations live in the
  adjacent `catalog/queries.ts` module.
- `packages/examples/src/form-controls-section/dom.ts` (526 lines): one canonical reusable
  Catalog fixture tree.
- `apps/editor/src/app-service/AppService.ts` (455 lines): one event-to-operation coordinator;
  its switch is the single dispatch boundary and its private helpers own related Catalog actions.
  Splitting cases into per-event services would scatter the operation contract again.

## Latest verification

The latest batch passed workspace typecheck and the full test suite (64 files, 231 tests).
Formatting, source/import audits, candidate review, and `git diff --check` also passed. The
Storybook build still prints existing Vite `use client`, sourcemap, and large-chunk warnings.
