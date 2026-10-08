# App service (editor logic monolith)

Single debuggable entry for editor behavior. UI (canvas + left sidebar first) calls **`AppService`**, which **is** the project controller (design, asset list, snapshot). Nested controllers own domains and delegate to `@facadeur/core` / API until v2 catalog is fully cut over.

## Hierarchy

```
AppService (class, project controller)
├── api: ApiController
└── nodeController: NodeController
    ├── element: ElementController
    ├── style: StyleController
    ├── config: ConfigController
    └── schema: SchemaController
```

Construct with `new AppService(session)` or `createAppService(session)`.

**Planned:** editor `AppService` wraps **`CoreController`** (`packages/core/src/controller/core/`) + API **`CatalogPort`**. Current editor-local controller classes are a temporary shim until wiring lands.

| Surface | Responsibility (target) | Legacy bridge today |
|---------|-------------------------|---------------------|
| **AppService** | Project view: design, `listAssets()`, `snapshot()` | `EditorSession` + design document |
| **nodeController** | Open document, selection, layer commands | `session.execute`, v2 open + `patchField` |
| **nodeController.element** | DOM: tagName, attributes, data, properties, children | `@facadeur/renderer-dom` v2 + legacy resolve |
| **nodeController.style** | Style rules, `{token:uuid}` / `{prop:uuid}` | Stub; `@facadeur/core` style engine later |
| **nodeController.config** | Preview data merge (top-down) | `config.previewData` on v2 definitions |
| **nodeController.schema** | Schema map refs, resolve for inspector | Catalog `schemas` + design `schemaCatalog` |
| **api** | Persist catalog (API / project storage) | `session.saveProjectCatalog` → catalog routes |

## Validation strategy

- **Runtime:** [Ajv](https://ajv.js.org/) against JSON Schema (v2 node model, catalog API payloads).
- **TypeBox (@sinclair/typebox):** optional author-time schemas that **compile to JSON Schema**; not required at runtime once Ajv owns validation. Phase out duplicate TypeBox validators in `@facadeur/core` as documents migrate to v2.

## Navigation

Frontend routes can mirror controller boundaries (project → document → layer) for debugging; not required for MVP.

## Code

- `apps/editor/src/app-service/` — `AppService` class and controller classes under `controllers/`.
