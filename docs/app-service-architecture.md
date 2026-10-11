# Editor service boundaries

The Editor uses `AppService` as a UI-facing coordinator. Catalog state and catalog mutations belong
to `CoreController`; Editor chrome and session state belong to `EditorSession`. Storybook and the
local preview use an in-memory Catalog port.

UI components receive Catalog operations through `AppService`; its Core controller reference is
private. `EditorSession` uses the same Core controller internally to coordinate selection and
viewport state, while the Shell composition root wires the session, service, and Catalog port.

```text
Editor UI
├── AppService
│   ├── CoreController  — catalog snapshot, validation, definitions, schemas, design data
│   ├── EditorSession   — selection, viewport and editing state
│   └── InspectorService — adapts Core preview data for inspector controls
└── Editor CatalogPort — in-memory persistence and definition operations
```

## Ownership

| Owner               | Responsibility                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AppService`        | UI-facing operations; delegates catalog transport and state changes to Core and session state to EditorSession.                                        |
| `CoreController`    | Validated catalog state, definition/schema/design mutations, and save/create/delete orchestration through ports.                                       |
| `EditorSession`     | Editor selection, viewport and editing state.                                                                                                           |
| `InspectorService`  | Shapes Core's preview/inspector model for UI controls.                                                                                                 |
| `createInMemoryCatalogPort` | Supplies local persistence and definition operations to Storybook and the local preview.                                                  |
| React canvas        | Renders the active Editor canvas.                                                                                                                      |

The Editor canvas renders through React `DynamicElement`, consuming `ElementBuildConfig` from Core.
Shared contracts live in `@facadeur/domain`.

## Validation

Core owns catalog validation and state transitions. `@sinclair/typebox` schemas and Ajv validate
Core and catalog contracts; they are not Editor controller responsibilities. Storybook and the
local preview initialize from shared example catalogs, then Core owns the active catalog.
