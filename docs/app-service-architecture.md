# Editor service boundaries

The Editor uses `AppService` as a UI-facing coordinator. Catalog state and catalog mutations belong
to `CoreController`; Editor chrome and session state belong to `EditorSession`. The API adapter
implements transport ports and does not own catalog editing rules.

```text
Editor UI
├── AppService
│   ├── CoreController  — catalog snapshot, validation, definitions, schemas, design data
│   ├── EditorSession   — selection, viewport, editing state, persistence coordination
│   └── InspectorService — adapts Core preview data for inspector controls
└── Editor CatalogPort — HTTP implementation passed to Core for catalog transport
```

## Ownership

| Owner | Responsibility |
| --- | --- |
| `AppService` | UI-facing operations; delegates catalog transport and state changes to Core and session state to EditorSession. |
| `CoreController` | Validated catalog state, definition/schema/design mutations, and load/save/create/delete orchestration through ports. |
| `EditorSession` | Editor selection, viewport and editing state; coordinates persistence for the active project. |
| `InspectorService` | Shapes Core's preview/inspector model for UI controls. |
| `createCatalogPort` | Maps Core's catalog port methods to the Editor API client. |
| React canvas | Renders the active Editor canvas. |

`@facadeur/renderer-dom` is deprecated. It remains for compatibility and legacy tests; new Editor
canvas rendering belongs to React. API routes and API-client remain transport layers. Shared
contracts live in `@facadeur/domain`.

## Validation

Core owns catalog validation and state transitions. API request validation remains at the API
boundary. `@sinclair/typebox` schemas and Ajv validate their respective persisted/request
contracts; they are not Editor controller responsibilities.
