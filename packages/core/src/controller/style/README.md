# Style and token algorithms

`controller/style/` owns reusable token, breakpoint, layout, selector, and style-block parsing
logic. Catalog state and design mutations belong to `controller/project/`. Stylesheet compilation
and runtime injection belong to `@facadeur/style-engine`.

## File map

```text
style/
  types.ts               Catalog token and breakpoint command contracts
  fonts.ts               Font-family token value validation and font styles
  breakpoints.ts         Breakpoint validation and cloning
  layout.ts              Layout parsing, normalization, and token references
  selectors.ts           Selector validation and transformation
  blocks/
    parse.ts             Parse authored style blocks and token interfaces
    edit.ts              Prune and rebase responsive style blocks
  tokens/
    types.ts             UUID-keyed token records, groups, and indexes
    syntax.ts            Stable UUID reference syntax
    global/
      tree.ts            UUID-key validation, token indexing, generated paths, and tree edits
      selector.ts        Generate CSS custom-property names from derived token paths
      values.ts          Validate typed token values and responsive overrides
```

Global token identity and references use UUIDs. A token's CSS custom-property path is derived
from its family, group, and label; it is not persisted as token identity.

Token evaluation is owned by Core's `tokens/` domain; stylesheet compilation and runtime
injection are owned by `@facadeur/style-engine`.
