---
name: facadeur-refactor
description: Review or implement responsibility-based refactors in the Facadeur monorepo, using its candidate detector, ownership rules, and TypeScript conventions. Use for structural reviews, reducing coupling, deduplication, or justified file/domain splits. Reviews remain read-only unless implementation is requested.
metadata:
  short-description: Responsibility-based Facadeur refactoring
---

# Facadeur refactoring

Improve ownership and make dependencies explicit while preserving behavior and public contracts.
Resolve repository paths from the current checkout. Current user instructions and
[`AGENTS.md`](../../../AGENTS.md) take precedence over historical plans.

## Workflow

1. Establish scope and mode. Review requests authorize inspection and recommendations, not
   edits. Inspect current files and staging; preserve changes made since earlier turns.
2. Read [`docs/refactoring-checklist.md`](../../../docs/refactoring-checklist.md) and
   [`docs/refactoring-guidelines.md`](../../../docs/refactoring-guidelines.md). Run
   `node scripts/refactor-candidates.mjs <affected paths>` before extending source.
3. Identify the responsibility, owner, consumers, public entry points, and dependency direction.
   For implementation, record the evidence, boundary, preserved contracts, and validation in
   `docs/plan.md` before editing. Record unrelated candidates in its backlog; a read-only review
   reports findings in chat without modifying the plan.
4. Move code mechanically first. Update consumers and remove superseded implementations once
   the migration is complete. Temporary copies are acceptable during migration, not competing
   long-term implementations. Keep supported public exports unless their change is authorized.
5. Validate in proportion to the change and the user's current request. Normally use focused
   behavioral checks and relevant typecheck/lint/build checks. Honor a request to defer tests
   for that task; do not turn it into a permanent no-tests policy. Repeat the detector on
   affected existing paths, inspect imports/contracts, and state what was and was not checked.

## Responsibilities and naming

- Start with ownership, not file size. Keep cohesive parsers and algorithms together. Group
  related modules when they form a real subdomain: style-block parsing, editing, and contracts
  belong in `style/blocks/`, with `parse.ts`, `edit.ts`, and `contract.ts`.
- Let directories supply the domain name: `project/controller.ts`, not
  `project/project-controller.ts`. Name a file after its actual role; a store backed by a
  controller is still a store. Do not introduce controller classes for stateless algorithms.
- A small command domain may use `commands.ts`; a larger one may use `commands/`. Give each
  command directory an `index.ts` with explicit named exports so outside consumers have one
  entry point. Within the domain, import implementations directly to avoid barrel cycles.
  Use other barrels only for meaningful boundaries; do not export private helpers by default.
- Keep types and helpers near their owner (`types.ts`, a focused helper module, or `utils.ts`
  for small genuinely shared domain primitives). Do not create generic utility packages or
  one-file directories just to reduce size or imports.

## Type contracts and coupling

- Apply the return-type rule in AGENTS.md: infer simple getters, forwarding functions, and
  internal helpers; retain explicit types for intentional API boundaries, readonly views,
  predicates/assertions, overloads, recursion, or deliberate widening. Remove imports made
  unused by annotation cleanup. Do not replace annotations with casts.
- Put a fixed integration contract at its owning interface. If a context's `updateDocument`
  returns `DocumentController`, declare it there with `import type` and let callers infer it.
  Do not propagate `Result` through controllers merely to conceal that concrete relationship.
  Introduce generics only when actual consumers require meaningful variation.
- A type-only import is not a runtime dependency. Distinguish useful domain contracts from
  accidental coupling; fewer imports alone do not prove better architecture. Preserve return
  values and public type shapes rather than switching to `void` just to remove an import.
- When reviewing stateful controllers, check who owns mutations, whether returned objects
  expose live mutable state, how events behave after commit, and how removal affects cached
  views/history. TypeScript `readonly` alone does not isolate referenced mutable objects.
  Report behavioral defects separately; implement them only within the authorized scope.

## Package ownership

- `core`: portable document/DSL contracts, invariants, project/controller state and store views
- `tokens`: token evaluation and output
- `style-engine`: stylesheet compilation and runtime application
- `renderer-dom`: DOM rendering
- `store-yjs`: retained Yjs encoding/persistence adapter; not the owner of Core project state
- `codegen/engines/react`: React output
- `apps/editor`: editor selection, controls, sessions, and interaction state

ProjectController owns project coordination; domain controllers receive focused contexts.
Keep Core independent of adapters. Cross-package consumers use the owning package's public
API. Treat the existing architecture as context, not a reason to introduce new frameworks,
metadata features, or dependencies during a structural refactor.
