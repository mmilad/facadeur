# `@facadeur/codegen`

Generate a standalone React and Storybook project from a canonical `ProjectCatalog`. Core validates
the Catalog and resolves component instances, field exposures, preview data, and token text before
Codegen emits the DOM tree. Style Engine produces design-token CSS and compiles the Catalog's
project-level declarations, states, variants, responsive layers, child paths, and UUID-bound style
selectors.

```sh
pnpm codegen --catalog catalog.json --workspace ./generated-project
```

Use `--next-example` to include the optional Next.js starter, or use `--out <ui-directory>` and
`--storybook <storybook-directory>` to write components and stories into existing projects. Use
`--entries <uuid,...>` to generate selected definitions and their referenced definitions. Output
files are tracked in a manifest so regenerating removes stale generated files and leaves unrelated
files intact. The input must be a JSON serialization of the current Catalog model; legacy
`DocumentFile` inputs are not supported.
