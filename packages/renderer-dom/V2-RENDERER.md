# Renderer v2

`src/resolve.ts` and related modules still target **legacy** `FlatNode` / `nestedNodeSchema`.

Next step: render from v2 **`Node`** (`dom.tagName`, `attributes`, `data`, `properties`, `style`) and resolve **`config.definitionRef`** against `ProjectCatalog`.

Contract source of truth: `@facadeur/core/node-model` and [docs/node-model-refactor.md](../../docs/node-model-refactor.md).
