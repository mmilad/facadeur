# Project history

This archive preserves completed implementation reports, closed roadmap checkpoints and the dated decision log that were moved out of the active [plan](plan.md). Historical decisions may be superseded by the current contracts in that plan and the feature documents.

## Completed implementation reports

### Separate DOM renderer lifecycle from DOM painting (2026-10-03)

- [x] Evidence: `renderer-dom/src/render.ts` combined the stateful `mount`/`connect`/
      `destroy` and stylesheet synchronization lifecycle with the recursive paint and
      reconciliation algorithm. The latter remains intentionally cohesive because
      paint and child reconciliation call into each other.
- [x] Action: moved lifecycle coordination to `renderer.ts` and kept recursive DOM
      painting/reconciliation together in `paint.ts`. Retain `render.ts` as a compatibility
      facade for existing direct imports; keep the package entry point and exports stable.
      Use extensionless relative TypeScript imports throughout this package.
- [x] Scope: renderer-dom package refactor only.
- [x] Contracts: preserved DOM identity/reconciliation, stable data/class/style-owner markers,
      event ordering, subscription cleanup, stylesheet ownership, instance/variant/repeat
      behavior and public imports.
- [x] Validation: renderer-dom tests (23), package typecheck, ESLint/Prettier, candidate
      detector rerun and diff review.

### Organize the style-engine package by responsibility (2026-10-03)

- [x] Evidence: compile.ts (510 lines) mixes document traversal, layout sizing,
      selector addressing and rule output. The flat src directory mixes pure
      compilation with CSSOM lifecycle; values.ts imports DOM controller utilities.
      CSS escaping, rule insertion/deletion and compiled-rule emission are duplicated.
- [x] Separate compiler orchestration/types/layer emission, layout conversion,
      selectors, pure CSS values and runtime controller/stylesheet/design ownership.
      Colocate private helpers by domain; preserve the package public entry point.
- [x] Consolidate identical escaping, CSSOM rule lookup/insertion and compiled
      rule output. Remove redundant declaration order bookkeeping, filtering and
      runtime metadata. Keep different selector/layout contracts explicit.
- [x] Review remaining duplication and record concrete next architecture choices
      without changing persistence, public API, cascade or token semantics.
- [x] Validate existing compiler/controller/runtime/codegen behavior, generated
      output parity, relevant typechecks/lint and final candidate scan.
- [x] Keep relative TypeScript imports extensionless under the workspace's
      `Bundler` module resolution; no import-specific compiler option is needed.

Scope: packages/style-engine and its focused tests/documentation. Contracts:
unchanged public exports, rule keys/order, CSS selectors, layout defaults, sparse
states/variants/breakpoints, nested overrides, CSSOM cleanup and document ownership.
Pure compiler/CSS modules must not depend on runtime modules; no new dependencies.

Result: 1,516 to 1,411 source lines; compile orchestration is 128 lines and
controller is 170. Modules now live in compiler/layout/selectors/css/runtime
domains. The final detector reports no size or directory-concentration signals.
All 951 tests pass, including borrowed-sheet/media cleanup and selector string
regressions. Exact compiled-rule output matches the previous implementation in
80 configurations across 20 example documents. Style-engine/codegen/editor
typechecks, source ESLint, package formatting and the editor production build
pass. Repository-wide Prettier still flags 15 unchanged files outside this scope.
Remaining design serialization/core selector/cascade decisions are documented in
[the package README](../packages/style-engine/README.md).

### Readable classes and selector-based Styles tab (2026-10-03)

- [x] Prerequisite: keep selector parsing/binding and readable class identity in
      core's styles domain, separate from existing declaration/layer parsing. Extract
      explicit-selector compilation beside the compiler and CSS draft parsing beside
      the editor panel. Evidence: compile.ts already orchestrates layout and sparse
      layer emission; free selectors add independent addressing and syntax concerns.
      Reuse existing declaration writers and setStyleBlock/variant commands rather
      than introducing a second persisted CSS source. Keep layout, renderer painting
      and declaration controls cohesive despite existing detector size signals.
- [x] Add optional local styleName to every node, unique per document; derive
      readable fallback classes for legacy nodes and show the name in the inspector.
      Bind rule class references to node IDs so renaming preserves meaning. Maintain
      flat/nested conversion, JSON/Yjs round trips, sparse variants and Undo.
- [x] Add ordered selector rules to styles, scoped to the owning component.
      Support checked/adjacent siblings, functional pseudo-classes and pseudo-elements,
      preserve token substitution and breakpoint/variant layers, and prune dangling
      bound rules on removal. Validate syntax, references and declaration commits.
- [x] Add a Styles tab with expandable selector rows and plain CSS declaration
      editing, add/delete/reorder and inline errors. Existing style controls and the
      rule editor use the same declarations. Selected elements highlight matching
      rules; private nested nodes still belong to their master.
- [x] Validate editor edits/rename/invalid drafts/Undo, real checked interaction,
      selector isolation and React CSS Modules output; regenerate schema/UI and run
      tests, type/lint/build/browser checks and the final candidate detector.

Ownership: core owns node naming and portable selector bindings; style-engine
owns emitted selectors/token expansion; renderer-dom and codegen-react project
the same naming/selector contract; editor owns drafts and interaction. No generic
utility package or new CSS persistence channel. Existing documents remain valid.

Integration evidence: browser checks pass for selector/CSS edits, invalid drafts,
class rename/Undo, ordered cascade/reorder, delete/Undo, ordinary CSS and JSON
export. Generated React checked-sibling and :has rules pass native click and
instance/outside isolation checks. Core/store/style-engine/renderer/codegen/UI
typechecks and Storybook build pass. Focused editor checks pass 15 tests. The
first full run passed 946/948; both remaining UI tests were corrected and passed
the focused run. Three subsequent test-only typing errors were corrected.
The initial final checks were blocked by an account usage limit. Full tests,
editor typecheck/build and source ESLint were rerun successfully during the
style-engine refactor above. Repository-wide formatting findings concern other
unchanged files and remain outside that task.

Final detector review: style-block.ts (544 lines) retains document style
validation/pruning; render.ts (523) retains painting/reconciliation; compile.ts
(510) retains node/layout traversal. New class identity, selector scanning,
authored-rule emission and shared selector scoping have separate domain owners.
Existing unrelated editor size/directory signals remain in the refactoring
backlog; no automatic size-based split was made.

### CSS Modules and nested instance styles (2026-10-02)

- [x] Refactor prerequisite: isolate nested target addressing in the style-engine and
      nested style editing in the editor under their existing domain owners.
      Evidence: compile.ts (474 lines) combines declaration/layout compilation with
      selector addressing; nested selection currently bypasses the style inspector.
      Pattern: private nested-target module and focused nested inspector/target resolver;
      keep declaration compilation and the existing ordinary inspector cohesive.
      Reuse owner VariantTabs in the normal and nested inspector. Keep the declaration
      editor cohesive: it owns one sparse declaration workflow; only target identity
      is projected separately, rather than duplicating controls and write semantics.
      Integration review: node rules and nested rules share identical state, axis and
      breakpoint emission. Reuse one private style-layer emitter rather than copying
      that behavior. Preserve declaration order, rule keys and layout compilation.
- [x] Generate one fixed React format: component.tsx + style.module.css, imported
      as local classes; remove bundle/component-local options and merge caller classes.
- [x] Support sparse nested instance-root overrides in Components and Sections,
      using owner-root-relative paths in styles.children and scoped attribute
      selectors across component boundaries. Preserve legacy direct child keys.
      Store complete owner-root-relative rendered paths (local frames included).
      Rebase these paths atomically on Move/Wrap and prune them on Remove; preserve
      external path suffixes, sparse presets and Undo.
- [x] Preserve root component tokens, public token variables and inline fallbacks;
      do not introduce internal alias variables or another token model.
      Add a focused root control for reachable components' exposed tokens, writing
      existing tokenInterface.sets. Keep this distinct from defining local defaults.
      Evidence: the existing Tokens tab defines local defaults but does not expose
      descendant sets. Reuse TokenValueControl and the existing undoable command;
      isolate reachability and sparse token-interface updates in a domain helper.
- [x] Validate isolated nested usages, variants, states, breakpoints, Reset and
      Undo; regenerate example UI, check type/lint/tests/build and inspect the browser.

Contracts: edits belong to the containing document, never to the referenced
master; fields and structure retain their existing behavior. Nested appearance
targets are instance roots, not arbitrary private master nodes. This explicitly
extends the style-child path contract and replaces the codegen style-mode API;
existing document/token formats otherwise remain compatible. The 464-line DOM
renderer and core command directory remain cohesive unless implementation shows
an independent responsibility needing extraction. Validation includes detector
reruns and preview/export parity for the new addressing strategy.

Completion: 918/918 repository tests pass. Editor, core, style-engine,
renderer-dom, codegen-react and generated UI typechecks pass; source ESLint and
Prettier checks pass. Next editor and Storybook production builds pass. Isolated
Chromium checks cover Section nested edits, JSON export, Reset/Undo, root token
inheritance across six viewports, and bundled React modules with named/axis
variants, hover, breakpoints and duplicate-instance isolation. Chromium also
confirms parent overrides win child variants in both preview addressing modes.
Generated CSS uses ownership layers (component, instance, nested instance) and
keeps empty module class exports for otherwise unstyled instance nodes.
The final detector reports compile.ts (550), renderer render.ts (467),
DeclarationEditor (478) and existing LayoutPanel (510) as review signals. Retain
these cohesive compilation, rendering and declaration/layout workflows; extracted
target addressing and shared layer emission remove the actual duplicated responsibility.

### Token label presentation (2026-10-02)

- [x] Prefer saved labels across pickers, token tables and inherited inspector values.
- [x] Preserve references, IDs, CSS output and legacy documents; cover label updates and Undo.
- [x] Run focused tests, editor checks and browser verification.

Evidence: the shared label formatter prefixes saved labels with path segments; the component
token tab lacks its provider, and table label inputs do not synchronize edited drafts with
new snapshots. Inherited instance values require their master's label scope, separate from
the containing document's picker options. Keep the existing presentation/provider boundary
and reuse the form draft-commit behavior; no storage migration or generic helper package.
For inherited values, separate current-value labels from owner-scoped picker option labels;
use a presentation-only provider at the control boundary and retain the same stored reference.
Reuse TextInput's draft commit and support its existing className input for table styling.
The scoped candidate scan reports no size candidates. Preserve public token APIs, token paths,
IDs, sparse overrides, Undo and generated CSS. Validate exact labels, scoped references,
label persistence and unchanged codegen, then inspect the live editor.

Completion: `tokenDisplayLabel` prefers saved labels; `TokenValueLabelProvider` scopes inherited
instance values (manual CSS, border compounds, layout gap/padding/margin/size) while pickers stay
owner-scoped. Component token tab and design tables use `TokenPreviewProvider` / controlled label
inputs. Focused editor, core, store-yjs and codegen-react tests pass (24+). Schema already
exports optional `componentTokens.label`; unrelated full-suite example failures remain outside
this change.

### Layout inspector UX (2026-10-02)

- [x] Extract private axis-aware icon choices beside LayoutControl before replacing selects.
- [x] Add existing-style-backed None/Flex mode selection; Grid stays disabled until its next milestone.
- [x] Validate inherited values, sparse variant/viewport writes, reset, Undo and browser interaction.

