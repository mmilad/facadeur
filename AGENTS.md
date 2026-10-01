# Repository working rules

## Refactoring during task planning

Before extending source files, follow [the refactoring checklist](docs/refactoring-checklist.md).
Run `node scripts/refactor-candidates.mjs <affected files or directories>` when scoping a change,
and repeat it on affected paths before completion. With no arguments it scans maintained app/package source.

Size is a review signal, never an instruction to split a file automatically. Also review smaller
files when responsibilities, duplicated behavior, or repeated conditionals justify it.
Add a justified, in-scope refactor to the current task plan before the feature that depends on it.
Record unrelated candidates in the refactoring backlog in `docs/plan.md`; do not silently expand
the user's task. For each candidate, state the evidence, chosen boundary/pattern, preserved
contracts, and validation. A concise reason to retain a cohesive file is also a valid outcome.

Preserve existing user changes and staging. Refactoring does not authorize feature, public API,
data-model, dependency, or persistence changes. Current user instructions take precedence over
historical planning documents.
