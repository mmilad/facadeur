# Style ownership

`project.styles` is the shared `StyleController`. It reads live snapshots and sends
edits through `ProjectController.updateDocument()`. It holds no independent document
state. The project retains validation, manifest replacement, and executor ownership.

```ts
project.styles.globalTokens;
project.styles.globalTokenIndex;
project.styles.setGlobalToken('color.primary', { $type: 'color', $value: '#123456' });
project.styles.setFont(font);
project.styles.setBreakpoints(breakpoints);

const document = project.styles.document('button');
document.styles;
document.componentTokens;
document.tokenInterface;
document.nodeStyle('label');
document.variantStyle('compact');
document.setStyleBlock(style);
document.setNodeStyle('label', 'color', '{color.primary}');
document.setComponentToken(id, 'color.label', token);
```

Global writes target the project's design document. `document(id)` returns a stable
`DocumentStyle` facade whose writes target only that document. Its command type
excludes global token/font/breakpoint edits. Existing project/document getters and
the public pure `applyCommand` API remain available.

## File map

```text
style/
  controller.ts          Project facade: global tokens, fonts, breakpoints, document scopes
  document.ts            Document facade: styles, component tokens, token interfaces
  types.ts               Command scopes and project integration contract
  commands.ts            Pure command dispatch and private mutation helpers
  fonts.ts               Font sources, stacks, validation, and cloning
  breakpoints.ts         Breakpoint validation and cloning
  layout.ts              Layout parsing, normalization, and token references
  selectors.ts           Selector validation and transformation
  class-names.ts         Stable document CSS class names
  blocks/
    parse.ts             Parse authored style blocks and token interfaces
    contract.ts          Validate and canonicalize style contracts
    edit.ts              Prune/rebase nodes and variant axes in style blocks
    index.ts             Explicit style-block algorithm exports
  tokens/
    types.ts             DTCG tree, token/group definitions, and indexes
    syntax.ts            Token path segments and whole-value reference syntax
    global/
      tree.ts            DTCG indexing/treewalk and public tree editing functions
      read.ts            Parse inherited metadata and breakpoint values
      mutate.ts          Validate paths, construct entries, edit groups, prune empty groups
      values.ts          Validate typed token values and responsive overrides
    component/
      contract.ts        Component-token parsing, paths, defaults, and compatibility
      commands.ts        Set/remove/rename component tokens
  references/
    collect.ts           Collect token usages in authored styles and layout
    adopt.ts             Add introduced global references to tokenInterface.reads
    rewrite.ts           Rewrite local component-token references on rename
```

DTCG traversal and style traversal remain separate because they implement different
data contracts. Reference collection and rewriting retain their existing surfaces;
aligning those surfaces is recorded separately in `docs/plan.md`.

Serialization and validation import pure algorithms directly. They never import the
live controllers or command dispatcher. Token evaluation/CSS output remains owned by
`@facadeur/tokens`; style compilation remains owned by `@facadeur/style-engine`.
