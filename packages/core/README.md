# Core ownership

`@facadeur/core` owns the portable document DSL, its invariants, commands, and shared store
contract. It has no editor, renderer, framework, or Yjs implementation dependency.
Consumers import the explicit public API from `@facadeur/core`; internal source paths are not
package exports. Inside core, import the owning module directly rather than `src/index.ts`.

## Source organization

| Area                     | Owns                                                                                                                    | Does not own                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `document/`              | Document schemas/types, serialization, IDs, JSON, errors.                                                               | UI selection or DOM addressing.                           |
| `store/`                 | Renderer-facing store contracts and controller-backed views with snapshot Undo/Redo.                                  | CRDT ownership or a second live document state.            |
| `controller/project/`    | Project state, shared context, command coordination.                                                                    | Persistence or organization features not yet implemented. |
| `controller/document/`   | Live document views, node/field/event/schema commands.                                                                  | Yjs transactions or editor interaction state.             |
| `controller/variants/`   | Variant commands, sparse resolution/derivation, preview-data composition.                                               | Inspector tabs or variant selection widgets.              |
| `controller/style/`      | Shared StyleController, document styles, global/component tokens, fonts, breakpoints, layout, references, and commands. | CSS compilation, DOM style application, font loading.     |
| `controller/validation/` | Schema ingress, assertions, tree/definition checks, field contracts and catalog validation.                             | Presentation of validation errors to users.               |

Domain names are supplied by directories: use `project/controller.ts`, `style/blocks/parse.ts`,
and `style/tokens/global/tree.ts`. Small command domains expose `commands.ts`; command directories expose
`commands/index.ts` with explicit named exports. Consumers use that command boundary, while
private modules within it import each other directly.

Document commands keep cloning, dispatch, canonicalization, and validation in `commands/apply.ts`.
Variants keep resolution in `resolve.ts`, derivation in `derive.ts`, and node deltas in
`derive-node.ts`. See [controller ownership and naming](src/controller/README.md) for details.

`project.styles` exposes global token/font/breakpoint editing and explicit document scopes
through `project.styles.document(id)`. See the [style file map and API](src/controller/style/README.md)
for each module's responsibility. Token evaluation and CSS output stay in `@facadeur/tokens`.

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
