# `@facadeur/codegen`

The current public generator accepts legacy `DocumentFile[]` input. This v1 API and the React
engine exports are deprecated; the intended replacement generates a project from the current
catalog model through Core's canonical catalog/build pipeline.

The root `pnpm codegen` command stays disabled until that catalog-driven generator is implemented.
Do not add new consumers of the legacy API. The Editor's active Code view uses Core's resolved
element build config. Its unused v1 `CodeStage` and `codePreview` adapter have been removed.
