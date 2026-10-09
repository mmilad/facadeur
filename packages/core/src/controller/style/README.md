# Style ownership

`project.styles` is the shared `StyleController`. It reads live snapshots and sends
edits through `ProjectController.updateDocument()`. It holds no independent document
state. The project retains validation, manifest replacement, and executor ownership.

```ts
project.styles.globalTokens;
project.styles.globalTokenIndex;
project.styles.setGlobalToken('color', {
  uuid: 'TOKEN_UUID', // replace with an assigned UUID
  label: 'Primary',
  group: 'brand',
  valueType: 'color',
  value: '#123456',
});
project.styles.setGlobalToken('font', font);
project.styles.setBreakpoints(breakpoints);

const document = project.styles.document('button');
document.styles;
document.componentTokens;
document.tokenInterface;
document.nodeStyle('label');
document.variantStyle('compact');
document.setStyleBlock(style);
document.setNodeStyle('label', 'color', '{token:TOKEN_UUID}');
document.setComponentToken(id, 'color.label', token);
```

Global writes target the project's design document. `document(id)` returns a stable
`DocumentStyle` facade whose writes target only that document. Its command type
excludes global token/font/breakpoint edits. Existing project/document getters and
the public pure `applyCommand` API remain available.

## File map

```text
style/
  controller.ts          Project facade: token records, breakpoints, document scopes
  document.ts            Document facade: styles, component tokens, token interfaces
  types.ts               Command scopes and project integration contract
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
live controllers or command dispatcher. Token evaluation/CSS output remains owned by
`@facadeur/tokens`; style compilation remains owned by `@facadeur/style-engine`.