Evidence: container choice presentation changes independently of size/position and persistence.
Keep patches and LayoutPanel command ownership; use existing style edits for display, no schema
or dependency change. Preserve raw/token spacing values and staging. Validate focused tests,
typecheck/lint and repeat the candidate detector; retain cohesive files where extraction adds no value.
Validation: 707 tests / 138 files pass, editor typecheck, ESLint and scoped formatting pass.
Browser verifies direction/axis changes, None disabling retained controls, Grid disabled and Undo;
test changes were undone. LayoutPanel remains a cohesive context/write orchestrator with no size
candidate; icon presentation owns its private module. Layout spacing permits direct CSS values
alongside tokens without changing other spacing-control consumers.

### Unified token presentation and search (2026-10-02)

- [x] Consolidate group/leaf/selection names in one editor-owned token presentation module.
- [x] Supply saved labels through existing token context; use shared search in pickers and tables.
- [x] Remove redundant namespace/count from group headings; preserve technical refs and unknown values.
- [x] Validate labels, rename/search, duplicate names, dropdown commits and existing editor tests.

Evidence: sidebar token-labels, token-options and TokenValueControl independently build names;
picker, combobox and table search use inconsistent fields. Share presentation in controls and a
generic option search helper in the form layer; retain CSS-value resolution in its current owner.
Preserve refs, values, Undo, token data and staging. Controls/data remains a cohesive domain despite
12 direct files; no unrelated reorganization. No new package or persistence change.
Validation: complete suite passes (692 tests), editor typecheck and ESLint pass; focused tests cover
saved-label updates, group composition, duplicate labels with distinct ids, unknown refs and search.
Browser verifies short group names and reverse-order multiword searches in table/picker. Aliases
and resolved values are included in both searches; technical ids remain visible as secondary text.

### Schema and icon navigation (2026-10-02)

- [x] Extract shared Settings section navigation before adding Schemas to Settings.
- [x] Move Icons from project sidebar to subnav; retain document Schema and legacy surface URLs.
- [x] Validate navigation, schemas and icons with focused tests and editor typecheck.

Boundary: settings tabs have two real consumers (design domains and schema library); colocate their
shared navigation in the existing design UI domain. Preserve schema state, document selection,
design save semantics and staged edits; no persistence or data-model changes.

### Settings-owned viewport management (2026-10-02)

- [x] Remove the redundant viewport disclosure from Layers; retain Settings and stage selection.
- [x] Validate sidebar absence and existing viewport inspector/settings behavior.

Keep LayersPanel cohesive; remove only its viewport-specific mounting/state. Preserve document
layers, settings commands, stage selection and user staging. No data-model or persistence changes.

### Stable chrome during zoom (2026-10-02)

- [x] Exclude header intrinsic width and keep header geometry independent of stage scale.
- [x] Verify stable frame bounds across zoom levels and preserve iframe/padding widths.

Keep stage CSS cohesive: this is a layout defect, not an extraction candidate. Preserve iframe
breakpoint widths, body padding, pan/zoom semantics and user staging. Leave adaptive grid unchanged.
Browser measurements at 20%, 100% and 110% show identical widths, heights and layout offsets for
all six boards; phone width is 415px including padding, and header height remains 28px.
Nine focused zoom/viewport tests and scoped formatting pass. Titles now scale with the artboard;
they no longer counter-scale and change layout at low zoom.

### Exact zoom (2026-10-02)

- [x] Make the percentage readout an exact 100% action and stop rounding near-100 values to 100.
- [x] Snap toolbar zoom across 100%, preserving center anchoring and smooth wheel zoom.

Retain cohesive stage controller and session surface: no new responsibility boundary or extraction
is needed. Preserve fit, pan, zoom limits and stored documents. Validate focused tests and typecheck.

### Intrinsic viewport chrome width (2026-10-02)

- [x] Remove the outer frame's duplicate fixed width; preserve exact iframe breakpoint widths.
- [x] Validate breakpoint rebuilds and padded chrome containment in the browser.

Boundary: viewport board and stage CSS remain cohesive; this is a sizing defect, not a structural
refactor. Let normal intrinsic sizing include chrome padding without coupling JS to CSS values.
Preserve padding, breakpoint semantics, frame lifecycle, selection and all existing staged changes.
Validation: 13 viewport/chrome tests, editor typecheck and scoped lint pass. Browser measurements
confirm all six iframe widths remain exact (375–1760px), with 20px chrome padding and no overflow.

### Product Card workflow (2026-10-02)

- [x] Move the adapter-specific component-token test from core to store-yjs; retain pure Core tests.
- [x] Add Product Card fields, composed Button, image, price, preview data and sparse Compact preset.
- [x] Include it in codegen and verify generated React/Storybook output and rendered variants.
- [x] Exercise API edits, shared editor state, Save and restart on a disposable project copy.

Boundary decision: Core tests currently import its Yjs adapter, creating an undeclared reverse
dependency. Relocate only that adapter behavior test to store-yjs instead of adding a cyclic dev
dependency. Preserve coverage and strengthen actual Undo/Redo assertions. Product Card belongs in
examples; reuse current DSL/renderer/codegen contracts, no new runtime helpers or public API changes.
Retain the cohesive server repository (461 lines); no extension is planned. Preserve all staged
changes and Specimen content. No repository-wide formatting or changes to artboard padding.

Story generation remains cohesive in its existing module: named presets now receive their own
stories and resolved variant preview data; runtime components still exclude sample values.
Validation includes generated-output equality, renderer assertions for both presets, a real
server/two-editor API-Save-restart test and browser inspection of Default and Compact in Storybook.

### Live catalog and green baseline checks (2026-10-02)

- [x] Reconcile the three obsolete schema/preview assertions without changing DSL semantics.
- [x] Add an additive project-wide WebSocket stream, ordering catalog additions before document updates.
- [x] Accept remotely hydrated catalog entries without changing selection, local history or unsent edits.
- [x] Integrate editor transport and verify two tabs, reconnect, dependent instances, Save and full checks.

Refactoring prerequisite: the project adapter currently owns registration and per-document transport;
place multiplexed socket lifecycle in a private domain/project module before integration. Keep the
session coordinator (478 lines) cohesive; remote catalog registration belongs beside session document
registration, not in UI controls. Keep the repository (461 lines) unchanged unless required: HTTP owns
wire publication, not persistence. Preserve current API routes, Core commands, Yjs identity, local Undo,
selection and user changes (including examples/specimen-page.json). No deployment/auth or replacement
imports in this task. Validate focused behavior, full tests, type/lint and an actual two-tab browser run.

Completion: three delegated slices integrated centrally. Project transport multiplexes existing
document providers on one socket; server catalog frames precede dependent edits, including reconnect.
Private session-catalog registration validates batches and hydrates new histories without replacing
existing stores or changing selection, drill state, unsent edits or Undo/Redo. The coordinator remains
cohesive at 493 lines; its registration logic stays in the owning private helper. No transport size
candidates remain. Regenerated schema from existing DSL and UI output for the user's explicit
Specimen child-field override; adjusted preview assertions to honor current data rather than blanks
or historical placeholders. User example source and padding are unchanged.
Validation: all 679 tests in 133 files pass; editor/server typechecks and scoped lint pass. Real
two-session integration covers registration echoes, dependent instances, local Undo, Save and restart
catch-up. Browser on an isolated copy: new component in tab A immediately appeared in tab B without
navigation/reload; API text appeared in both, Save in B succeeded, and a fresh view rendered it.
Stopped isolated preview servers and removed temporary Next configuration changes. Local default
server restarted with the new channel. Remaining local-only/auth/import/schema-library boundaries
are unchanged and documented in project-api.md.
Final validation cleanup: full lint also exposed unused imports/parameters from existing refactors.
Remove imports or prefix unused parameters while preserving signatures and runtime behavior; no
additional decomposition or DSL change. Discard only the generated isolated Next verification cache.
Broader existing gates remain separate: workspace typecheck fails because core's component-token
test imports undeclared store-yjs (10 packages pass, core fails); global Prettier reports widespread
existing formatting deviations.
Do not add a cyclic dev dependency or reformat the repository silently. Editor/server typechecks,
changed-source formatting, ESLint and the complete behavioral test suite are the completion gates
for this scoped change; record those broader follow-ups explicitly.
Final rerun after cleanup: ESLint passes across the repository, all 679 tests pass, changed TS
formatting passes, and the detector retains only the cohesive 493-line session coordinator.

### Global refactor skill (2026-10-02)

- Evidence: the local skill hard-codes Facadeur paths/contracts; its detector assumes a
  monorepo layout and excludes `packages/ui` globally. Its guidelines link resolves incorrectly.
- Boundary: bundle generic guidelines and a project-root-aware detector in the personal
  `$refactor` skill. Keep Facadeur ownership and its existing detector in this repository.
- Scope/contracts: tooling only; retain 450/700-line and 12-direct-file review signals,
  behavior-preserving decisions, existing app behavior, user edits and staging.
- Validation: skill validator, temporary Git/non-Git projects, path/exclusion/threshold
  regression tests, and a read-only scan against this repository.

### Shared Yjs project server and save/edit API (2026-10-02)

- [x] Add durable project document storage with server-owned Y.Docs and validated commands.
- [x] Add local HTTP load/edit/save endpoints and a WebSocket update channel; acknowledge
      edits only after persistence, reject stale revisions and externally changed JSON exports.
- [x] Hydrate editor stores from the server's Yjs history, synchronize remote edits and local
      Undo/Redo, and separate remote transaction origins from local Undo history.
- [x] Load the editor through the project API, save shared snapshots without a file picker,
      expose JSON export explicitly and show connection/persistence failures.
- [x] Verify HTTP/API edits, two-client sync, restart recovery, invalid commands/updates,
      save conflicts, local Undo isolation, and the browser save workflow.

Refactoring decisions: `create-editor-session.ts` (455 lines) remains the session coordinator;
new transport and persistence responsibility belongs in a private `domain/project/` adapter.
The shell directory remains one cohesive UI domain. Extract remote Yjs update observation
within `store-yjs` before adding transport. A new `apps/server` owns independent server
runtime, disk persistence and HTTP/WebSocket lifecycle; it consumes package public APIs.
Preserve existing staged changes, the user's chrome-body padding, JSON/command contracts,
sparse overrides, token resolution and local Undo. Runtime sync state is stored separately
from explicit JSON exports. Initial scope is one local project, bound to loopback; deployment,
authentication and multi-project management are later work.

Completion: delegated store/hydration, durable repository, and sync-provider work, integrated
HTTP transport and editor save centrally. Final scan retains the 478-line session coordinator
and 461-line project repository: each coordinates one lifecycle; persistence and validation
are already colocated private modules. Retain the cohesive shell directory. Existing package
exports and nested JSON remain compatible; the store adds explicit hydration/remote APIs.
The codec's JSON-record cast was corrected as a prerequisite for passing store typechecks.
Browser verification used a disposable copy of examples: Save wrote Card without a picker,
HTTP preview-data edits appeared live, a second tab hydrated the unsaved shared state, and
server outage produced an explicit save error. Reconnection after restart retained the API
edit and Save succeeded. No project example or user padding was modified in this verification.
See [project-api.md](project-api.md) for endpoint contracts and local-only boundaries.
Live catalog additions in other tabs, replacement imports, shared schema-library management,
authentication and a browser-durable offline outbox are intentionally not included.
Existing full-suite deviations: generated schema lacks the component-token label, the
Storybook Media assertion still expects the previous placeholder, and bound-field editing
expects an empty preview value despite the newly staged example data. These are unrelated
schema/test expectation follow-ups; the API implementation does not change their contracts.
Final focused result: 81 API/sync/store/save/shell tests pass. Full-suite result: 662 tests
pass; only those 3 existing deviations fail. Changed
TypeScript paths pass lint and editor/server/store typechecks; all new API/sync tests pass.

