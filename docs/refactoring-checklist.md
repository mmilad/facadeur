# Refactoring checklist

Review refactoring pressure while planning changes and before completing them. The detector
reports candidates; a developer or coding agent chooses a meaningful boundary. This is part of
an active task, not a scheduled background process.

## Detection

Run `node scripts/refactor-candidates.mjs` for maintained source, or pass affected files/directories.
It reports files with at least 450 lines; at 700 lines, review before adding more responsibilities.
These are starting thresholds, not limits or quality scores. Generated output, tests, fixtures,
and dependency/build directories are excluded. No findings does not prove good architecture.
Directories with 12 or more direct source files also trigger an organization review. This
detects concentration, not semantic problems: a cohesive directory may legitimately stay flat.

Review regardless of size when a change would duplicate behavior, add another independent
responsibility, repeat the same branching across several controls, or make testing require
unrelated infrastructure. Do not split a cohesive parser, schema, or algorithm just for length.

## Questions and patterns

| Question                                                 | Evidence to look for                                                                                   | Preferred response                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Does the file have multiple reasons to change?           | DOM painting, store lifecycle, data resolution, or UI rendering change independently.                  | Extract modules by responsibility; keep a small orchestrator.                                                                        |
| Is logic independent of UI or side effects?              | Resolution, normalization, capability checks, or serialization can be tested without rendering.        | Extract pure domain functions, with explicit inputs and outputs.                                                                     |
| Do several places implement the same behavior?           | The same value semantics, validation, or interaction appears in multiple callers.                      | Reuse the existing control/helper, or extract one shared implementation at their common layer. Similar markup alone is insufficient. |
| Does a component own unrelated state or workflows?       | Independent state transitions, subscriptions, or event handlers dominate the component.                | Extract a focused hook/controller; extract a child component for a coherent interaction.                                             |
| Are conditionals repeated for the same cases?            | Multiple switches must all change when a supported case is added.                                      | Use a typed configuration/dispatch table when cases share a contract; retain explicit branching otherwise.                           |
| Is context threaded through too many parameters?         | A stable set of related context values travels together.                                               | Introduce a narrowly typed context object; avoid a mutable global or service locator.                                                |
| Would extraction create cycles or excessive indirection? | Helpers import their orchestrator; tiny files depend on each other; callers jump between many modules. | Move shared contracts downward or keep the cohesive code together.                                                                   |
| Is the problem actually a behavioral defect?             | Existing behavior violates a contract, independently of file structure.                                | Track/fix the defect separately; do not hide it inside a mechanical extraction.                                                      |

Prefer the simplest pattern that answers the observed problem. Do not add classes, registries,
generic frameworks, or new dependencies unless the task provides a concrete need.

## Directories and code ownership

Organize by the feature/domain that owns the behavior, then by responsibilities within that
domain when needed. File size, export count, or the words "util", "service", "class", and
"component" do not determine ownership. A class is an implementation choice, not a directory.

| Decision                           | Use this when                                                                                                                                 | Avoid                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Keep one file                      | One cohesive responsibility is easy to navigate and test.                                                                                     | Creating a folder just because a file is long.                                                           |
| Create a domain directory          | Two or more related implementation modules share a domain and change together, or a feature has cohesive UI, controller, and domain helpers.  | One directory per helper; a flat mix of unrelated domains; grouping all classes/services/utils together. |
| Keep a helper private to its owner | Only one feature uses it, or its meaning depends on that feature.                                                                             | Promoting speculative reuse into `shared`.                                                               |
| Share within a package             | Multiple domains in that package genuinely use the same contract and behavior.                                                                | Sharing code whose similar-looking callers have different semantics.                                     |
| Share across packages              | Two or more packages need the same stable behavior, and one existing package clearly owns the contract without depending on its consumers.    | Deep-importing another package's implementation or adding an editor dependency to core.                  |
| Create a new package               | Independent consumers, dependencies, lifecycle, and a clear API justify an independently maintained boundary; existing owners are unsuitable. | Creating a global utilities package for a few functions.                                                 |

Start feature helpers next to their consumer. Move them to a common owner only after actual
reuse emerges. Prefer a domain-specific common module (such as `document/ids.ts`) to a generic
`shared/utils.ts`. A package-level `shared` directory is appropriate only for genuine foundational
primitives with no domain owner; keep it small and name each contract precisely.

For components, colocate interaction-specific pieces and hooks in their feature directory;
shared controls belong in the existing control/form layer. For services/controllers, colocate
the implementation with its feature and make side effects explicit. For pure utilities, place
them with the domain whose vocabulary and invariants they implement. A contract needed by
several domains lives below its consumers; avoid feature-to-feature import cycles.

Cross-package reuse uses the owning package's public entry point, with explicit exports.
Inside a package, use direct internal imports; importing its public barrel can create cycles.
Do not add directory barrels everywhere: `index.ts` is for a meaningful boundary, not a
requirement for every folder. Preserve supported public imports when reorganizing internals.

In Facadeur, portable document/DSL contracts and invariant enforcement belong to `core`;
token evaluation/output belongs to `tokens`; shared style compilation belongs to `style-engine`;
DOM-specific rendering belongs to `renderer-dom`; Yjs encoding belongs to `store-yjs`;
code generation belongs to `codegen`, with framework-specific output under `engines/<target>`;
editor selection and controls belong to `apps/editor`.
Put a shared function in the package that owns its semantics, not simply the first caller or
the lowest package in the dependency graph. Core must remain independent of those adapters.

Before moving code, record its consumers, ownership, intended dependency direction, and public
compatibility requirements. Check for deep imports and runtime cycles. A directory move can
improve discovery without resolving an oversized module: track both decisions separately.

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
