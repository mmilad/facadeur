# Style engine

The public API is `src/index.ts`. Internal modules are organized by ownership;
consumers in other packages should use `@facadeur/style-engine`.
Internal relative imports omit file extensions. The workspace uses TypeScript's
`Bundler` module resolution, and its runtime bundlers consume the TypeScript
workspace sources directly.

```text
src/
  compiler/   document orchestration, node traversal, shared rule/layer emission, types
  layout/     frame/placement declarations, spacing and axis sizing
  selectors/  local/nested addressing, variant scope, authored selector groups
  css/        token substitution, declaration merging/formatting, quoted strings, types
  runtime/    live controller, document lifecycle, CSSOM operations, design rules, types
  index.ts    unchanged public exports
```

`compileDocument` resolves presets, walks nodes, emits nested overrides and authored
rules, then orders responsive layers. Layout and CSS values are pure conversions.
All compiled rule sources use the same emitter for states, axes and breakpoints.
The runtime consumes those compiled rules and manages their CSSOM ownership.
Pure compilation/value code does not import DOM controllers.

The controller and engine have different contracts: `Rule` manages user-created
parent/child relationships and selector updates; the engine replaces compiled
document rules, including media groups and design imports. They share stylesheet
insertion/deletion primitives, not a speculative common lifecycle abstraction.

## Refactor decisions (2026-10-03)

- Keep layout default declarations separate from sparse breakpoint overrides.
  Applying defaults to an override would overwrite inherited layout. Keep inline
  styles and style-block layers in their current precedence order.
- Share exact instance target generation between local and nested overrides.
  Repeated component attributes intentionally preserve specificity; they are
  not redundant declarations to delete.
- Share CSS string escaping, CSSOM insertion/lookup and compiled rule emission.
  `mergeDeclarations` uses Map insertion order directly; frame placement no longer
  filters out properties that its own helper never emits.
- Track only the top-level CSSOM rule that the engine owns. For a responsive rule
  this is the media group, which already owns its child; there is no separate live
  child metadata to maintain during cleanup.
- Keep the portable selector scanner in core. The local group/pseudo-element
  scanner serves output scoping; both local operations now use one implementation.

## Further reductions worth doing separately

1. **Design rule serialization belongs to tokens.** `runtime/design.ts` repeats
   font-face and responsive-property projection from `packages/tokens/src/css.ts`.
   Prefer an ordered rule-text output from tokens, consumed by both text codegen
   and CSSOM insertion. This would remove an entire duplicate serializer without
   parsing a generated stylesheet back into rules. It needs an intentional tokens
   public API change and tests for imports preceding style rules, font formats,
   custom selectors and responsive values.
2. **Direct class-token replacement would simplify preview selectors.**
   `selectors/preview.ts` temporarily substitutes class identifiers before replacing
   them with bound attributes because core's current callback returns class names.
   A replacement form owned by core could remove that intermediate pass. Preserve
   quoted attribute contents, functional pseudos, node bindings and owner isolation.
3. **Keep one documented cascade policy across preview and export.** React output
   uses cascade layers while live preview preserves legacy selector specificity.
   Removing specificity markers requires a deliberate cascade change and browser/
   CSSOM compatibility checks; moving helpers alone cannot establish that contract.

These are concrete follow-up boundaries, not new abstractions introduced by this
refactor. Changing document layout/style persistence to reduce compiler code would
require a separate migration and is not needed for the package reorganization.

Validation includes existing compiler/controller/runtime/codegen tests and exact
compiled-rule comparison against the previous implementation for 20 example
documents in 80 instance/canvas/responsive configurations. Public exports,
declaration order, selectors and rule keys remain unchanged.
