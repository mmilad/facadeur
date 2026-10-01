# Core ownership

`@facadeur/core` owns the portable document DSL, its invariants, commands, and shared store
contract. It has no editor, renderer, framework, or Yjs implementation dependency.
Consumers import the explicit public API from `@facadeur/core`; internal source paths are not
package exports. Inside core, import the owning module directly rather than `src/index.ts`.

## Source organization

| Area            | Owns                                                                                              | Does not own                                                   |
| --------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `document/`     | Document schemas/types, flat/nested representation, kinds, IDs, JSON primitives, document errors. | UI selection or DOM addressing.                                |
| `commands/`     | Document mutations, command/change types, abstract store contract.                                | Yjs transactions or editor interaction state.                  |
| `variants/`     | Sparse variant resolution/derivation and preview-data composition.                                | Inspector tabs or variant selection widgets.                   |
| `styles/`       | DSL layout parsing, style-layer contracts/canonicalization, document font/breakpoint definitions. | CSS compilation, DOM style application, font loading.          |
| `validate.ts`   | Schema validation and document/catalog invariants.                                                | Presentation of validation errors to users.                    |
| `token-tree.ts` | Stored token-tree contracts, indexing, canonicalization and mutations.                            | Token evaluation and CSS output (owned by `@facadeur/tokens`). |

The schema graph remains together for now. `validate.ts` and `token-tree.ts` remain single
modules pending responsibility-based extraction; moving them into one-file folders would not
resolve their size. Directory organization and file decomposition are separate decisions.

Keep pure contracts below their consumers. Commands can call validation; validation does not
call commands. Document representation does not depend on editor/adapter packages. Some
domains legitimately reference other core domains; avoid turning the domain layout into
artificially independent packages or adding barrels that create runtime cycles.

See [the repository checklist](../../docs/refactoring-checklist.md) for when to create a domain
directory, share a helper within this package, or expose stable behavior to other packages.