### Artboard chrome and component previews (2026-10-01)

- [x] Remove editor-only outer/inner artboard padding and the chrome body/screen insets;
      retain viewport width, title and content alignment.
- [x] Supply missing example preview data, including Card and Sign in, and check presets.
- [x] Verify preview rendering, sparse variant inheritance, viewport settings and browser layout.

Refactoring review: the affected viewport, preview-data and viewport-panel paths have no
size candidates. Retain their cohesive boundaries: frame-host owns iframe presentation,
viewports coordinates boards, viewport-chrome resolves settings, and examples own sample
content. No extraction is needed for these focused corrections. Preserve document layout
padding, runtime field contracts, preview-data overrides, exports and Undo behavior.
Validation: targeted preview/viewport tests, example validation, editor typecheck/lint and
browser checks of standalone and nested components across viewports.

Completion: 14 example datasets added and generated Storybook args refreshed. Legacy chrome
padding is accepted but ignored; padding controls are removed. Fixed board widths and title
ellipsis prevent the header from widening small viewports at low zoom. All 67 targeted tests
pass; changed TypeScript sources pass lint, and before/after scans have no candidates.
Browser: Card and Sign in render across all six viewports, Compact retains sample content,
all chrome/body/screen/iframe padding is zero, and frame widths match at 20% zoom. Screenshot
checked at 52% zoom. Temporary inspector resizing was restored.
Existing validation failures outside this change: `store-yjs/src/codec.ts:58` casts
`ComponentTokenMap` directly to a JSON record; the committed JSON Schema is missing the
component-token `label` property. The schema-sync assertion was excluded from the targeted
passing run after confirming its failure separately; catalog/roundtrip checks pass.

Vor Erweiterungen betroffene Dateien mit `node scripts/refactor-candidates.mjs <Pfade>`
prüfen und die [Checkliste](refactoring-checklist.md) anwenden. Größe löst eine Prüfung aus,
keine automatische Aufteilung. Begründete Refactors innerhalb des aktuellen Auftrags kommen
vor die davon abhängige Feature-Arbeit in den Aufgabenplan. Andere Kandidaten bleiben im Backlog.
Aktuelle Nutzerentscheidungen haben Vorrang vor historischen Architekturentscheidungen unten.

### Nested instance fields (2026-10-01)

The current request replaced the previous master-only drill-in selection model: instances can be
expanded in the layer list and inner layers selected in the containing document. Inner layers allow
only local field values, not structural, style, schema, or variant changes to the master. Editing the
master remains an explicit action.

The implementation encapsulated selection and virtual-tree behavior in a focused editor domain
module before extending Session, Layers, and Stage. Local node IDs and render addresses remain
distinct; `nested-selection` owns their resolution and tree projection while Session remains the
coordinator. Sparse `childFields` on instances add local overrides for unexposed inner input fields.
Paths contain instance IDs rather than copies of masters. Field-only commands, reset, and validation
preserve atomic rejection, Undo, and round trips. Renderer, variants, Yjs, and codegen share this
contract; portable path/overlay semantics belong to Core, while DOM/code output stays in adapters.

The inspector shows field origin, inherited values, and reset. Nested selections have no style,
structure, or variant controls. The selection path is represented in the URL to avoid collisions
between identical inner node IDs. Regression coverage includes isolation between instances and
masters, deep paths, bindings, active variants, reset, Undo/Redo, persistence, and codegen.

Independent size/organization candidates remain in the backlog. Existing Stage/Session coordinators
receive integration points and guards only; no resolver responsibility was added. The data-model
change is limited to the justified optional field-override map, with no migration of existing docs.
`nested-selection/` separates address resolution, field context, and virtual-tree projection;
`InstanceFieldOverride` is shared by direct and nested inspectors. Core owns shared path/merge
semantics; codegen owns a private transport emitter. Schema/Flat and output/Session coordinators
remain cohesive. The Yjs codec separates encode, decode, and shared helpers while `codec.ts` keeps
`patchDocument`, `readDocument`, and `ensureDocumentMaps`. Round trips and Undo remain unchanged.
`packages/tokens/src/resolve.ts` remains a cohesive resolution/output algorithm, and Content Inspector
files remain one UI domain. Validation: 116 test files / 569 tests, typechecks for five affected
packages, lint and formatting of changed sources, and semantic review of generated React code.
Browser verification covered local label/placeholder overrides in all three viewports, isolation of
other inputs, and reset to inherited values; test changes were reverted.

### Refactoring backlog

Team-Pass (2026-10-01): Validation, Commands und Variants fachlich extrahieren.
Abschlusskriterien: öffentliche Exports/Entry Points erhalten; keine Schema-, API- oder
Verhaltensänderungen; keine Runtime-Zyklen; bestehende Contracts-, Command-/Undo-, Varianten-,
Roundtrip- und Codegen-Tests bestehen. Gemeinsame Integration und Browser-Smoke-Check durch
den Teamleiter nach den drei unabhängigen Extraktionen. Andere Kandidaten bleiben außerhalb
dieses Passes.

Organisationsentscheidung vom 2026-10-01: Core wird nach `document/`, `commands/`, `variants/`
und `styles/` gegliedert. Private Helfer bleiben beim jeweiligen Domain-Modul;
paketübergreifende Wiederverwendung erfolgt über `@facadeur/core`, ohne Deep Imports oder
neues Utility-Paket. Der öffentliche Entry Point und alle bestehenden Contracts bleiben erhalten.
`token-tree.ts` bleibt ein einzelnes Modul; `validate.ts` ist nach fachlicher Extraktion eine Compatibility-Fassade.
Die unten offenen Größen-Kandidaten gelten nach dem Verschieben weiterhin: Organisation
allein löst keine übergroßen Verantwortlichkeiten.

In diesem Pass umgesetzte fachliche Extraktionen: Validierung nach lokalen Definitionen, Baum-/Dokumentregeln
und katalogübergreifenden Contracts; Commands nach Dispatcher und Mutation-Familien;
Varianten nach Auflösung/Anwendung und Ableitung von Deltas. Dabei gemeinsame Helfer erst
nach belegter Wiederverwendung extrahieren und bidirektionale Varianten-/Roundtrip-Tests erhalten.

- **Validation:** `validation/schema.ts` übernimmt den Schema-Eingang, `assertions.ts`
  lokale Assertions, `tree.ts` Baum-/Library-Regeln und `definitions.ts` Definitionen.
  `catalog-exposed.ts` und `data-contracts.ts` kapseln übergreifende Contracts;
  `catalog.ts` koordiniert die Katalogprüfung. `validate.ts` erhält die bisherigen Exports.
- **Commands:** `commands.ts` behält Cloning, Dispatch, Canonicalization und finale Validierung.
  `types.ts` enthält Command-Typen; `structure.ts`, `node.ts`, `definitions.ts` und `design.ts`
  enthalten die Mutation-Familien. Node-/Value-/Token-Read-Helfer sind nur bei belegter
  Wiederverwendung geteilt. Atomare Ablehnung und der Undo-Vertrag bleiben erhalten.
- **Variants:** `resolve.ts` übernimmt Auflösung/Anwendung, `derive.ts` die Preset-Ableitung
  und `derive-node.ts` Node-Deltas. `style-layers.ts` enthält den tatsächlich gemeinsam
  verwendeten Layer-Helfer. `variants.ts` erhält den bisherigen Entry Point.

Abgeschlossen: 530 Tests in 108 Dateien, Core-/Editor-Typechecks, Core-Lint und Formatprüfung
bestanden. Browser-Smoke-Check mit Layout-Änderung und Undo bestanden. Alle 131 ursprünglichen
Funktionskörper erhalten; keine fehlenden Runtime-Imports oder Runtime-Zyklen. Öffentliche
API, Schema und Datenmodell unverändert.

Dependency-Grenzen: Validation darf Variants verwenden, nicht umgekehrt; Commands dürfen
Validation verwenden, nicht umgekehrt. `styles/style-block.ts` verwendet `FlatDocument` nur
als Typ, weil `document/flat.ts` Style-Canonicalization benötigt. Token-Tree bleibt unabhängig
von FlatDocument. Schema, Flat-Konvertierung, Style-Block und Token-Tree werden vorerst
beibehalten, solange keine konkrete Verantwortungsgrenze den Roundtrip-Risiken gegenübersteht.

Erster Größen-Scan vom 2026-10-01. Offene Einträge sind **Prüfaufträge**, keine beschlossenen
Refactors. Vor Umsetzung konkrete Verantwortlichkeiten, Grenzen und Verhaltenstests festlegen.
Bei zusammenhängendem Code darf die Entscheidung ausdrücklich „beibehalten“ lauten.

| Status                    | Kandidat                                                         | Ergebnis / nächste Prüfung                                                                               |
| ------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Erledigt                  | `packages/core/src/validate.ts`                                  | Schema, lokale Regeln und Catalog-Contracts extrahiert; Exports und Invarianten erhalten.                |
| Erledigt                  | `packages/core/src/commands/commands.ts`                         | Kleiner Dispatcher und Mutation-Familien; atomare Validierung und Undo-Vertrag erhalten.                 |
| Erledigt                  | `packages/store-yjs/src/codec.ts`                                | Encode, Decode und gemeinsame Yjs-Helfer extrahiert; öffentliche Funktionen bleiben in `codec.ts`.       |
| Erledigt                  | `packages/core/src/variants/variants.ts`                         | Resolver, Preset-Ableitung und Node-Deltas getrennt; Sparse-Override-Verhalten erhalten.                 |
| Erledigt                  | `packages/core/src/document/schema.ts`                           | Schemafamilien unter `document/schemas/`; `schema.ts` behält die öffentlichen Exports.                   |
| Erledigt                  | `apps/editor/src/ui/stage/StageCanvas.tsx`                       | Zeigerinteraktion und Board-Mount liegen in `stage/canvas/`; `StageCanvas` bleibt die Komponente.        |
| Erledigt                  | `packages/core/src/token-tree.ts`                                | Werteprüfungen, Lesen und Baummutation getrennt; öffentliche Funktionen bleiben in `token-tree.ts`.      |
| Erledigt                  | `packages/codegen-react/src/component/render.ts`                 | Ereignisse, Datenausdrücke, Bindings und Instanzen extrahiert; `renderNode` bleibt öffentlich.           |
| Erledigt                  | `packages/core/src/document/flat.ts`                             | Klonen und Baumabfragen unter `document/flat/`; Umwandlung bleibt in `flat.ts`.                          |
| Erledigt                  | `packages/core/src/styles/style-block.ts`                        | Parser nach `style-block-parse.ts`; Canonicalize, Prune und Contract bleiben zusammen.                   |
| Erledigt                  | `packages/tokens/src/resolve.ts`                                 | CSS-Ausgabe nach `css-properties.ts`; `loadTokens` und die öffentlichen Exports bleiben in `resolve.ts`. |
| Erledigt                  | `apps/editor/src/ui/sidebar/layers/ProjectTree.tsx`              | Zeilen und Kontextmenü in `AssetRows.tsx`; Suche und Anlegen bleiben im Baum.                            |
| Erledigt                  | `apps/editor/src/domain/session/create-editor-session.ts`        | Katalog, Snapshot und Befehle liegen daneben; `createEditorSession` bleibt der Koordinator.              |
| Erledigt                  | `packages/codegen-react/src/component/catalog.ts`                | Feldtypen und Defaults nach `catalog-fields.ts`; `assignCatalog` bleibt der Katalogdurchlauf.            |
| Erledigt                  | `apps/editor/src/ui/sidebar/design/tokens/TokensDomainPanel.tsx` | Zeile, Vorschau und Breakpoint-Helfer extrahiert; Token-Cluster liegt unter `design/tokens/`.            |
| Beibehalten nach Refactor | `packages/renderer-dom/src/render.ts`                            | Rendering/Reconciliation bleibt zusammen; Resolution, Presentation und Contracts wurden extrahiert.      |

