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

- [ ] Refactor: decouple project/layer sidebar and inspector from Core.
  - Evidence: `ui/sidebar/layers` and `ui/sidebar/properties` receive `AppService`,
    `EditorSession`, or full `EditorSnapshot`; layer/asset controls compute Catalog rules and
    invoke Core-backed workflows directly. The Inspector consumes a Core-derived model.
  - Action: organize sidebar UI under `base/`, `left/`, and `right/`; add editor-owned flat
    sidebar DTOs/adapters to the existing session snapshot; route minimal typed intents through
    `AppService` for resolution, validation, persistence, selection, and drag operations. Build
    Storybook/test DTOs from the canonical Examples Catalog.
  - Scope: prerequisite for the current sidebar decoupling task; settings panels remain unchanged.
  - Contracts: preserve asset create/open/rename/delete, layer selection/context actions/drop
    zones and legal moves, inspector fields/tabs/form values, notices, and persistence behavior.
  - Validation: DTO-only sidebar tests, Example adapter and service behavior tests, workspace
    typecheck/full tests/Storybook build, import audit, candidate detector, and diff check.

- [ ] Refactor: decouple project/layer sidebar and inspector from Core.
  - Evidence: `ui/sidebar/layers` and `ui/sidebar/properties` receive `AppService`,
    `EditorSession`, or full `EditorSnapshot`; layer/asset controls compute Catalog rules and
    invoke Core-backed workflows directly. The Inspector consumes a Core-derived model.
  - Action: organize sidebar UI under `base/`, `left/`, and `right/`; add editor-owned flat
    sidebar DTOs/adapters to the existing session snapshot; route minimal typed intents through
    `AppService` for resolution, validation, persistence, selection, and drag operations. Build
    Storybook/test DTOs from the canonical Examples Catalog.
  - Scope: prerequisite for the current sidebar decoupling task; settings panels remain unchanged.
  - Contracts: preserve asset create/open/rename/delete, layer selection/context actions/drop
    zones and legal moves, inspector fields/tabs/form values, notices, and persistence behavior.
  - Validation: DTO-only sidebar tests, Example adapter and service behavior tests, workspace
    typecheck/full tests/Storybook build, import audit, candidate detector, and diff check.

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

The maintained-source candidate scan found two size signals; both are cohesive and should remain
intact unless their responsibilities change:

- `packages/core/src/controller/project/controller.ts` (528 lines): the single Core catalog
  coordination facade, including its public query surface. Query implementations live in the
  adjacent `catalog/queries.ts` module.
- `packages/examples/src/form-controls-section/dom.ts` (526 lines): one canonical reusable
  Catalog fixture tree.

## Latest verification

The latest batch passed workspace typecheck and the full test suite (64 files, 231 tests).
Formatting, source/import audits, candidate review, and `git diff --check` also passed. The
Storybook build still prints existing Vite `use client`, sourcemap, and large-chunk warnings.
