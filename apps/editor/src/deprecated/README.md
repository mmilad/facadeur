# Deprecated editor modules

Reference-only copies removed from the product path. Do not import from here in new code.

- Former `app-service/controllers/*` — use `CoreController` (`app.core`) from `@facadeur/core`.
- Former `domain/catalog/v2-catalog.ts` — use `@facadeur/core` catalog ops (`findDefinition`, `findNodeByUuid`, `patchNodeData`, `resolveJsonSchemaForDefinition`).
- Former flat-document session stack (`session-project`, `undo-history`, `snapshot`, …) and schema library UI.
- Legacy editor tests under `apps/editor/test/` (excluded from `tsc`; replaced by `apps/editor/test/catalog/*`).
