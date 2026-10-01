# Core ownership

`@facadeur/core` owns the portable document DSL, its invariants, commands, and shared store
contract. It has no editor, renderer, framework, or Yjs implementation dependency.
Consumers import the explicit public API from `@facadeur/core`; internal source paths are not
package exports. Inside core, import the owning module directly rather than `src/index.ts`.

## Source organization

| Area            | Owns                                                                                                        | Does not own                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `document/`     | Document schemas/types, flat/nested representation, kinds, IDs, JSON primitives, document errors.           | UI selection or DOM addressing.                                |
| `commands/`     | Document mutations, command/change types, abstract store contract.                                          | Yjs transactions or editor interaction state.                  |
| `variants/`     | Sparse variant resolution/derivation and preview-data composition.                                          | Inspector tabs or variant selection widgets.                   |
| `styles/`       | DSL layout parsing, style-layer contracts/canonicalization, document font/breakpoint definitions.           | CSS compilation, DOM style application, font loading.          |
| `validation/`   | Schema ingress, local assertions, tree/definition checks, exposed/data contracts and catalog orchestration. | Presentation of validation errors to users.                    |
| `token-tree.ts` | Stored token-tree contracts, indexing, canonicalization and mutations.                                      | Token evaluation and CSS output (owned by `@facadeur/tokens`). |

The schema graph and token-tree implementation remain together for now. The validation
implementation is split by responsibility; `validate.ts` remains a compatibility facade.
Directory organization and file decomposition are separate decisions.

Commands keep cloning, dispatch, canonicalization and final validation in `commands.ts`.
Private mutation families live in `structure.ts`, `node.ts`, `definitions.ts` and `design.ts`;
command types and genuinely shared node/value/token-read helpers live below those callers.
Variants use `resolve.ts` for application, `derive.ts` for preset construction and
`derive-node.ts` for node deltas. `variants.ts` preserves the existing entry point. Internal
callers import implementation owners directly; compatibility facades stay at public boundaries.

Keep pure contracts below their consumers. Commands can call validation; validation does not
call commands. Document representation does not depend on editor/adapter packages. Some
domains legitimately reference other core domains; avoid turning the domain layout into
artificially independent packages or adding barrels that create runtime cycles.

See [the repository checklist](../../docs/refactoring-checklist.md) for when to create a domain
directory, share a helper within this package, or expose stable behavior to other packages.
