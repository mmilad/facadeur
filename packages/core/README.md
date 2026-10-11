# Core ownership

`@facadeur/core` owns Catalog state and operations, validation, node preview resolution, and
design-token algorithms. It has no editor, renderer, framework, persistence adapter, or
collaboration dependency. Consumers import through `@facadeur/core`; internal source paths are
not package exports. Inside Core, import the owning module directly rather than `src/index.ts`.

## Source organization

| Area                     | Owns                                                                                          | Does not own                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `document/`              | IDs, kinds, child-field operations, and document errors.                                      | UI selection or DOM addressing.                              |
| `schema/`                | Catalog-facing TypeBox contracts and their derived types.                                    | Controller state or command execution.                       |
| `utils.ts`               | Shared JSON value checks, plain-object checks, canonical JSON cloning.                       | Domain-specific behavior or controller state.                |
| `controller/project/`    | Catalog state, `CoreController`, Catalog validation/operations, and node preview resolution. | Persistence adapters or editor interaction state.            |
| `controller/style/`      | Pure style/token algorithms, fonts, breakpoints, layout, selectors, and style-block parsing. | Live project facade, CSS compilation, DOM style application. |
| `controller/validation/` | JSON-schema value matching and Catalog validation entry points.                              | Presentation of validation errors to users.                  |
| `tokens/`                | Token indexing, UUID reference validation, responsive values, and CSS property values.       | CSS stylesheet compilation or DOM style application.         |

Project and Catalog commands live under `controller/project/`. See
[controller ownership and naming](src/controller/README.md) for details.

Catalog design edits go through `CoreController.applyDesignCommand`; pure style and token
algorithms remain in Core. Stylesheet compilation belongs to `@facadeur/style-engine`.

Keep pure contracts below their consumers. Commands can call validation; validation does not
call commands. Catalog representation does not depend on editor packages. Some domains
legitimately reference other Core domains; avoid artificial package boundaries and barrels that
create runtime cycles.

Follow the [project return-type rule](../../AGENTS.md#typescript-return-types-and-dependencies):
infer simple getters, forwarding functions, and internal helpers; retain explicit types for
intentional contracts, readonly views, predicates/assertions, and recursive inference. Remove
imports used only by redundant return annotations without changing public type shapes.

See [the repository checklist](../../docs/refactoring-checklist.md) for when to create a domain
directory, share a helper within this package, or expose stable behavior to other packages.