`apps/editor/src/domain` ist nach `schema/`, `edits/`, `viewport/`, `selection/`, `navigation/`
und `assets/` gruppiert. Token-Panels liegen unter `sidebar/design/tokens/`. Komponenten-Editoren
des Content-Inspectors liegen unter `properties/content/component/`. `controls/data` und `shell`
bleiben flach, jeweils eine UI-Domäne. Keine `shared/`- oder `utils`-Ordner. Der DOM-Renderer
behält Paint und Kind-Abgleich zusammen, weil beide sich gegenseitig aufrufen.


## Completed implementation reports (2026-10-06 to 2026-10-09)

### Native event authoring repair (2026-10-06)

- Evidence: Add event holds an unsaved local draft, while header Save persists only the document;
  Schema has no native element binding control, and the inspector disables bindings without a declaration.
- Boundary: extract the existing native-event binding adapter into a private content component reused
  by Schema and the inspector. Keep contract review in ComponentEvents and field bindings in NodeBindings.
  Add event creates a canonical editable declaration immediately; native bindings use atomic defineEvent
  commands so shared event wiring is not written into a presentation variant.
- Preserve serializable Core events/data contracts, validation, Undo, persistence and legacy mappings.
  Validate creation/binding/save/reload, root/child selection, focused event tests, editor types/lint,
  and rerun the candidate detector. No package or schema-format changes.

Result: Add event now creates a document declaration immediately. Schema exposes native element
selection and binding; the inspector can create and bind its first event without a disabled button.
Button/Link default to click. Shared declarations/bindings use document commands independently of
nested selection and named presentation variants. 34 focused UI/session/inspector tests, editor
TypeScript, scoped ESLint and formatting pass; detector reports no size candidates. In the running
local editor, Button's click event was created, bound to root, saved and verified after reload.
Existing user edits and staging remain intact.

### Unified event authoring (2026-10-06)

- Evidence: contract and native binding controls expose two independent Add workflows and an
  event-selection dropdown where users expect a name input; section/page guards hide valid events.
- Boundary: keep each declaration, schema and native targets inside its event accordion. Extract
  the event-target adapter next to ComponentEvents and reuse the existing mapping editor with its
  declaration selector hidden. Replace the separate Schema/inspector adapters rather than retain
  competing flows. Keep ComponentEvents' transactional schema/mapping review intact.
- Scope/contracts: all four document kinds can declare events; page field/variant restrictions
  remain. Preserve existing event names, multiple bindings, data mappings, command validation,
  Undo, JSON round trips and generated callbacks. Native target is optional.
- ContentPanel's 482 lines remain cohesive scope/content orchestration; no size-only split.
- Validation: author/rename/schema/target/native changes, all four kinds, save/reload and existing
  mapping review; editor TypeScript/lint/format and browser check; rerun detector.

Result: all four document kinds expose Events in Schema and the inspector. Each event has one
accordion containing its editable name, data schema, optional native target(s), native event and
mapping controls; callback details stay collapsed. Separate declaration/binding selectors and the
Add click event shortcut are removed. Renaming keeps the accordion open and updates its targets.
The existing required-mapping review now lives within the same accordion. A target with incomplete
mappings remains an explicitly marked draft until valid; declarations remain persistable on their own.
23 focused UI/inspector tests and editor TypeScript pass, including schema/native data, renaming,
multiple targets, removal and save/reload for atom/component/section/page. Browser verification on
New section confirmed manual naming and targeting; temporary test edits were undone to the clean
baseline. The detector retains only cohesive ContentPanel (474 lines); no further split is warranted.

### Schema and Fonts accordion consistency (2026-10-06)

- Evidence: Fonts has a compact chevron button within a rounded resource row; Schema mixes
  Section triggers, native details and bordered folds with different spacing and chevrons.
- Boundary: extract Fonts' disclosure trigger into the existing form/layout layer and add an
  explicit accordion appearance to Section. Fonts retains its table/preview columns; Schema's
  event, callback, legacy contract and variant disclosures use the same trigger and border style.
  Keep other Section appearances and unrelated token tables unchanged.
- Preserve existing expanded defaults, button names, keyboard activation, mounted-body behavior,
  event drafts and font editing/removal commands. No document or persistence changes.
- Validation: existing event/schema and design-resource checks, editor TypeScript/lint/format,
  visual inspection of expanded/collapsed Schema and Fonts, scoped detector rerun.

Result: Fonts and Schema share the extracted disclosure button. Event/schema accordions have the
Fonts border radius, row padding, muted chevron, hover and keyboard focus styling. Callback preview,
legacy contract and legacy variant axes use the same appearance; other form sections retain their
existing styling. Former native-details content stays mounted while hidden to preserve draft state.
38 existing UI/font/event/integration tests, editor TypeScript and scoped ESLint pass. Browser checks
confirmed Enter/Space expansion and collapse and matching Fonts/Schema visuals without data edits.
The scoped detector has no candidates.

### Legacy UI, document naming and utility classes (2026-10-06)

- Evidence: retired expose/variant panels still occupy Schema; the class editor accepts only one
  identifier and rejects Tailwind tokens; asset IDs are visible but names/IDs lack a rename action.
- Boundary: remove legacy authoring panels from Schema while retaining persisted compatibility.
  Core owns optional native/instance classes arrays, canonicalization and commands; adapters preserve
  them; renderer/codegen add literal utility classes beside generated local styling classes. Editor
  owns a reusable badge/autocomplete control and project class suggestions. Keep styleName for local
  selector identity and old documents. The user clarified that reference IDs should remain stable. Add editable `slug` metadata
  with project uniqueness validation, a guarded Core command and an editor rename dialog; old
  documents fall back to their existing ID. New asset creation reserves IDs and public identifiers.
- Contracts: maintain legacy imports/events/variant data, generated CSS scope, repeated instance
  styling, clone isolation, JSON/Yjs/Undo, class order and arbitrary non-whitespace utility tokens.
- Retain cohesive node construction (480 lines); the unrelated declaration editor stays unchanged.
- Validate class commands/round trips, instance/native rendering and generated literals, badge
  interactions, legacy-panel removal, relevant types/lint and visual editing checks.

Outcome: retired Schema panels are hidden while persisted data remains supported. Name and public
identifier are editable through the asset context menu; internal reference IDs remain unchanged.
Native elements and instances persist ordered utility class arrays, with badges, autocomplete from
common utilities and project classes, and literal generated output beside existing scoped styles.
48 focused command/adapter/codegen/rename/variant tests and 24 shell/Schema regressions passed.
Workspace TypeScript, affected-file ESLint/format checks, and schema export passed. Browser checks
confirmed badge entry, rename and Undo; temporary edits were undone. The repeated detector flags
the cohesive node materializer, DOM paint module (451 lines) and unrelated declaration editor.
DOM class application remains part of presentation painting; retain that boundary rather than
extracting a speculative helper for three class-list additions. No further split is needed.

### Native form atoms and project grouping (2026-10-06)

- Evidence: starter projects have only one input atom; composed Textarea/Select examples are
  unsuitable as native atoms. Native Select needs options-array rendering in preview and codegen.
  Document group metadata already exists, but the project tree has no action to edit it.
- Boundary: add four single-element atom fixtures with typed fields/events. Core owns a focused
  group command and native options binding contract; adapters preserve it, renderer and generator
  render native options. Editor owns a group-name dialog using existing groups as suggestions.
  API project initialization owns a versioned, additive starter upgrade for existing managed
  projects, preserving edited atoms and custom group assignments.
- Retain cohesive DOM painting and node validation; isolate native Select option presentation
  beside renderer presentation, rather than growing the painting orchestrator. Core validates
  the option-item contract; preview and codegen consume it through existing public field types.
- Preserve stable references, current staging, group persistence/Undo, native event envelopes,
  uncontrolled React values, and the distinction between native atoms and composed components.
- Validate group naming/history, catalog upgrades, atom contracts and native option rendering,
  generated controls/events, affected types/lint and live project-tree interactions.

Completed: native Textarea, Select, Checkbox and Radio join Input under Form. Asset context
menus expose group naming/suggestions and removal; history and persistence preserve stable IDs.
Select renders typed native options in preview and generated React. Multiple semantic events
on one native event share a generated handler, preserving both callbacks and their envelopes.
The default generator command includes the four new atoms. 97 focused/regression tests, source
and generated workspace TypeScript, affected-source ESLint, formatting and codegen passed.
Live browser checks confirmed the additive starter upgrade, custom group creation, Undo and
native Select options; temporary grouping edits were undone. Context-menu positioning now
measures its rendered height so the additional actions remain inside the viewport.

Repeated detector review: retain the cohesive paint orchestrator (454 lines) and definition
validator (474 lines); native option presentation/validation have focused colocated helpers.
Validation and renderer directory concentration remains within their existing domain owners;
unchanged structural/data-contract candidates remain in the existing backlog.

Unrelated refactoring candidate: LayerContextMenu uses the same anchor-bottom placement that
previously clipped asset actions. When revisiting layer menus, share measured floating-menu
positioning within the sidebar domain, preserving insert/delete flyouts and keyboard actions;
validate at viewport edges and with each submenu. This task fixes only the asset menu used by
the requested group workflow.

### Root selection when opening project assets (2026-10-06)

Project-tree navigation currently opens documents without a layer selection, leaving the
inspector empty. Reuse the session's existing root-focus option for both shell navigation
surfaces. Keep document/drill navigation and explicit layer selection contracts unchanged;
this is a shell navigation behavior fix and needs no structural split. Validate project-row
clicks across asset kinds, selection resets and existing URL navigation regressions.

Completed: both project-tree entry points open assets with root focus, including clicking an
already open asset. 12 navigation tests, editor TypeScript and affected-source ESLint passed.
Updated the stale legacy-panel assertion to match the previously requested hidden UI.
The repeated scoped detector has no candidates; existing session orchestration remains untouched.

### Move Storybook catalog presets into Controls

