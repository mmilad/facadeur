# Refactoring guidelines

This document gives practical decision rules for structural refactors in Facadeur. It
complements [`refactoring-checklist.md`](refactoring-checklist.md), which defines detector
thresholds, ownership, and required plan fields.

## What a good refactor changes

A good refactor makes one responsibility easier to locate, test, or change while preserving the
observable contract. It may change private module boundaries, but must not silently change public
imports, serialized data, command semantics, dependency direction, or runtime behavior.

Line count is evidence, not a target. A cohesive parser may be safer to keep than a shorter
component that owns rendering, persistence, and selection. Conversely, a short module with
independent workflows may need splitting.

## Decision sequence

Before editing, answer:

- What behavior is changing, and who owns it today?
- Which code is pure and which touches DOM, stores, files, network, or timers?
- Which callers rely on the current export, identity, ordering, error, or transaction behavior?
- Which package owns the vocabulary and invariants?
- Would the proposed import graph remain acyclic?

Classify the pressure before choosing a boundary:

| Pressure | Boundary to consider | Do not do |
| --- | --- | --- |
| Pure calculation mixed with effects | Pure domain module with explicit inputs/outputs | Pass a global store or DOM into every helper |
| Independent state transition or subscription | Focused hook/controller next to its feature | Extract each callback into a utility |
| Repeated behavior with identical semantics | One owner at the common package/domain layer | Merge merely similar markup or names |
| Repeated cases with the same contract | Typed configuration/dispatch table | Replace meaningful branching with a generic registry |
| Cohesive UI plus private helpers | Feature directory | Create `utils/`, `services/`, or `helpers/` dumping grounds |
| Cross-package contract | Owning package public entry point | Deep-import another package's implementation |

Choose **keep** when the code is cohesive and extraction adds indirection or cycles; **extract**
when responsibilities have separate reasons to change or one part can be independently tested;
**reorganize** when related modules already form a domain but are mixed in a flat folder.

## Safe extraction patterns

Pure modules use explicit values and return values. Keep validation and normalization beside the
domain defining their invariants. Controllers/hooks own a coherent interaction lifecycle such as
subscriptions, selection, keyboard handling, or command dispatch; keep DOM painting in the
renderer and preserve cleanup, event ordering, and transaction origins. Extract child components
only for coherent interaction surfaces whose state changes independently. Use dispatch tables
only when every case has the same input/output contract.

## Contracts to check

Check the relevant categories before and after moving code:

- public imports and package exports
- document/DSL shape, sparse overrides, variants, states, and responsive behavior
- token/raw-value semantics and reference validation
- command ownership, Undo/Redo boundaries, transaction origins, and event ordering
- DOM identity, focus, selection, cleanup, and cross-realm checks
- codegen output, generated identifiers, and serialization ordering
- runtime dependency direction and absence of import cycles

An intentional contract change is a feature or migration decision, not a mechanical refactor.

## Plan-entry template

Use a concrete entry in `docs/plan.md`:

```text
- [ ] Refactor: <boundary>
  - Evidence: <file> mixes <responsibilities> / duplicates <behavior>.
  - Action: move <specific symbols> to <owner>; keep <cohesive part> together.
  - Scope: prerequisite for <current task> | backlog.
  - Contracts: preserve <imports/data/undo/DOM/codegen/etc.>.
  - Validation: <focused tests>, detector rerun, and <typecheck/lint/build/browser check>.
```

Do not turn every detector result into a mandatory rewrite. Backlog items need a completion
criterion and should be deduplicated against existing planning entries.

## Completion gate

1. Run the candidate detector again on all changed paths.
2. Run focused behavior tests, then relevant package checks.
3. Inspect the diff for accidental public API, data-model, dependency, or persistence changes.
4. Verify moved files remain present while the editor/build can compile.
5. State what moved, what stayed cohesive, checks run, and any remaining signal with its reason.
