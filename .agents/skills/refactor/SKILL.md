---
name: facadeur-refactor
description: Plan and implement responsibility-based refactors in the Facadeur monorepo, using the repository's candidate detector and refactoring rules. Use when a change adds responsibility to an existing module, duplicates behavior, or needs a justified file or domain split.
metadata:
  short-description: Safe, responsibility-based Facadeur refactoring
---

# Facadeur refactoring

Use this skill for structural refactoring in `D:\newProjects\facadeur`. The goal is a clearer
ownership boundary with unchanged behavior and public contracts—not a lower line count.

## Required workflow

1. Read `docs/refactoring-checklist.md` and `docs/refactoring-guidelines.md` before planning.
2. Run `node scripts/refactor-candidates.mjs <affected files or directories>` before extending
   source. If the affected paths are not known yet, run it without arguments.
3. Identify the changing responsibility, current owner, consumers, public entry points, and
   dependency direction. Record an in-scope refactor in `docs/plan.md` before its dependent
   feature; record unrelated candidates in the backlog only.
4. Choose the smallest meaningful boundary. Keep cohesive parsers, schemas, algorithms, and
   orchestrators together when extraction would add indirection or cycles.
5. Move code mechanically first, preserving behavior, imports, exports, data formats, and
   dependency direction. Then make the requested behavior change.
6. Validate with focused tests and relevant typecheck/lint/build checks. Repeat the detector on
   affected paths and explain any remaining candidate or why the file stays cohesive.

## Split decision

Split only for a concrete signal: independent reasons to change, pure domain logic hidden in
UI/effects, duplicated behavior with identical semantics, repeated case branching with a stable
contract, or unrelated state/workflows in one owner. Prefer feature/domain directories and
private helpers next to their consumer. Share only after actual reuse; put cross-package
contracts behind the owning package's public API. Do not create generic utility packages,
speculative registries, or one-file folders.

## Facadeur ownership

- `core`: portable document/DSL contracts and invariants
- `tokens`: token evaluation and output
- `style-engine`: stylesheet compilation
- `renderer-dom`: DOM rendering
- `store-yjs`: Yjs encoding and persistence adapter
- `codegen-react`: React output
- `apps/editor`: editor selection, controls, and interaction state

Core must remain independent of adapters. Inside a package, prefer direct internal imports; use
barrels only for meaningful public boundaries.

For detailed heuristics, extraction patterns, contract checks, and plan-entry examples, read
[`docs/refactoring-guidelines.md`](../../../docs/refactoring-guidelines.md). The repository
checklist remains authoritative when this skill and a local convention differ.
