# Core controller ownership

## Catalog-native product (`controller/project/`)

```
project/
  controller.ts       # CoreController — catalog snapshot, selection, persist
  catalog/            # validate, lookup, interim patches
  node/               # everything about the open definition tree
    controller.ts     # NodeController — wires sub-controllers
    preview/          # merge field layers + resolve bindings → ElementBuildConfig
    config/           # preview-field read API (inspector)
    element/          # preview output → renderer entry
    schema/           # JSON Schema resolve for inspector
    style/            # per-node style authoring (feeds preview; stub)
```

**Preview** owns (1) merged effective data per tree node and (2) literal DOM/style values (`{prop:uuid}` → string) so **renderer-dom** never parses bindings. Repeaters / `definitionRef` child lists expand here later.

**Element** only forwards preview’s build config — no resolution logic.

Legacy flat documents: `src/legacy/` → `@facadeur/core/legacy`.

Shared token/style engine: `controller/style/` (catalog wiring TBD).
