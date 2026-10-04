# Core controller ownership

`ProjectController` owns the document collection, shared schema/token context, and
command executor. `DocumentController` is a live read-only view of one document.
`project.styles` is the shared `StyleController` for global design values and explicit
document style scopes. It delegates every write to the project executor.
Project-level concerns such as organization or project metadata belong to the
project owner; they should not be threaded into individual domain algorithms.

| Domain        | Responsibility                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `project/`    | Aggregate state, document identity, current command context, executor integration                     |
| `document/`   | Document views and commands for nodes, fields, events, and schema assignment                          |
| `style/`      | Shared style facade, document styles, global/component tokens, references, fonts, breakpoints, layout |
| `variants/`   | Variant editing, sparse override derivation/resolution, preview data                                  |
| `validation/` | Document/catalog invariants and resolution of shared/public field contracts                           |

Mutation flows through `ProjectController.updateDocument()` into the injected
executor (pure `applyCommand` by default). Command dispatch delegates to domain
operations and validates the result before the project replaces its manifest.
Adapters may continue to call the public pure command API to own transactions.
Core does not acquire persistence, rendering, or editor dependencies.

The editor session uses pure command application with token-resolvability validation
from the owning tokens package. ProjectController owns live
state and publishes typed changes after commit. `core/src/store/controller-store.ts`
provides renderer views over that state and keeps only Undo/Redo snapshots. Every view
reads through `project.document(id)`; there is no mirrored Yjs document or refresh bridge.
`replaceDocument()` accepts loaded data or history snapshots; `replaceDocuments()` accepts
a complete catalog. Retained views and style scopes stay live. `session.project` exposes
the Core API; ordinary UI commands retain session guards and active-variant transformation.
Future persistence/sync adapters can use the existing executor and subscription boundaries.

Command contexts are detached snapshots, including their document/schema/token inputs;
adapters cannot mutate project state through them. Token getters also return detached data.
Changes are delivered independently with one payload copy per listener. Listener failures
are logged and do not turn a committed operation into a failed command or block other listeners.
Catalog replacement emits `remove` for deleted IDs; stores clear their history before
forwarding that event. Undo/Redo replacement cannot recreate a missing document. A retained
view reads successfully again if the same ID is explicitly loaded later.

The style context declares DocumentController as the result of a successful write through a
type-only import. Style methods infer that result from the context; no result generic is
propagated through the project or style classes.

Domain operations remain functions with explicit inputs. A domain folder does not
require a stateless wrapper class. Shared domain contracts live in `types.ts`;
private helpers stay with their consumer (command-context assembly is a private
ProjectController method). `style/controller.ts` owns the shared editing facade;
`style/document.ts` provides cached document scopes with live snapshot reads.
`style/commands.ts` applies style and token commands to the executor's working document.
Reused parsing, contracts, selectors, and layout algorithms remain independent of
command coordination. See the [style file map](style/README.md) for the complete layout.
`src/index.ts` preserves the public API.

## Naming and entry points

- The directory supplies the domain name: `project/controller.ts`,
  `document/controller.ts`, `style/blocks/parse.ts`, `style/tokens/global/read.ts`.
- Controllers use `controller.ts`; shared domain contracts use `types.ts`.
- A small command domain uses `commands.ts` (`style`, `variants`, `style/tokens/component`).
  A command domain with multiple modules uses `commands/index.ts` (`document`).
- Live controllers use `controller.ts`; pure command dispatch stays in `commands.ts`.
- Command entry points explicitly list named exports; do not use `export *`.
  Callers outside a command domain import its entry point. Private helpers are
  not exported, and modules within that domain use direct imports to avoid cycles.
- Other internal imports point at the owning implementation, never the Core
  package barrel. Avoid repeating the domain name in filenames.

`src/document/` retains the flat model, flat/nested serialization, tree operations, identifiers,
kinds, child-field helpers, and document errors. Shared schemas and derived types live in
`src/schema/`; reusable JSON primitives live in `src/utils.ts`.
The store interface lives in `src/store/types.ts`. Serialization reuses pure domain
normalizers; it must not depend on the stateful project/document controllers.
