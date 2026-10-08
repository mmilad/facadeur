# Repository working rules

## Refactoring during task planning

Before extending source files, follow [the refactoring checklist](docs/refactoring-checklist.md).
Run `node scripts/refactor-candidates.mjs <affected files or directories>` when scoping a change,
and repeat it on affected paths before completion. With no arguments it scans maintained app/package source.

Size is a review signal, never an instruction to split a file automatically. Also review smaller
files when responsibilities, duplicated behavior, or repeated conditionals justify it.
Apply the checklist's directory and ownership rules: organize by domain, colocate private
helpers, share within a package only for actual common behavior, and share across packages
through the owning package's public API. Do not create generic utility packages or deep imports
merely to reduce file size. Review a flat directory when unrelated domains accumulate there.
Add a justified, in-scope refactor to the current task plan before the feature that depends on it.
Record unrelated candidates in the refactoring backlog in `docs/plan.md`; do not silently expand
the user's task. For each candidate, state the evidence, chosen boundary/pattern, preserved
contracts, and validation. A concise reason to retain a cohesive file is also a valid outcome.

Preserve existing user changes and staging. Refactoring does not authorize feature, public API,
data-model, dependency, or persistence changes. Current user instructions take precedence over
historical planning documents.

For repeatable refactoring work, use `.agents/skills/refactor/SKILL.md`. It combines the
candidate detector, this checklist, and `docs/refactoring-guidelines.md`; size-based splitting
remains a review decision, not an automatic action.

## TypeScript module specifiers

Use **extensionless relative imports** (`from './foo'`, `from '../bar'`). Root
`tsconfig.base.json` sets `moduleResolution: "Bundler"`, so `.js` suffixes are not required.
Keep `.js` only in external package paths (for example deep imports from `node_modules`).

## TypeScript return types and dependencies

Prefer inferred return types for simple getters, forwarding functions, and internal helpers
when TypeScript already derives the intended type from the implementation. Do not repeat a
type solely for documentation or AI assistance, and remove imports used only by redundant
annotations. Keep parameter types and shared domain contracts explicit where needed.

Retain explicit return types when they enforce an intentional boundary: stable public API
contracts, readonly views, intentional widening/normalization, recursive inference, overloads,
type predicates, and assertion functions. Being exported alone does not require an annotation;
a getter or forwarding function can inherit an existing domain contract. Do not replace a
removed annotation with a cast or a new dependency just to silence the compiler.

When cleaning up annotations, preserve the inferred public type (including optionality,
literal unions, mutability, and generics), check for inference cycles, and remove unused type
imports. Type inference reduces explicit coupling and maintenance; it does not remove the
underlying semantic dependency or change runtime imports by itself.

## Tooling friction

When a development command is repeatedly blocked, unexpectedly slow, or needs a workaround,
record the reproducible command, observed cause/evidence, impact, and a concrete fix in
`docs/friction.md` under the tooling-friction backlog. Update or close the entry once resolved;
omit one-off failures with no repeatable cause.
