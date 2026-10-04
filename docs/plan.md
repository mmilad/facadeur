# facadeur – Plan

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

- [ ] Move Schema Library-specific presentation rules from `ui/styles/design.css` to a colocated CSS Module. Keep shared schema-stage scaffolding, form controls, and app-wide layout global; preserve rendered behavior and accessibility semantics. Focused tests, lint, formatting, and the Next.js production build pass; browser verification is pending because the Windows CUA setup fails (tracked in `docs/friction.md`).

Evidence: `design.css` mixes design-domain, schema, preview, and library styles; the schema library rules are exclusive to `SchemaLibraryStage`. A colocated module makes this UI's styles discoverable and locally scoped without changing the shared stylesheet contract.

### Shared schema composition

- [ ] Add `Extend by` (`allOf`, one or more schema references) and `Extend by one of` (`oneOf`, one or more references) as repeatable rows with an add button and schema picker in the Shared Schemas editor.
- [ ] Resolve referenced schemas dynamically; validate the edited schema and all dependents when any referenced schema changes.
- [ ] Reject missing references, cycles, and unsatisfiable/invalid composed contracts with actionable errors. Keep additional-property policy local to the composed schema rather than inheriting it from references.
- [ ] Preserve schema IDs, assignments, stored formats, and existing validation behavior. Verify with focused domain/UI tests, editor typecheck/lint, and browser interaction.

Evidence: `SchemaLibraryStage` currently authors raw JSON Schema branches, while `schema-library` stores each named schema independently and has no dependency resolution or dependent validation. Keep schema resolution and graph validation in the schema domain; keep composition controls in the Shared Schemas UI. `SchemaLibraryStage` remains one cohesive authoring panel despite crossing the size-review threshold: schema editing, composition rows, validation messages, and JSON preview share one selection/write lifecycle; extracting the rows would add navigation without a separate owner.

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
- Editor UI: Next.js App Router + React. The canvas content is rendered by our DOM renderer in viewport iframes, not by React.
- Code generation produces React components and CSS Modules; `examples/next` demonstrates the output in a Next.js app.
- Validation: TypeBox schema in `core`, JSON Schema export, and Ajv validation.
- Local operation: `apps/server` holds the authoritative Yjs project state and synchronizes open editors. JSON files under `examples/` remain the explicit source/export format; Save writes confirmed changes there.
- Document state: **Yjs** (CRDT), commands, and `Y.UndoManager`; the local project server persists shared history.

### Packages

- `packages/core` – types, schema, validation, commands, and the `DocumentStore` interface.
- `packages/store-yjs` – Yjs implementation of `DocumentStore` and conversion between the file format and Y document.
- `packages/tokens` – DTCG parser, reference resolution, and CSS custom property output.
- `packages/style-engine` – shared style compilation and live application through `CSSStyleRule`/`insertRule`; its controller is inspired by `style-controller` without importing it at runtime.
- `packages/renderer-dom` – JSON-to-DOM rendering, stable `data-id` per node, and targeted updates.
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

- Format: W3C DTCG (`$value`, `$type`). An entry is either a token or a token group. References look like `{color.blue.500}`.
- Three levels: primitive, semantic, and component tokens.
- In the editor, tokens become CSS custom properties on a root rule.
- Components can read tokens and override them for nested children through CSS variable cascading. The schema declares which tokens a component reads and sets.
- Themes/modes (dark mode, brands): **not now**; planned as a later improvement.

### Fonts

- Dedicated area for font families, weights, sources (file or Google Fonts), and fallbacks.
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

- **Flat in-memory model:** nodes are stored in a map by stable ID; children are ordered ID lists (`Y.Map` per node, `Y.Array` for children). Tokens, fonts, and settings are also maps in the Y document.
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

### Collaboration

- [ ] Presence: other users' cursors and selections through Yjs Awareness
- [ ] Accounts, projects, and permissions (Next.js)

### Later

- [ ] MCP integration (planned for later; scope to be defined)
- [ ] Themes/modes, slots, additional generators (Web Components, Angular)
- [ ] Visual regression (Playwright), accessibility checks
