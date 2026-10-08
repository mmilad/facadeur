# facadeur – Plan

### Node model refactor (dom / style / schema / data / config)

- [ ] Major reshape: replace `nestedNodeSchema` special cases with a uniform node (`dom`, `style`, `schema`, `data`, `config`). See [node-model-refactor.md](./node-model-refactor.md). **Phase 1:** legacy examples removed, v2 TypeBox in `packages/core/src/schema/node-model/`, starter project = design + empty section only, vitest narrowed. **Next:** API catalog seed, restore full test include, sidebar on v2. References: [example-framework](https://github.com/mmilad/example-framework), [style-controller](https://github.com/mmilad/style-controller).

### `@facadeur/domain` + `CoreController`

- [x] **`packages/domain`** — shared types/interfaces only (no runtime logic).
- [x] **`packages/core/src/controller/{core,catalog,preview,node,element,config,schema,node-style}/`** + **`CoreController`**; preview → **`ElementBuildConfig`**; **`buildElement`** in renderer-dom (no tag-specific DOM hacks).
- [x] Wire editor **`AppService`** → **`CoreController`**; **`CatalogPort`** in API adapter; drop duplicate editor catalog helpers.
- [ ] Expand core commands/selection; editor keeps UI-only concerns (select chrome, insert/delete UX).

### Deprecation inventory (safe to delete after Core wiring)

Symbols are marked `@deprecated` in source; remove bottom-up once nothing imports them.

| Area | Deprecated surface | Replacement |
| --- | --- | --- |
| `@facadeur/core` | `ProjectController`, `validateCatalog`, `validateTree`, `validateDocumentFile`, `compileDocumentValidator`, `documentFileSchema` | `CoreController`, `validateProjectCatalog`, node-model catalog |
| `@facadeur/core` | `mergePreviewData` export alias | `mergePreviewFields` |
| `@facadeur/renderer-dom` | `renderV2DefinitionRoot` | `renderDefinitionRoot` + `buildElement` |
| Editor | `domain/catalog/v2-catalog.ts`, `domain/viewport/v2-board.ts` | `@facadeur/core` catalog + preview |
| Editor | Session `v2OpenDefinition`, `selectedV2NodeUuid`, `patchV2NodeField`, `saveProjectCatalog` | `CoreController` snapshot + commands |
| Editor | `AppService`, `AppServiceHost`, `app-service/controllers/*` | `CoreController` + thin React hooks |

### Core package layout (2026-03)

- **Product:** `packages/core/src/controller/project/` — `CoreController`, nested `catalog/`, `node/*`.
- **Legacy flat docs:** `packages/core/src/legacy/flat/` — import `@facadeur/core/legacy`.
- **Removed top-level** `controller/catalog`, `controller/core`, duplicate `controller/variants` / `src/store` (use legacy paths).

### Deprecate explicit public-contract aliases

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
Unrelated candidate: structural-nodes.ts remains 572 lines and is unchanged by this task;
review its repeater/switch validation boundaries separately, preserving structural contracts
and using the existing structural-node regression suite before any later split.

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

- [ ] Extract the schema-library editor's private composition/root-kind transformations and
      SchemaEditorPanel from `ui/stage/SchemaLibraryStage.tsx` (534 lines). Evidence: stage selection
      and library CRUD coexist with independent JsonJoy editor state, composition controls and pure
      schema transformations. Boundary: colocate the editor and transformation helpers in an
      editor-owned schema-library feature directory; keep stage/session command wiring together.
      Preserve catalog validation, rename/delete references, composition semantics, defaults and
      Undo. Validate schema-composition, schema-library, schema-use UI tests and editor types.
      Completion: stage orchestration no longer owns the editor's private transformation lifecycle.
- [ ] Review extracting private schema compatibility helpers from Core validation's
      `data-contracts.ts` (598 lines). Evidence: tree/scope traversal, event schema-path resolution,
      field shape compatibility and display-condition assertions coexist. Keep the validation pass
      and scope ownership together; only extract independently tested shape semantics into
      private validation modules if that avoids cycles with structural schema derivation.
      Preserve public Core exports, required/default rules and composed schema/event contracts.
      Validate contracts, schema-use, structural-node and event/generator tests. Completion: shape
      compatibility can be tested without tree traversal, with no new cross-package helper API.

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

- [ ] Review extracting token-reference queries from `apps/editor/src/domain/editing.ts` into a domain-owned token-reference module. Evidence: the 524-line file combines token catalog queries, insertion/drop geometry and node placement rules; this feature only changes its placement capabilities. Preserve existing token ordering/reference syntax and editing exports, then validate token-control and editing tests plus typecheck. Completion criterion: separate actual token-query ownership without moving geometry or creating a generic utility package. Deferred because this extraction is independent of structural elements.
- Retained candidates: session assembly remains cohesive lifecycle wiring; the existing layout panel and CSS declaration editor are coherent interaction surfaces and do not need a size-only split for this task. The flat `domain/` directory mixes these domains, but existing subdirectories already own session, selection, schemas and edits; reorganize only with a concrete cross-domain ownership need.

## Standalone generated workspace (2026-10-06)

- [x] Extract React workspace scaffolding before changing CLI output.
  - Evidence: generated UI/Storybook/Next manifests belong to the source workspace and runtime tests resolve React through Storybook. Bootstrap configuration changes independently of component rendering. The detector found no size candidates; existing React engine modules remain cohesive.
  - Boundary: private `engines/react/src/workspace/` owns templates and workspace assembly; CLI owns validation/writing, component generation stays unchanged. Move maintained demo configuration into templates and remove internal generated packages.
  - Contracts: preserve React exports, schemas, styles, stories and legacy `--out`/`--storybook`; add `--workspace` with optional Next sample. Preserve staging and document data.
  - Validation: workspace CLI regeneration/preservation tests, React runtime tests, source typecheck, standalone install/typecheck/Storybook build, detector rerun.

Result: `pnpm codegen` writes an independent ignored `dist/facadeur` pnpm workspace. Bootstrap templates own UI/Storybook configuration and the optional Next demo; internal generated packages and their lockfile importers are removed. Runtime tests resolve React through codegen itself. Legacy component-only CLI modes remain supported. Independent install, source and generated workspace typechecks, Storybook production build, 77 generator/preview tests, scoped ESLint and formatting pass. The detector still reports only the cohesive 12-module React engine directory. Prior output was backed up under `.facadeur/output-migration-2026-10-06`; staging was preserved.

Event implementation scope: extract reusable schema selection before extending event editing; Core owns canonical legacy/data schema resolution, binding validation and persistence, the editor owns reusable controls and command routing, React codegen owns DOM event envelopes and native form defaults. Source event definitions stay serializable, callbacks derive from declarations, explicit forwarding and Undo remain intact. Review the canonical Core API across workers before integration; migrate only the existing FormInput event example and regenerate output. Validation will include focused Core/adapter/editor/generator tests, schema export, source/generated typechecks, standalone build and a browser interaction check.

React event ownership review: `component/catalog.ts` currently builds flat event callback types; `render/event-attributes.ts` owns native extraction; `print.ts` and `data-contracts.ts` own emitted contracts; `render-instance.ts` owns forwarding. Retain these cohesive boundaries and share Core schema/mapping resolution, preserving the native event envelope, typed data and explicit forwarding. No generic runtime library or unrelated split is needed.

## Native event authoring repair (2026-10-06)

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

## Unified event authoring (2026-10-06)

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

## Schema and Fonts accordion consistency (2026-10-06)

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

## Legacy UI, document naming and utility classes (2026-10-06)

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

## Native form atoms and project grouping (2026-10-06)

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

## Root selection when opening project assets (2026-10-06)

Project-tree navigation currently opens documents without a layer selection, leaving the
inspector empty. Reuse the session's existing root-focus option for both shell navigation
surfaces. Keep document/drill navigation and explicit layer selection contracts unchanged;
this is a shell navigation behavior fix and needs no structural split. Validate project-row
clicks across asset kinds, selection resets and existing URL navigation regressions.

Completed: both project-tree entry points open assets with root focus, including clicking an
already open asset. 12 navigation tests, editor TypeScript and affected-source ESLint passed.
Updated the stale legacy-panel assertion to match the previously requested hidden UI.
The repeated scoped detector has no candidates; existing session orchestration remains untouched.

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