The right-sidebar story currently renders asset/layer selectors inside the preview while the
native Storybook Controls panel is empty. Move that selection into a story arg backed by presets
generated from the typed example catalog. Each preset pairs one definition with one of its real
layers, preserving valid selection and the preview's default state. Keep the preset builder in
the Storybook controls library and remove the in-preview selector. Validate examples types,
the scoped refactor detector, and a Storybook build.

Result: the sidebar story now exposes one Preset select in Storybook's bottom Controls panel.
Its options are generated from every catalog definition and its real layers, so selecting one
previews that node in the inspector. The canvas selector is removed. Examples typecheck, scoped
detector, diff check, and Storybook production build pass; Vite emitted existing client-directive,
sourcemap, and chunk-size warnings during its successful build.

### Reusable dependent-select Storybook panel

The catalog preset dropdown combines asset and layer in one static select, but the editor needs
separate controls where the layer options react to the selected asset. Storybook's native
argTypes controls cannot filter one select's options from another arg at runtime. Add a generic,
app-local manager panel configured through story parameters with externally supplied options and
arg names; changing an asset also selects its first valid layer. Keep catalog knowledge in the
story and make the panel reusable without Facadeur imports. Validate by building Storybook and
checking the scoped detector; no package dependency changes are expected.

Result: `.storybook/lib/dependent-select/` now contains a generic panel, typed serializable
configuration contract, registration helper, and copy/reuse README. The right-sidebar story passes
catalog groups and layer options from the outside, and the two args render the chosen asset/layer.
Changing Asset updates Layer to its first valid value. Storybook production build and the scoped
detector pass; Vite reports its existing client-directive, sourcemap, and chunk-size warnings.
The blank panel was caused by the manager's classic JSX transform requiring an explicit React
import; the imports are now present. Runtime verification confirmed the Asset and Layer controls
render and the Layer options change when Asset changes. The running Storybook manager bundle was
stale, so the 6006 dev server needs a restart to load the fix.

### Make the Storybook panel schema-driven

The reusable panel currently owns a fixed two-select layout, which limits other stories from
using it for ordinary fields or repeaters. Replace that fixed shape with an externally supplied
serializable field schema, keeping dependent selects and adding text, number, boolean, and repeater
fields with typed item fields. Preserve Storybook args as the only edited state and keep all
Facadeur catalog data in the story. Validate with the Storybook build and scoped detector.

Result: the manager panel now renders external field schemas for text, number, boolean, static or
dependent select, and repeater fields. Repeater items accept their own typed controls and add,
edit, and remove operations update story args. The right-sidebar story supplies catalog fields;
its temporary repeater demo was removed after runtime verification, while generic repeater support
remains available to other stories. Storybook production build and scoped detector pass. Runtime
verification confirmed that Asset changes Layer options and repeater edits update story args and
preview. The previous `dependent-select` library is replaced by `.storybook/lib/schema-form/`.

### Run the editor shell in Storybook

`useEditorNavigation` imports Next navigation hooks inside `EditorShell`, which prevents the full
shell from running in Storybook. Move framework-specific location reads and push/replace calls
behind a typed navigation adapter passed to the shell. The Next project workspace supplies its
existing router, while a Storybook-only browser-history adapter supplies the same query contract
and reports navigation events through a `storybook/test` spy for the Actions panel. Reuse the
existing example catalog and in-memory editor fixture; keep authentication and network clients out
of this story. Preserve editor query keys, unrelated query parameters, deep-link restore, and
browser back/forward behavior. Validate editor typecheck, formatting, scoped detector, Storybook
rendering, route changes, and Action events.

Result: `EditorShell` now receives a typed navigation adapter. `ProjectWorkspace` bridges that
contract to Next.js, and the Storybook App/Editor story uses browser history with popstate restore
and a `storybook/test` spy for the Actions panel. The story renders the full example catalog through
the existing in-memory editor fixture. Browser rendering, formatting, and scoped detector pass;
editor typecheck remains blocked by existing errors in other workspace packages and editor
modules. Action invocation is wired but was not manually triggered in the browser during this run.

### Use the shared form package in the catalog inspector

The catalog inspector still renders Core's form model through the editor-local `Form` and
`SchemaForm`, even though `@facadeur/form` is the intended reusable UI owner. Adapt the inspector
model into `@facadeur/form` field configs and add only the missing reusable class-list and
key/value-record controls there. Binding options and all field values remain supplied by the
editor; the form package must not import Core or editor code at runtime. Keep Core's preview form
model as the temporary source of inspector field metadata so the current preview semantics and
selection behavior stay intact while we plan its replacement separately. Validate the package and
editor typechecks, Storybook rendering, scoped detector, formatting, and diff review.

Result: the catalog inspector now renders through `@facadeur/form`, with reusable class-list,
record, and bindable-value fields. Editor-supplied field configs and design-property options keep
the package independent of Core. Core's existing preview inspector model remains the adapter for
now, preserving field semantics while the replacement is planned. Form package typecheck,
changed-source editor typecheck, formatting, and detector pass. The Storybook build reached preview
compilation but SWC failed to canonicalize the editor base path in this Windows environment; the
open Storybook tab also retained its earlier stale module error because port 6006 was already in
use and could not be restarted from this process.

Follow-up: hide the bind control when the editor supplies no design-property options; it cannot
perform an action in that state. Keep it available for both record values and bindable text when
options exist. Validate form typecheck, formatting, detector, and diff check.

Result: `RecordField` now accepts optional key and per-key value suggestions and renders them with
native datalists, so free-form input remains supported. The inspector derives those suggestions
from styles already used across the project catalog and passes them into the reusable form field.
Form package typecheck, changed-source editor typecheck, formatting, detector, and diff check pass;
Storybook runtime verification remains blocked by the previously documented local SWC path error.

### Keep emptied style rows until explicit removal

The reusable record control emits a whole style record after each edit, and Core currently drops
entries with empty values. That makes clearing a value act like deletion and bypasses the row's
explicit remove button. Preserve empty strings in the catalog node style record; the renderer
already treats an empty inline style value as inactive. Keep removing a property tied to omission
from the record. Validate core and form typechecks, the scoped detector, and diff review.

Result: Core now preserves empty string values in node style records and deletes only omitted keys.
The renderer receives an empty inline style value, which clears its visual effect while keeping the
editable row in the catalog. Form typecheck and changed-source checks pass. Core's full typecheck is
still blocked by unrelated existing errors in catalog, API, and test sources; scoped detector and
diff check pass.

### Stack class chips above a full-width input

Completed as part of replacing the duplicate class-list field with generic chips. The Inspector
now uses the reusable chips control, whose chips occupy their own wrapping row above a full-width
input inside one control boundary.

### Give example props and tokens stable references

Example style fixtures currently store path references such as `{color.text.primary}`, while
component bindings store raw `{props:uuid}` strings. Add stable UUID metadata to every example
token, convert known style references to `{token:uuid}` as definitions are assembled, and provide
a small helper for prop references so example nodes use schema-owned IDs instead of repeating
reference syntax. Preserve DTCG path aliases inside token `$value`s; runtime style resolution is
out of scope for this pass. Validate the example package types and inspect representative emitted
catalog data.

Result: example token leaves now carry stable UUID metadata, known style references are emitted as
`{token:uuid}`, and Card/Image bindings derive `{props:uuid}` from the IDs declared by their schemas.
Example package typecheck and emitted-reference inspection pass; runtime token/style resolution
remains outside this change.

### Accept stable UUID metadata on global tokens

- [x] Evidence: the examples catalog now places stable token identity at
      `$extensions.facadeur.uuid`, but Core's global token reader rejects every Facadeur
      extension outside `tier`, `breakpoints`, and `label`, causing Storybook catalog reads to fail.
- Action: extend the token contract and indexed token view to preserve an optional UUID while
  leaving path-based indexing and existing token behavior intact.
- Scope: prerequisite for loading example catalogs with stable token identity.
- Contracts: preserve DTCG path references, validation of existing Facadeur extensions, and all
  existing token reader output; UUID metadata must survive canonicalization and inspection.
- Validation: Core and examples typechecks, focused reader inspection, and the scoped detector.

Result: `facadeur.uuid` is now accepted and preserved on indexed token records while path indexing
remains unchanged. A direct catalog read indexed all 62 tokens and retained all 62 UUIDs. The
examples typecheck passes; Core typecheck still reports existing errors in catalog mutation,
design bridge, and test imports, with no diagnostics in the changed token reader files.

### Retire the duplicate viewport board

The editor mounts the React catalog board, while `viewports.ts` still contains an unreferenced
DOM-renderer board and its test suite. Keep iframe pass-through so stage pointer handling and its
selection overlays remain authoritative. Make the React board the sole active board contract,
remove the unused renderer path, and replace the versioned `v2:` selection address with a
semantic `node:` address. Preserve frame hit-testing, layer selection, stable React updates, and
viewport labels. Keep focused tests for React reconciliation and iframe pointer pass-through;
retain independent FrameHost and viewport-chrome helper coverage.

Result: the duplicate DOM-renderer board and its board-specific test file are removed. React board
updates and iframe pass-through have one focused assertion; cross-breakpoint overlay selection now
uses `node:<uuid>`. The scoped detector and diff check pass. Editor TypeScript reports no errors in
the changed canvas/session modules, though the full check still reports existing workspace
dependency errors. Vitest remains blocked in the sandbox by the documented `EPERM` realpath issue.

### Transformable inspector text field

- [x] Evidence: `packages/form`'s `BindableText` replaces text inputs with an `Aa` toggle and a
      select, while component prop options and token scope are editor-owned; `apps/editor` also
      keeps a separate `TextControl` implementation outside the form package.
- Action: add a narrow text-field render seam to `@facadeur/form`; implement the transform menu,
  prop/token selection, and color input in the editor using `@facadeur/form` primitives.
- Scope: initial catalog inspector text fields; do not migrate unrelated editor controls or
  alter authored schema contracts in this pass.
- Contracts: store prop/token choices as stable `{props:uuid}` / `{token:uuid}` strings, keep
  plain text as the default, hide the transform action when only text is available, and keep
  scope/options/popover logic editor-owned.
- Validation: form and editor typechecks, focused UI/build verification, detector, and diff review.

Result: the catalog inspector can override text-field rendering while the shared form package
continues to own its generic inputs. The editor now offers Text, Component prop, CSS token, and
semantically relevant Color transforms; props and UUID-bearing tokens are stored as stable refs.
The form package typecheck passes. Editor typecheck remains blocked by existing workspace/type
resolution errors; Storybook build fails in SWC while canonicalizing `apps/editor` (`os error 5`),
before it can verify the rendered UI. Color mode is an inspector editing mode over a string value;
its mode is not persisted as a schema or node-config field in this first pass.

## Completed roadmap checkpoints

### M0 – POC (complete)

