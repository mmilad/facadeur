# Refactoring checklist

Review refactoring pressure while planning changes and before completing them. The detector
reports candidates; a developer or coding agent chooses a meaningful boundary. This is part of
an active task, not a scheduled background process.

## Detection

Run `node scripts/refactor-candidates.mjs` for maintained source, or pass affected files/directories.
It reports files with at least 450 lines; at 700 lines, review before adding more responsibilities.
These are starting thresholds, not limits or quality scores. Generated output, tests, fixtures,
and dependency/build directories are excluded. No findings does not prove good architecture.

Review regardless of size when a change would duplicate behavior, add another independent
responsibility, repeat the same branching across several controls, or make testing require
unrelated infrastructure. Do not split a cohesive parser, schema, or algorithm just for length.

## Questions and patterns

| Question | Evidence to look for | Preferred response |
| --- | --- | --- |
| Does the file have multiple reasons to change? | DOM painting, store lifecycle, data resolution, or UI rendering change independently. | Extract modules by responsibility; keep a small orchestrator. |
| Is logic independent of UI or side effects? | Resolution, normalization, capability checks, or serialization can be tested without rendering. | Extract pure domain functions, with explicit inputs and outputs. |
| Do several places implement the same behavior? | The same value semantics, validation, or interaction appears in multiple callers. | Reuse the existing control/helper, or extract one shared implementation at their common layer. Similar markup alone is insufficient. |
| Does a component own unrelated state or workflows? | Independent state transitions, subscriptions, or event handlers dominate the component. | Extract a focused hook/controller; extract a child component for a coherent interaction. |
| Are conditionals repeated for the same cases? | Multiple switches must all change when a supported case is added. | Use a typed configuration/dispatch table when cases share a contract; retain explicit branching otherwise. |
| Is context threaded through too many parameters? | A stable set of related context values travels together. | Introduce a narrowly typed context object; avoid a mutable global or service locator. |
| Would extraction create cycles or excessive indirection? | Helpers import their orchestrator; tiny files depend on each other; callers jump between many modules. | Move shared contracts downward or keep the cohesive code together. |
| Is the problem actually a behavioral defect? | Existing behavior violates a contract, independently of file structure. | Track/fix the defect separately; do not hide it inside a mechanical extraction. |

Prefer the simplest pattern that answers the observed problem. Do not add classes, registries,
generic frameworks, or new dependencies unless the task provides a concrete need.

## Add the decision to the plan

For each justified candidate, record:

- **Evidence:** file and the specific responsibilities/duplication creating pressure.
- **Action:** module boundary or reuse pattern, including what stays together.
- **Scope:** current task prerequisite, or a separate backlog item.
- **Contracts:** public imports, data format, command ownership, sparse overrides, Undo,
  token/raw values, variants, states, responsive behavior, and codegen where applicable.
- **Validation:** existing behavioral tests, any meaningful coverage gap, type/lint checks,
  and browser checks for affected UI.

Implement required in-scope extraction before extending the affected behavior. Do not defer
every refactor to the end of a feature. Conversely, do not turn each candidate into a mandatory
rewrite: record why a large file remains cohesive when that is the better decision.
Deduplicate backlog entries and use concrete completion criteria, not "clean up later".

## Safe execution

Keep working files present while extracting so the running editor can continue compiling.
Maintain public entry points and dependency direction. Preserve existing user changes and
staging. Separate mechanical movement from behavior changes in the review.
Prefer behavior assertions over tests for filenames, function placement, or line counts.
Run relevant checks once after integration; rerun when a failure or subsequent change warrants it.

## Example: renderer

At 887 lines, `render.ts` mixed store coordination, instance/data resolution, DOM presentation,
and reconciliation. Extracting `resolve.ts`, `presentation.ts`, `context.ts`, and `types.ts`
left rendering/reconciliation together and kept the public entry points. Regression coverage
protects input identity/focus during style-only updates and subtree record cleanup. This is a
responsibility-based split; reaching 887 lines by itself would not justify it.
