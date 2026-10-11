# Core ownership

`@facadeur/core` owns the portable document DSL, its invariants, commands, and shared store
contract. It has no editor, renderer, framework, or Yjs implementation dependency.
Consumers import the explicit public API from `@facadeur/core`; internal source paths are not
package exports. Inside core, import the owning module directly rather than `src/index.ts`.

## Source organization

| Area                     | Owns                                                                                                  | Does not own                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `document/`              | Flat document model, serialization, tree operations, IDs, kinds, child fields, document errors.       | UI selection or DOM addressing.                              |
| `schema/`                | Shared TypeBox contracts and derived types, assembled by `document.ts`.                               | Controller state or command execution.                       |
| `utils.ts`               | Shared JSON value checks, plain-object checks, canonical JSON cloning.                                | Domain-specific behavior or controller state.                |
| `controller/project/`    | Catalog state, `CoreController`, catalog validation/operations, and node preview resolution.          | Persistence adapters or editor interaction state.            |
| `controller/style/`      | Pure style/token commands, token algorithms, fonts, breakpoints, layout, selectors, and references.   | Live project facade, CSS compilation, DOM style application. |
| `controller/validation/` | Schema ingress, assertions, tree/definition checks, field contracts and catalog validation.           | Presentation of validation errors to users.                  |
| `legacy/flat/document/`  | Flat-document commands and variant operations retained for compatibility consumers.                   | Catalog-native product editing.                              |
| `legacy/flat/store/`     | The flat `DocumentStore` contract consumed by Store-Yjs.                                              | A Core-owned controller-backed store implementation.         |
| `tokens/`                | Pure token indexing, UUID reference validation, responsive value resolution, and CSS property values. | CSS stylesheet compilation or DOM style application.         |

Domain names are supplied by directories: use `project/controller.ts`, `style/blocks/parse.ts`,
and `style/tokens/global/tree.ts`. Small command domains expose `commands.ts`; command directories expose
`commands/index.ts` with explicit named exports. Consumers use that command boundary, while
private modules within it import each other directly.

Document commands keep cloning, dispatch, canonicalization, and validation in `commands/apply.ts`.
Variants keep resolution in `resolve.ts`, derivation in `derive.ts`, and node deltas in
`derive-node.ts`. See [controller ownership and naming](src/controller/README.md) for details.

Catalog design edits go through `CoreController.applyDesignCommand`; pure style and token
algorithms remain in Core's command layer. See the [style file map](src/controller/style/README.md)
for module ownership. Token evaluation belongs to Core; stylesheet compilation belongs to
`@facadeur/style-engine`.

Keep pure contracts below their consumers. Commands can call validation; validation does not
call commands. Document representation does not depend on editor/adapter packages. Some
domains legitimately reference other core domains; avoid turning the domain layout into
artificially independent packages or adding barrels that create runtime cycles.

Follow the [project return-type rule](../../AGENTS.md#typescript-return-types-and-dependencies):
infer simple getters, forwarding functions, and internal helpers; retain explicit types for
intentional contracts, readonly views, predicates/assertions, and recursive inference. Remove
imports used only by redundant return annotations without changing public type shapes.

See [the repository checklist](../../docs/refactoring-checklist.md) for when to create a domain
directory, share a helper within this package, or expose stable behavior to other packages.