- [x] JSON-DSL, Renderer zu echtem DOM, zoombare/pannbare Bühne, Auswahl mit Sidebar (PR #1)
- [x] Hintergrund-Raster bewegt sich mit Pan/Zoom

### M1 – Foundation

- [x] Monorepo mit pnpm-Workspaces, TypeScript, Vite, ESLint/Prettier, Vitest
- [x] POC nach `packages/editor` bzw. `packages/renderer-dom` überführen (oder als Referenz unter `legacy/` behalten)
- [x] `core`: Typen und Schema für Dokument, Knoten (`frame`, `text`, `image`, `instance`), `kind`, Verschachtelungsregeln
- [x] `core`: flaches Modell (Knoten-Map nach ID, Kinder als ID-Listen) und verlustfreie Umwandlung von/zu verschachteltem Dateiformat, mit Tests
- [x] `core`: `DocumentStore`-Schnittstelle und Befehls-Typen
- [x] `store-yjs`: Yjs-Implementierung von `DocumentStore`, Befehle als Transaktionen, `Y.UndoManager`, Tests
- [x] JSON-Schema-Export und Validierung (Ajv), Beispiele unter `examples/` validieren im Test
- [x] `docs/dsl.md` auf das neue Modell aktualisieren
- [x] CI (GitHub Actions): Lint, Typecheck, Tests

### M2 – Tokens and fonts

- [x] `tokens`: DTCG laden, Gruppen, Referenzen auflösen, Zyklen erkennen
- [x] Ausgabe als CSS Custom Properties
- [x] Schriften-Modell (Familien, Quellen, Fallbacks) und Typo-Skala mit Breakpoint-Werten zu `@media`
- [x] Standard-Token-Set und Standard-Schrift als Vorlage

### M3 – Style engine and renderer

- [x] `style-engine` auf Basis von style-controller, Bugs beheben, Tests
- [x] Stil-Block pro Komponente mit Varianten, Zuständen und Breakpoint-Overrides
- [x] Komponenten setzen/überschreiben Tokens für Kinder
- [x] `renderer-dom`: gezielte Updates pro Knoten statt Neurendern

### M4 – Viewports with iframes

- [x] `FrameHost`-Schnittstelle, ein iframe pro Viewport, same-origin
- [x] Breakpoints konfigurierbar, Frames nebeneinander auf der Bühne
- [x] Auswahl-/Hover-Overlays über den iframes, korrekt bei Zoom/Pan

### M5 – Editor foundation

- [x] React-Shell: Bühne, Ebenenliste, Eigenschaften-Panel, Asset-Liste (Atome/Komponenten/Sektionen/Pages), Token- und Schriften-Bereich
- [x] Befehle über `store-yjs` anbinden, Undo/Redo (Strg+Z / Strg+Shift+Z)
- [x] Renderer und Style-Engine abonnieren Änderungen des Stores und aktualisieren gezielt
- [x] Laden/Speichern der JSON-Dateien (File System Access API oder kleiner Dev-Server)
- [x] Arbeitsbereiche pro `kind`

### M6 – Building in the editor

- [x] Einfüge-Werkzeuge (F/T/I), Drag aus Asset-Liste, Einfügelinie
- [x] Auswahl-Logik (Klick, Doppelklick, Strg+Klick, Esc, Hover)
- [x] Umsortieren per Drag (Bühne und Ebenenliste), In Frame einpacken
- [x] Auto-Layout-Panel (Richtung, gap/padding nur Tokens, Ausrichtung, wrap)
- [x] Größen: hug/fill/fixed pro Achse, min/max, pro Breakpoint
- [x] Freie Positionierung als Option, Pfeiltasten nur dafür
- [x] Leere Frames mit Mindestgröße im Editor

### M7 – Component features

- [x] Variable Felder definieren (Typ, Default) und an Text/Attribute/Stile/Sichtbarkeit binden
- [x] Varianten-Achsen definieren und bearbeiten
- [x] Instanzen: nur Feld- und Variantenwerte überschreibbar, kein Detach, Bearbeiten nur in eigener Ansicht
- [x] Pages nur aus Sektionen (Regeln im Editor durchsetzen)
- [x] Vordefinierte Atome `button`, `link`, `input`, `textarea` in der Projektvorlage

### M8 – React code generation (Next.js)

- [x] Komponenten zu React-Komponenten mit typisierten Props aus Feldern und Varianten
- [x] Tokens and fonts zu CSS, Stil-Blöcke zu CSS
- [x] Beispiel-Next.js-Projekt, das die Ausgabe nutzt

### Editor navigation

- [x] Linke Spalte: ein Projektbaum (Tokens, Schriften, Atoms, Components, Sections, Pages) oben, Ebenenliste des offenen Dokuments unten; Suche und „Neu anlegen“ pro Art

## Decision log

- 2026-09-24: Grundsatzentscheidungen oben festgehalten (iframes pro Viewport, Auto Layout als Standard, Abstände nur über Tokens, Instanzen ohne Detach, Vite + React statt Next.js für den Editor).
- 2026-09-24: Yjs von Anfang an als lokaler Store mit flachem Datenmodell, damit Echtzeit-Zusammenarbeit später nur einen Sync-Server braucht. Sync-Dienst läuft getrennt von Next.js/Vercel.
- 2026-09-24: Schema in `core` mit TypeBox (Draft 2020-12), Validierung mit Ajv. TypeBox ist das Schema, das wir exportieren; ein zweites Zod-Modell würde nur driften.
- 2026-09-24: POC liegt in `packages/renderer-dom` und `packages/editor` (Vite, noch ohne React). Die React-Shell bleibt M5. Die Bühne (Pan/Zoom, Raster, Auswahl) ist die bisherige, auf das neue Dokument umgestellt.
- 2026-09-24: Dateiformat hat ein verschachteltes `root`. Das Wurzel-Frame ist die Arbeitsfläche des Dokuments; Verschachtelungsregeln gelten für alles darunter. Eine Page enthält deshalb als Kinder nur Sektions-Instanzen, das Wurzel-Frame selbst ist der Canvas und kein Inhalt. „Atome enthalten nur Grundbausteine“ heißt: `frame`, `text`, `image`, keine Instanzen. Instanzen sind das Mittel, um Atome und Komponenten einzusetzen.
- 2026-09-24: Felder und Varianten-Achsen stehen im Schema an Atom und Komponente (der Button ist ein Atom und braucht `label`, `tone`, `size`). Instanzen haben keine Kinder, keine Attribute und keinen Stil; nur `layout` plus Feld- und Variantenwerte. Die alte Sign-in-Karte mit Kindern an der Instanz ist eine eigene Komponente `sign-in`.
- 2026-09-24: `style` an Primitiv-Knoten ist Daten (`setStyle`). Anwenden macht die Style-Engine in M3. Die Specimen-Bühne zeigt Varianten über `data-variant-*`, damit der POC-Look ohne Style-Engine bleibt. Abstände (gap, padding, margin) fehlen im Schema, damit keine freien Zahlen die Token-Regel unterlaufen. Absolute Platzierung (`x`, `y`, `width`, `height`) ist drin, weil die Bühne und die freie Position sie brauchen.
- 2026-09-24: `undo`/`redo` gehören zur `DocumentStore`-Schnittstelle, damit die UI den `Y.UndoManager` nicht anfasst. Nur Transaktionen mit Origin `facadeur` landen im Undo-Stack (`captureTimeout: 0`, ein Befehl = ein Schritt). Laden ist nicht rückgängig zu machen. `tokens` und `fonts` sind leere Y.Maps, reserviert für M2.
- 2026-09-24: Standard-Kinds sind `atom | component | section | page`. `defaultNestingRules` ist austauschbar; `createDocumentSchema({ kinds })` baut ein Schema für eine andere Liste. Das committete JSON Schema zählt die vier Standard-Kinds.
- 2026-09-24: M2. Der DTCG-Baum liegt im Dokument unter `tokens`. Ein Objekt mit `$value` ist ein Token, sonst eine Gruppe. `$type` und `facadeur.tier` werden von der Gruppe vererbt; ein eigenes `$type` oder `tier` gewinnt. Referenzen bleiben im Y-Dokument unaufgelöst, CSS macht daraus `var(--…)`. Der Store lehnt Zyklen und fehlende Ziele ab, bevor die Transaktion schreibt.
- 2026-09-24: CSS-Name ist `--` plus Pfadsegmente, verbunden mit `-` (`color.blue.500` → `--color-blue-500`). Segmente sind `[a-z0-9]+`, damit jeder Pfad genau einen Namen hat. Typografie wird pro Feld aufgefächert, das Feld mit doppeltem Bindestrich (`--type-body--font-size`): ein Token-Pfad kann `--` nicht enthalten, also kollidiert das Feld nicht mit einem anderen Token.
- 2026-09-24: Werte pro Breakpoint stehen in `$extensions.facadeur.breakpoints` (gültiges DTCG, andere Werkzeuge ignorieren die Extension). `$value` ist die Basis. Der Breakpoint mit der kleinsten `minWidth` ist diese Basis und erzeugt keine `@media`-Regel. Seine Breite ist die Viewport-Breite des Frames (Standard mobile 375), keine Query-Schwelle — eine Query ab 375 würde schmalere Phones von der Basis abschneiden. Größere Breakpoints erzeugen `@media (min-width: Npx)`. Fehlen Breakpoints im Dokument, gelten mobile 375, tablet 768, desktop 1440.
- 2026-09-24: Schriften sind eine eigene Liste: id, CSS-Familie, Gewichte, Quelle `file` oder `google`, Fallbacks. Der letzte Fallback muss eine generische Familie sein. Daraus werden `--font-<id>`, `@font-face` oder ein Google-`@import`. `{font.sans}` verweist auf die Schrift, nicht auf ein DTCG-Token; ein Token darf denselben Pfad nicht belegen.
- 2026-09-24: Die Abstandsskala ist ein 4px-Raster. Der Name ist der Schritt (`space.4` = 16px), mit den üblichen Sprüngen nach 24px: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24. `space.gap`, `space.inset` und `space.stack` sind die Aliase für gap, padding und margin. Komponenten-Tokens verweisen nur darauf, nie auf eine nackte Länge. Negative Abstände gibt es im Standard-Set nicht; ein negativer Margin wäre später ein eigenes Token, keine freie Zahl am Knoten.
- 2026-09-24: Die Strukturprüfung des DTCG-Baums (`readTokenTree`) liegt in `core`, damit Schema, Katalog und Befehle denselben Baum ablehnen, ohne die CSS-Ausgabe einzubinden. Referenzauflösung und CSS bleiben in `@facadeur/tokens`. Der Store ruft sie vor dem Commit auf. Ein rekursives TypeBox-Schema für den Baum hat den Static-Typ des Dokuments zerstört; das JSON Schema beschreibt den Knoten deshalb über `$defs`, die Typen bleiben in TypeScript von Hand.
- 2026-09-24: Unterstützte `$type`-Werte sind `color`, `dimension`, `number`, `fontFamily`, `fontWeight`, `shadow`, `typography`. Der übrige DTCG-Katalog (duration, cubicBezier, gradient, …) kommt dazu, wenn ein Stil ihn braucht.
- 2026-09-24: `packages/editor` hängt das Stylesheet der Projektvorlage als `<style id="facadeur-tokens">` ein, damit die Custom Properties in der Specimen-Seite sichtbar sind. Die Bühne wendet sie noch nicht auf Knoten an; das bleibt die Style-Engine in M3.
- 2026-09-24: M3. `packages/style-engine` übernimmt `StyleController` und `Rule` aus style-controller, ohne das npm- oder Webpack-Build. Kinder, die an `insert` übergeben werden, landen als eigene Regeln im selben Stylesheet; der Selektor ist Eltern-Selektor plus Kind-Selektor. CSS-Nesting (`CSSStyleRule.insertRule`) entfällt, damit dasselbe Verhalten in jsdom und später pro iframe gilt. `delete` entfernt nur bei Index `>= 0`. Regeln werden ans Ende angehängt, nicht an Index 0, damit die Kaskade der Einfügereihenfolge folgt. Der Konstruktor nimmt ein `Document`, ein `HTMLStyleElement` oder `{ document, styleElement }`.
- 2026-09-24: Der Stil-Block heißt im Dokument `styles`, damit er nicht mit `node.style` (`setStyle`) kollidiert. Zustände sind `hover`, `focus-visible`, `disabled`. `font: "{type.body}"` wird zu den Typo-Longhands. `tokenInterface.reads` muss jede Token-Referenz aus Stil-Block und Layout enthalten; `sets` schreibt die Custom Property auf die Komponentenwurzel, Kinder erben sie. `{font.<id>}` ist eine Schrift und kein Read. `node.style` überschreibt die Basisdeklaration derselben Eigenschaft; Zustände, Varianten und Breakpoints bleiben darüber. `setStyleBlock` und `setTokenInterface` ersetzen den Block als ein Befehl.
- 2026-09-24: Frames sind Flexbox. Die Standardrichtung ist `column` (die CSS-Anfangrichtung wäre `row`; Sektionen, Karten und Formulare stapeln). `gap`, `padding` und `margin` sind nur Token-Referenzen. `width` und `height` sind `{ mode: hug | fill | fixed }`, nicht mehr nackte Pixel. `fixed.size` ist px, ein Token oder `{ unit: "%", value }`. Absolut nur bei `position: "absolute"`. Breakpoint-Overrides werden `@media (min-width)` ab dem nächstgrößeren Breakpoint; die Basis bleibt ohne Query. Fill/Hug eines Kindes wird gegen die Basis-Richtung des Eltern-Frames berechnet, nicht gegen eine Richtung, die erst in einer Query gilt. Die Beispiele nutzen Auto Layout; absolute Platzierung bleibt im Schema und im Konvertierungstest die ausdrückliche Ausnahme.
- 2026-09-24: Der Renderer schreibt `data-node` (lokale Id) und patched über `data-id`. `setStyle` und Layout-Änderungen bauen das Element nicht neu. `DocumentStore`-Events aktualisieren den betroffenen Teilbaum. Die Bühne erzeugt die Style-Engine auf `document` und malt das Specimen daraus. Die früheren Klassen-Styles für Button, Input und Card in `styles.css` entfallen.
- 2026-09-24: `data-id` enthält jedes Frame unter der Instanz (`specimen-section/intro/heading`). Das Wurzel-Frame der Komponente ist das Instanz-Element und fügt kein zweites `root` an. Ein Stylesheet braucht einen Browsing Context: `createHTMLDocument()` hat in jsdom keins, ein iframe-Dokument schon. Die Engine hängt ihr `<style>` an das übergebene `Document` und läuft später einmal pro iframe.
- 2026-09-24: M4. `FrameHost` in `packages/editor` kapselt ein same-origin iframe. `contentDocument` und `contentWindow` gibt es nur dort; der übrige Editor spricht die Schnittstelle an, kein `postMessage`. Pro Breakpoint eine Style-Engine und ein Renderer, alle am selben `DocumentStore`. Ein Befehl malt jeden Viewport. Tokens and fonts kommen über `setDesign` in jedes iframe.
- 2026-09-24: Die Bühne liest Breakpoints aus dem offenen Dokument, sonst aus der Projektvorlage, sonst mobile 375, tablet 768, desktop 1440. Die iframe-Breite ist `minWidth`, damit echte `@media (min-width)` greifen. Die Höhe folgt der Content-Box. Ein Label steht über jedem Frame und bleibt in Bildschirmgröße lesbar (`font-size` geteilt durch den Bühnen-Scale). `settings.artboard` bleibt das Blattmaß im Dokument; die Bühne zeichnet kein einzelnes Sheet mehr.
- 2026-09-24: Auswahl und Hover liegen im Overlay auf der Bühne, nie im iframe. `overlayBox` rechnet iframe-lokale `getBoundingClientRect`-Werte plus die Bildschirmbox des iframes in Bühnenkoordinaten um. Ein Klick setzt dieselbe `data-id` in jedem Frame; Hover zeigt nur das Ziel unter dem Zeiger. `instanceof HTMLElement` gilt nicht über das iframe-Realm, deshalb prüft Renderer und Overlay `nodeType`.
- 2026-09-24: iframes haben `pointer-events: none`. Wheel und Drag treffen die Bühne, auch über einem Frame. Bewegung unter 4px ist ein Klick und wählt per `elementFromPoint` im Frame-Dokument; eine größere Bewegung schwenkt. Doppelklick, Strg+Klick und Esc-zum-Eltern bleiben M6. Der Renderer erzeugt Knoten im `ownerDocument` des Parents.
- 2026-09-24: Das Specimen füllt die Frame-Breite (`width: fill` statt fest 1040, ohne Mindesthöhe 860). Die Card-Reihe ist bis desktop eine Spalte, ab desktop eine Zeile; die Karten sind darunter `fill` und auf desktop fest 420/460. Die Typo-Skala bleibt die bestehende `@media`-Stufe (display 40/48/56). So unterscheiden sich Layout und Schrift zwischen den drei Frames.
- 2026-09-25: M5. Die Shell ist React. Die Bühne bleibt der bisherige Renderer (Pan/Zoom, same-origin iframes, Overlays über den Frames). React zeichnet Chrome und Panels und liest nur über `DocumentStore`. Die UI-Sprache bleibt Englisch, wie die bisherige Bühne.
- 2026-09-25: Ein Arbeitsbereich ist ein `kind`. Die Asset-Liste filtert darauf; Wechseln öffnet das zuletzt geöffnete Dokument dieser Art, sonst das erste. Start ist die Page `specimen`. Jeder Befehl bekommt `resolveKind` aus dem Katalog, damit die Verschachtelungsregeln aus `core` auch an der Bühne gelten. Ein Klick in eine Instanz wählt die Instanz des offenen Dokuments, nicht die inneren Knoten — die gehören zum anderen Dokument und werden nur in dessen Arbeitsbereich bearbeitet.
- 2026-09-25: Seiten lassen das Wurzel-Frame ungemalt (die iframe-Fläche ist die Arbeitsfläche). Atom, Komponente und Sektion setzen `paintRoot`: sonst wäre der Button eine leere Bühne, weil er selbst das Wurzel-Frame ist und keine Kinder hat. `compileDocument` gibt die Root-Regel nur dann aus. Selektoren auf der eigenen Bühne bleiben `data-id`. Der Scope beim Malen des offenen Dokuments sind seine Feld-Defaults, damit die Atom-Wurzel ihre Beschriftung zeigt. Instanzen ersetzen den Scope weiter mit ihren Overrides.
- 2026-09-25: Token- und Schriften-Bereich bearbeiten ein Design-`DocumentStore`, gefüllt aus der Projektvorlage. Die Beispieldateien tragen den Token-Baum nicht in jedem Asset; die Style-Engine malt ihn über `setDesign`, und ein `setToken`/`setFont` aktualisiert jedes iframe, ohne die Frames neu zu bauen. Undo/Redo zielt auf den Store des letzten Befehls (Strg+Z, Strg+Shift+Z, auch Meta). Laden ist nicht undoable. Laden der Datei `project-template` ersetzt das Design, nicht die Asset-Liste.
- 2026-09-25: Das Eigenschaften-Panel schreibt `setProp` (name, tag, text, src, alt, attributes), `setStyle`, an Instanzen `setField`/`setVariant`, und am Wurzelknoten den Default eines bestehenden Feldes über `defineField` (die Button-Beschriftung). Neue Felder, Varianten-Achsen, Auto Layout, Größen und freie Position bleiben M6/M7.
- 2026-09-25: Speichern nutzt die File System Access API und merkt sich den Handle. Fehlt die API, schreibt `PUT /__facadeur/examples` im Vite-Dev-Server nach `examples/<datei>.json`. Sonst startet ein Download. Öffnen nutzt dieselbe API oder ein `<input type="file">`. Der Dateiname des Specimen bleibt `specimen-page.json`.
- 2026-09-25: `setDocument` merkt sich `paintRoot` zusammen mit Adresse und Breakpoints. Ein späteres `applyChange` ohne das Flag würde sonst die Root-Regel aus dem Live-Sheet werfen, und der Button bliebe ein ungestyltes natives `<button>` in der Standard-iframe-Höhe. Die Frame-Höhe misst die Kind-Rects (`getBoundingClientRect`), nicht `scrollHeight` (das bleibt bei leerem Inhalt auf 150px stehen). Ein `MutationObserver` misst nach, sobald der Renderer die Wurzel einfügt.
- 2026-09-25: M6. Der Auswahlkontext ist der Elternknoten der Selektion, sonst die Wurzel. Ein Klick wählt das direkte Kind dieses Kontexts unter dem Zeiger. Liegt der Treffer außerhalb, fällt der Kontext auf die Wurzel zurück. Doppelklick geht eine Stufe die Trefferkette hinunter, Strg/Cmd+Klick wählt den tiefsten Dokumentknoten. Die Kette endet an der Instanz; ein Doppelklick springt nicht in die Komponente (das bleibt M7). Esc wählt den Elternknoten, an der Wurzel hebt er die Auswahl auf. Ist ein Einfügewerkzeug aktiv, bricht das erste Esc das Werkzeug ab, bevor es zum Elternknoten geht. V ist das Auswahlwerkzeug. Der Hover-Umriss ist das Klickziel, mit Strg/Cmd das tiefste Ziel.
- 2026-09-25: Ziehen auf einem Knoten sortiert um (`move`). Ziehen auf leerer Bühne oder auf der Wurzel schwenkt wie bisher. F/T/I bleiben aktiv, bis Esc oder V. Ein Klick in den ausgewählten Frame hängt ans Ende an; ein Ziehen zeigt die Einfügelinie und fügt an diesem Index ein. Die Linie folgt der Hauptrichtung des Eltern-Frames (Zeile oder Spalte), nicht den umbrochenen Zeilen. Liegt der Zeiger in der Mitte eines Frames, fällt das Element hinein; am Rand daneben. Leere Frames gelten immer als innen. Die Asset-Liste ist ziehbar, wenn die Verschachtelung die Art erlaubt. Eine Place-Liste zeigt erlaubte Assets aus anderen Arbeitsbereichen, ohne das offene Dokument (keine Instanz seiner selbst über die Liste).
- 2026-09-25: `wrap` ist ein eigener Befehl, damit „In Frame einpacken“ (Strg/Cmd+Alt+G) ein Undo-Schritt ist. Der neue Frame heißt `Frame` und übernimmt den Index des Knotens. Ein `setProp`/`insert`, das eine Token-Referenz einführt, ergänzt `tokenInterface.reads`, sonst scheitert die Layout-Änderung an der bestehenden Pflicht.
- 2026-09-25: Gap, Padding und Margin wählen nur Dimensions-Tokens. Feste Größe ist px, ein Dimensions-Token oder Prozent. Breakpoint-Overrides schreiben `layout.breakpoints`. Die Basis bleibt ohne Query. Pfeiltasten ändern nur `x`/`y` der Basis, und nur wenn `position` dort `absolute` ist (Shift 10px). Fehlen `x`/`y`, ist der Start der `offset` im ersten Frame, damit das Element nicht auf 0 springt. Absolute nur in einem Breakpoint schiebt die Tastatur nicht; das steht im Panel.
- 2026-09-25: Leere Frames (keine Kinder, kein Text) bekommen im Editor `data-empty`. Das Mindestmaß 64px und der gestrichelte Rahmen stehen im iframe-Shell-Stylesheet, nicht in der Style-Engine und nicht im JSON. Der Button bleibt ohne Markierung, weil seine Beschriftung Text am Frame ist.
- 2026-09-25: Die Einfügelinie liegt im Bühnen-Overlay und wird mit der Bühne skaliert. Ihre kurze Seite ist mindestens vier Bildschirmpixel, sonst ist sie beim Fit über drei Viewports nicht zu sehen.
- 2026-09-25: M7. Felder und Varianten-Achsen bleiben an Atom und Komponente. `defineField` und `defineVariant` lehnen Sektion und Page ab. `removeField` entfernt Bindings, die das Feld nennen, damit das Dokument in einem Befehl gültig bleibt. `removeVariant`, und `defineVariant` wenn ein Wert wegfällt, streichen die passenden Lagen im Stil-Block (Wurzel und Kinder). `setStyle` und `setStyleBlock` tragen neue Token-Pfade in `tokenInterface.reads` ein, wie das Layout.
- 2026-09-25: Der Editor legt Felder der Typen `text`, `image`, `link`, `boolean`, `enum`, `number` und `token` an. `richText` bleibt im Schema und wird nicht angeboten. Bindings nutzen die bestehenden Ziele, auch `src` und `alt`, damit ein Bild ohne zweites Modell an ein Feld kommt. Sichtbarkeit ist `visible` (versteckt, wenn der Wert `false` ist).
- 2026-09-25: Varianten-Achsen schreiben `styles.variants` und, am ausgewählten Kind, `styles.children`. Jeder Wert setzt Deklarationen und die Zustände `hover`, `focus-visible` und `disabled`. Dieselben Zustände gibt es an der Basis des Stil-Blocks. Instanzen bleiben bei `setField` und `setVariant`; es gibt kein Detach. Ein Doppelklick, der nicht tiefer als die bereits gewählte Instanz kommt, öffnet die Komponente und wählt ihre Wurzel. Ein Doppelklick in der Ebenenliste öffnet sie direkt.
- 2026-09-25: Einfügen, Platzieren und Ziehen fragen die Verschachtelungsregeln, bevor eine Einfügelinie erscheint. Eine Page nimmt keine Frames, Texte oder Bilder an und keine Instanz, die keine Sektion ist. Die Werkzeuge F, T und I sind dort aus. Ein verbotenes Ziel setzt eine Meldung, der Befehl läuft nicht.
- 2026-09-25: Die Projektvorlage bleibt die Design-Datei. Daneben starten `button` und `link` als Atoms sowie `input` und `textarea` als Form-Komponenten (`starterAtomIds` und `starterFormIds`). `link` bindet Beschriftung und `href` und hat die Achse `tone`. `textarea` folgt `input`, mit dem Feld `rows` und der Achse `resize` am Control.
- 2026-09-25: M8. `packages/codegen-react` liest die verschachtelten Dokumente und schreibt pro Dokument eine React-Komponente. Props sind die Felder und die Varianten-Achsen. Eine Achse wird eine String-Literal-Union. Die Wurzel setzt `data-component` und `data-variant-*`, Kinder setzen `data-node`. Eine Instanz wird der Aufruf der erzeugten Komponente mit den Feld- und Variantenwerten aus dem Dokument. `nodeId` ist die Instanz-Id und landet auf `data-node`, damit `[data-component="…"] [data-node="…"]` dasselbe Element trifft wie der Renderer. Jede Komponente nimmt zusätzlich `className` und mischt es mit dem Klassen-Attribut aus dem Dokument. Ein boolesches Feld an einem booleschen Attribut wird ein React-Boolean (`hidden={open}`), nicht der HTML-String, den der DOM-Renderer schreibt.
- 2026-09-25: CSS bleibt am bestehenden Compiler. Tokens and fonts kommen aus `renderDesignCss`. Stil-Blöcke und Layout kommen aus `compileDocument` mit `address: 'instance'` und werden als ein Stylesheet serialisiert, inklusive `@media (min-width)`. Breakpoints stammen aus dem Design-Dokument, sonst aus den Standardwerten. Es gibt kein zweites Stilmodell.
- 2026-09-25: Eine Page wird in der Ausgabe als echtes Wurzel-Element erzeugt. Im Editor bleibt das Wurzel-Frame der Page die unbemalte Arbeitsfläche. Next.js hat kein Artboard-iframe, also braucht die Page ein Element, an dem `data-component` und das Layout hängen.
- 2026-09-25: `richText` bleibt ein String-Kind, wie der Renderer. Kein HTML. Ein Default, dessen Laufzeittyp nicht zum Feldtyp passt, bricht die Generierung ab, damit die erzeugte Datei typisiert bleibt. Felder ohne Bindung stehen in den Props, werden im Funktionsrumpf aber nicht gelesen.
- 2026-09-26: Codegen-Ausgabe ist ein Monorepo-Schnitt im Haupt-Repo: `packages/ui` plus generierte Stories unter `apps/storybook`. Kein flaches `examples/next/generated` mehr. `@facadeur/codegen-react` CLI: `--out packages/ui`, optional `--storybook apps/storybook`. Der Editor liegt unter `apps/editor`.
- 2026-09-25: Die Ausgabe lag unter `examples/next/generated` und war eingecheckt. `pnpm codegen` schrieb sie aus den Beispieldokumenten; die Projektvorlage war das Design. (Ersetzt durch Monorepo-Ausgabe oben.)
- 2026-09-25: Die linke Spalte ist ein Projektbaum, kein Arbeitsbereich-Umschalter. Oben der Baum: Design (Tokens, Schriften), dann Atoms, Components, Sections und Pages mit den Assets darunter. Unten bleibt die Ebenenliste des offenen Dokuments. Ein Klick auf ein Asset öffnet es auf der Bühne. Tokens and fonts öffnen den bestehenden Bereich im rechten Panel. Suche filtert den ganzen Baum. „Neu anlegen“ legt pro Art ein leeres Frame-Dokument an und öffnet es. Ziehen einer Baumzeile auf die Bühne erzeugt eine Instanz, wenn die Verschachtelung das erlaubt. Ein Doppelklick auf eine Instanz öffnet den Master wie bisher; der Baum klappt die Art auf und rückt die Zeile ins Blickfeld.
- 2026-09-25: Ein ausgewählter Knoten wird in jedem Viewport-Frame umrandet. Farbe A (Akzent) ist der Frame, in den zuletzt geklickt wurde. Farbe B ist derselbe Knoten in den anderen Frames. Höchstens ein Fokus-Viewport. Ein Klick in einen Frame setzt diesen Fokus und färbt sein Label; die Ebenenliste ändert ihn nicht. Vor dem ersten Klick ist kein Frame primär. Griffe gibt es nur am primären Umriss.
- 2026-09-25: Die Basis ist der Breakpoint mit der kleinsten `minWidth` (mobil, Standard 375) und bleibt ohne Media Query. Der Inspector bleibt auf Basis, bis auf den Override des Fokus-Viewports umgeschaltet wird. Ein Klick auf einen Frame wechselt das Ziel nicht von selbst. Der Basis-Frame hat keinen Override. Im Override-Modus schreibt der Editor nur diesen Breakpoint: Stil-Deklarationen und Zustände nach `styles` bzw. `styles.children` → `breakpoints` (das bestehende `@media (min-width)`), Layout nach `layout.breakpoints`, Tokens nach `$extensions.facadeur.breakpoints`. Andere Breakpoints und die Basis bleiben unangetastet. `node.style` bleibt die Basis-Überschreibung ohne Query und liegt unter den Breakpoint-Regeln. Eine Eigenschaft mit Override am fokussierten Viewport zeigt „Override bei 768“ (die `minWidth` des Fokus-Frames) und lässt sich einzeln zurücksetzen. Varianten bleiben an der Basis, weil Breakpoints dort nicht geschachtelt sind. Schriften haben keine Viewport-Werte; Größen laufen über Typografie-Tokens.
- 2026-09-30: `displayOn` ist ein strikt disjunktiver Contract: genau eine Bedingung aus `equals` oder `truthy`, nie beide und nie keine. Das Schema, der Editor, Renderer und Codegen verwenden dieselbe Unterscheidung; dadurch gibt es keine implizite „immer sichtbar“-Fallback-Bedeutung bei unvollständigen Bedingungen.
- 2026-09-30: Node-Layout-Overrides bleiben sparse auf der Layout-Ebene: einzelne Breakpoint-Layer werden mit dem bestehenden Layer gemerged, statt die gesamte Breakpoint-Map zu ersetzen. `width` und `height` sind dabei atomare Axis-Werte; ein Override von `mode` trägt nicht versehentlich die alte `size` mit.
- 2026-09-30: DSL-Namen dürfen Bindestriche enthalten, generierter JavaScript-Code aber nicht. Der React-Codegen sanitisiert deshalb Repeater-Aliase zu lokalen Identifiern und verwendet optionale Bracket-Notation für nicht identifierfähige Pfadsegmente; der Datenpfad selbst bleibt unverändert.
- 2026-09-30: Benannte Variant-Style-Edits verwenden jetzt den kanonischen sparsamen Block `overrides.styles`. Der Editor migriert die Legacy-Layer `styles.variants.variant.<preset>` atomar für das bearbeitete Preset und lässt andere Style-Achsen unangetastet.
- 2026-09-30: `deriveVariantPreset` leitet nun auch sparse Style-Overrides aus einem aufgelösten Variant-Dokument ab — inklusive States, Style-Achsen, Breakpoints und Child-Regeln. Direkte Styles migrieren dabei ebenfalls die alte Named-Layer-Struktur.
- 2026-09-30: Data-Directive-Controls bieten Gleichheitsbedingungen nur für skalare Felder an und erlauben als Repeater-Key nur skalare Item-Pfade. Objekt-/Array-Felder bleiben für Truthy-Bedingungen und den Repeater-Scope verfügbar.
- 2026-10-03: Codegen wird zu einem Paket mit gemeinsamem `generate()`-Einstieg und austauschbaren Engines (`engines/react` zunächst als Default) konsolidiert. Die React-Ausgabe erhält ihre eigene Markup-/CSS-Übersetzung; die Style-Engine soll keine React- oder DOM-Marker als gemeinsames Modell voraussetzen. Zuerst wird geprüft, ob ein symbolisches Zielmodell für Knoten, gebundene authored selectors, Zustände, Varianten und Breakpoints die bestehenden Konsumenten trägt. Editor-DOM-Vorschau und Codegen übersetzen dieses Modell jeweils in ihre eigenen Selektoren/Marker. Verträge: Ausgabeformat und CLI-Verhalten, CSS-Kaskade/Overrides, Token- und Layout-Semantik, CSS-Module-Klassenzuordnung, DOM-Preview-Adressierung; TypeScript-Imports bleiben extensionlos. Validierung: bestehende Codegen-Snapshots/Fixtures und Style-Engine-Tests, Paket-Typechecks, `pnpm codegen`-Diff sowie Codegen-Ausgabe-Integration.
