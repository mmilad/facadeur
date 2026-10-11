# Style and token algorithms

`controller/style/` owns pure flat-document style commands and reusable token, breakpoint,
layout, selector, and reference logic. Catalog state and design commands are owned by
`controller/project/`; stylesheet compilation and runtime injection belong to
`@facadeur/style-engine`.

## File map

```text
style/
  types.ts               Style command scopes
  commands.ts            Pure command dispatch and private mutation helpers
  fonts.ts               Font-family token value validation and font styles
  breakpoints.ts         Breakpoint validation and cloning
  layout.ts              Layout parsing, normalization, and token references
  selectors.ts           Selector validation and transformation
  class-names.ts         Stable document CSS class names
  blocks/
    parse.ts             Parse authored style blocks and token interfaces
    contract.ts          Validate and canonicalize style contracts
    edit.ts              Prune/rebase nodes and variant axes in style blocks
  tokens/
    types.ts             UUID-keyed token records, groups, and indexes
    syntax.ts            Stable UUID reference syntax
    global/
      tree.ts            UUID-key validation, token indexing, generated paths, and tree edits
      selector.ts        Generate CSS custom-property names from derived token paths
      values.ts          Validate typed token values and responsive overrides
      legacy-migration.ts One-time migration of path-keyed tokens and references
    component/
      contract.ts        Component-token parsing, paths, defaults, and compatibility
      commands.ts        Set/remove/rename component tokens
  references/
    collect.ts           Collect token usages in authored styles and layout
    adopt.ts             Add introduced global references to tokenInterface.reads
    rewrite.ts           Rewrite local component-token references on rename
```

Global token identity and references use UUIDs. A token's CSS custom-property path is derived
from its family, group, and label; it is not persisted as token identity. Component tokens keep
their separate path-based contract. The legacy migration module is used only at document and
catalog read boundaries.

Serialization and validation import pure algorithms directly. They never import the
live controllers or command dispatcher. Token evaluation is owned by Core's `tokens/` domain;
stylesheet compilation and runtime injection are owned by `@facadeur/style-engine`.
