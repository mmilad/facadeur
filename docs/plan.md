# facadeur – Plan

> Living document. Active work and open verification items belong here. Completed reports and historical decisions are in [plan-history.md](plan-history.md). The following sections describe current product contracts and architecture; later decisions supersede older log entries.

## Open implementation and verification items

### Shared schema composition

- [ ] Add `Extend by` (`allOf`, one or more schema references) and `Extend by one of` (`oneOf`, one or more references) as repeatable rows with an add button and schema picker in the Shared Schemas editor.
- [ ] Resolve referenced schemas dynamically; validate the edited schema and all dependents when any referenced schema changes.
- [ ] Reject missing references, cycles, and unsatisfiable/invalid composed contracts with actionable errors. Keep additional-property policy local to the composed schema rather than inheriting it from references.
- [ ] Preserve schema IDs, assignments, stored formats, and existing validation behavior. Verify with focused domain/UI tests, editor typecheck/lint, and browser interaction.

Evidence: `SchemaLibraryStage` currently authors raw JSON Schema branches, while `schema-library` stores each named schema independently and has no dependency resolution or dependent validation. Keep schema resolution and graph validation in the schema domain; keep composition controls in the Shared Schemas UI. `SchemaLibraryStage` remains one cohesive authoring panel despite crossing the size-review threshold: schema editing, composition rows, validation messages, and JSON preview share one selection/write lifecycle; extracting the rows would add navigation without a separate owner.

### Inspector controls / manual CSS and explicit Auto sizing (2026-10-02)

- [x] Separate guided controls from manual CSS properties; preserve bidirectional effective values.
- [x] Distinguish inherited size reset from explicit auto, including instance/master and viewport/variant overrides.
- [x] Verify synchronization, sparse writes and Reset/Undo with tests/typecheck/lint.
- Historical note: visual browser verification was not performed because the local browser runtime failed during startup. Automated validation passed as recorded below.

Evidence: CssDeclarationsControl currently injects CSS rows into the structured layout sections;
Grid controls additionally mix track CSS and placement CSS with guided inputs. Separate presentation
surfaces while retaining existing declaration writers and effective values. Keep grouped declaration
orchestration cohesive; no new generic inspector framework. Explicit auto is an additive core size
mode compiled by style-engine, not another editor-only competing persisted source. Review compile.ts
(470 lines): its cohesive stylesheet algorithm stays together for the small axis branch; no split
solely for size. Preserve old modes, instance masters, sparse variants/viewports and Undo.
Validation: focused UI/compile/integration tests, full suite, typecheck, scoped lint/format, scan.
Inline CSS must be read and written through the same priority rules in both manual and guided
surfaces. Promote the existing layout style-field writer to the properties owner, retaining its
old layout import as a compatibility entry; reuse it for normal manual declaration edits.
Final checks: 866 tests pass; the one generated-UI snapshot comparison fails because the
pre-existing user edit of examples/specimen-section.json differs from packages/ui output.
Do not overwrite that edit or regenerate unrelated example output in this task. Workspace
typecheck, scoped ESLint and formatting pass. Added regression coverage for all four
instance/variant/viewport sizing contexts, inline CSS synchronization, native Hug cleanup,
duplicate own-source Inherit, retained min/max, guided-only Grid fields and media-rule order.
Browser runtime still cannot start after reset; no visual verification claimed. LayoutPanel
(481 lines) stays a cohesive selection/context/write orchestrator; pure sizing is colocated
separately. compile.ts (471 lines) keeps its stylesheet algorithm cohesive; a stable media
sort aligns canvas behavior with existing codegen ordering. No staging or commits changed.

### Grid two-pass implementation (2026-10-02)

- [x] Pass 1: tracks, separate gaps, container/item alignment and child placement; integrate and verify.
- [x] Pass 2: rectangular named area editor, parent-scoped child assignments and atomic rename; integrate and verify automatically.
- Historical note: visual browser verification was not performed because local Windows sandbox startup failed. Automated validation passed as recorded below.

Evidence: LayoutPanel already coordinates context and writes; adding grid UI there would mix
independent container/item interactions. Colocate private GridContainer/GridItem controls in
layout/grid and pure CSS parsing/validation beside them. Reuse icon choices and style-layer
writers. CSS declarations stay the sole persisted source; preserve imported CSS, sparse
viewport/variant overrides, tokens, siblings, public contracts and Undo. No core schema migration.
Validation: focused UI/domain tests after each pass, full suite/typecheck/lint, candidate rerun,
browser checks when local computer-use works. Advanced track CSS stays editable, not auto-rewritten.
Atomic area rename may touch inline node styles and style-block owners together: add an additive
batch command using the existing pure command validator and one Yjs transaction, rather than
exposing CRDT transactions to the inspector. Validate rejection and one-step Undo separately.
Pass 1: 28 focused tests pass; editor typecheck, scoped lint and formatting pass. Browser runtime
failed to start; continue automated validation without claiming visual verification.
Final integration: 828 tests / 147 files pass, workspace-wide typecheck, scoped ESLint and
Prettier pass; final candidate scan has no findings. Review loops covered shorthand gap
inheritance, explicit placement longhands, compound Reset, master-inherited instance styles,
longhand-only rename, sparse variants/viewports and one-step Undo. Grid-instance resolution
is a private module reusing the existing instance-variant resolver; masters remain unchanged.
Raster editing validates rectangles and names, supports up to 20x20 cells, and preserves
unsupported CSS for Advanced CSS. Rename affects direct children in the current edit context.
Browser-control startup repeatedly fails with Windows sandbox setup errors; no screenshot or
visual verification is claimed. Existing staging is preserved; nothing committed.

Unrelated backlog: earlier LayoutControl raw padding/margin inputs should be reviewed against
the existing token-only spacing parser. Grid gaps explicitly retain token-only controls here;
changing the wider spacing contract is outside this task.

### Item self-alignment (2026-10-02)

- [x] Extract layout style-field ownership/write routing from LayoutPanel before reusing it for align-self.
- [x] Add parent-axis-aware item alignment icons; preserve container and sibling styles, sparse variants/viewports, reset and Undo.
- Historical note: automated validation passed; visual browser verification was not performed because the browser-control process could not start.

Evidence: display and align-self need identical style-layer and node-override routing; keep this
private to the layout inspector, reuse existing icon choice and domain style writers. No schema,
renderer, dependency or persistence changes. Keep layout patch orchestration cohesive.
All 713 tests in 139 files pass; editor typecheck, ESLint and scoped
formatting pass. Candidate detector has no findings. Visual verification is pending because
the browser-control process cannot start (local Windows sandbox setup error).

### Design workspace UI (2026-10-01)

- [ ] Fix shared form scope and global token previews; replace canvas-dependent breakpoint selection.
- [ ] Hide canvas-only rails/tools in Design, preserve editor selection and centralize design saving.
- [ ] Extract a shared token table/toolbar and domain value adapters before extending the lists.
      Evidence: repeated CRUD markup and type branching; structured shadows currently fall back
      to JSON, partial typography hides inherited fields. Keep parsers/validation in their domains.
- [ ] Compact Colors/Spacing/Radius tables with natural sorting, hierarchy, aliases, previews,
      inherited values and sparse breakpoint resets; Fonts table and selectable Icons grid.
- [ ] Structured Shadow and expandable Typography editors preserve stored formats and aliases.
- [ ] Validate field edits, inheritance, reset, Undo, metadata, responsive context and browser UI.

No token renames, source import workflows, icon CRUD, dependency additions, or model changes.
Existing command ownership, public APIs, storage, sparse breakpoint semantics and codegen remain.
The candidate scan has no size findings: extraction is justified by shared interaction responsibilities,
not file length. Domain CRUD validation stays domain-owned; unrelated refactors remain in backlog.

## Goal

facadeur is a visual design-system editor. Atoms, components, sections, and pages are built on a zoomable canvas. JSON (our DSL) is the source of truth. It produces real DOM elements for the editor and framework code, initially React. The first user is the author; designers may use it as a product later.

## Principles

1. **JSON is the only source of truth.** The editor never changes the DOM directly; it issues commands against JSON. DOM and styles are derived from it.
2. **Web first.** Everything built in the editor must map cleanly to HTML/CSS. Auto Layout (Flexbox) is the default; free positioning is an explicit exception.
3. **Tokens over raw values.** Colors, typography, and spacing come from tokens. Spacing (`gap`, `padding`, `margin`) is currently token-only.
4. **Clear hierarchy.** Pages contain only sections. An instance's structure stays in its master; field values, variants, and layout can be adjusted on the instance node.
5. **Generatable.** Every data-model decision must translate into typed framework code.

## Decisions

### Technology stack

- TypeScript and pnpm workspaces in a monorepo.
- Editor UI: Next.js App Router + React. The canvas content is rendered by our DOM renderer in viewport iframes, not by React.
- Code generation produces React components and CSS Modules; `examples/next` demonstrates the output in a Next.js app.
- Validation: TypeBox schema in `core`, JSON Schema export, and Ajv validation.
- Local operation: `apps/server` holds the authoritative Yjs project state and synchronizes open editors. JSON files under `examples/` remain the explicit source/export format; Save writes confirmed changes there.
- Document state: **Yjs** (CRDT), commands, and `Y.UndoManager`; the local project server persists shared history.

### Packages

- `packages/core` – types, schema, validation, commands, and the `DocumentStore` interface.
- `packages/store-yjs` – Yjs implementation of `DocumentStore` and conversion between the file format and Y document.
- `packages/tokens` – DTCG parser, reference resolution, and CSS custom property output.
- `packages/style-engine` – shared style compilation and live application through `CSSStyleRule`/`insertRule`; its controller is inspired by `style-controller` without importing it at runtime.
- `packages/renderer-dom` – JSON-to-DOM rendering, stable `data-id` per node, and targeted updates.
- `apps/editor` – Next.js + React app (canvas, panels, tools).
- `packages/ui` – generated React design system (components + CSS) from `pnpm codegen`.
- `apps/storybook` – Storybook app that lists all generated CSF3 stories from `@facadeur/ui`.
- `packages/codegen` – shared `generate()` entry point; `engines/react` is initially the default engine for React, CSS Modules, and Storybook stories.

### Kinds and hierarchy

- Each document has a `kind`: `atom`, `component`, `section`, or `page`. The list is configurable (kinds can be merged or split further), with nesting rules for each kind.
- Default rules: atoms contain only primitive nodes; components contain primitive nodes, atoms, and components; sections contain everything except sections and pages. **Pages contain only sections.**
- In the editor, all kinds share a project tree in the left sidebar (Design with tokens and fonts, followed by Atoms, Components, Sections, and Pages). The open document's layer list sits below it. No workspace switcher replaces this tree.

### Primitive nodes

- `frame` (container with Auto Layout), `text`, `image`, and `instance` (a placed component). `slot` may come later.
- The HTML tag is a property (`tag`), such as `section`, `nav`, `a`, `button`, or `input`.

### Instances

- An instance references a component. Field values, variants, and layout are set on the instance node; its structure remains in the master.
- **No detach.** Style rules in the owning document may target local descendants and nested instance roots. These rules remain part of the master; instances do not receive arbitrary inline styles.
- A component is edited **only in its own view**, not where it is placed. Double-clicking an instance may navigate to the component.

### Component properties

- A component defines fields: `name`, `type` (`text`, `richText` later, `image`, `link`, `boolean`, `enum`, `number`, `token`), and `default`.
- Fields can bind to text, attributes, styles, or child-node visibility.
- Instances override values. Code generation turns them into typed props/inputs.

### Variants

- A component defines variant axes (for example, `size: sm|md|lg`, `intent: primary|secondary`). Variants override the style block. States such as `:hover`, `:focus-visible`, and `:disabled` also belong in the style block.

### Code generation output (monorepo)

- `pnpm codegen` writes **`packages/ui`** (components, barrel, token and component CSS) and **`apps/storybook/src/stories/generated`** (CSF3 stories with args from field and variant defaults).
- Generated output is checked in and follows the monorepo structure (`apps/*`, `packages/*`). Storybook is the primary preview; `examples/next` imports `@facadeur/ui`.
- Documents remain sorted by ID so the same catalog always produces the same output.

### Tokens

- Format: W3C DTCG (`$value`, `$type`). An entry is either a token or a token group. References look like `{color.blue.500}`.
- Three levels: primitive, semantic, and component tokens.
- In the editor, tokens become CSS custom properties on a root rule.
- Components can read tokens and override them for nested children through CSS variable cascading. The schema declares which tokens a component reads and sets.
- Themes/modes (dark mode, brands): **not now**; planned as a later improvement.

### Fonts

- Dedicated area for font families, weights, sources (file or Google Fonts), and fallbacks.
- The typography scale uses tokens with per-breakpoint values, producing real `@media` rules.

### Viewports

- Breakpoints are configurable (defaults: mobile 375, tablet 768, desktop 1440).
- **One iframe per viewport frame** so real media queries apply. The iframes are same-origin; the editor accesses them through `contentDocument` (no `postMessage`), behind a thin `FrameHost` interface so isolation remains possible later.
- The style engine runs once per iframe. The editor draws selection and hover outlines **over** the iframes, never inside them.

### Styles

- Each component has its own style block, which references tokens. Variants and breakpoints override it.
- The editor renders preview styles through `style-engine`; the React engine generates CSS Modules. Both translate the same document/style contracts into their own DOM and React selectors.
- No Tailwind in core.

### Data model and local synchronization

- **Flat in-memory model:** nodes are stored in a map by stable ID; children are ordered ID lists (`Y.Map` per node, `Y.Array` for children). Tokens, fonts, and settings are also maps in the Y document.
- **Readable file format:** nested, readable JSON is stored on disk (for Git and agents). It is converted to the flat model on load and back on save. The conversion is lossless and tested.
- **Commands are the only way to change the document.** Each command runs as a Yjs transaction. UI components do not access the Y document directly.
- **The editor communicates only with `DocumentStore`** to read, execute commands, and subscribe to changes. The renderer and style engine react to change events and update only affected content.
- `apps/server` provides the local HTTP API and Yjs WebSocket. It currently runs alongside Next.js on port 3002; a shared browser port is planned for later.
- The current setup supports one local project state and open synchronized editors.
- Presence (cursors and selections) through Yjs Awareness is not implemented yet.

### Editor behavior

- **Layout:** every frame uses Auto Layout by default (direction, gap, padding, alignment, wrap). Free positioning (`position: absolute` relative to the parent frame) is an explicit per-element option.
- **Sizing:** each axis supports `hug` (fit-content), `fill` (flex: 1 or stretch), or `fixed` (px or token), plus min/max. Percentages are an advanced value. Every value can be overridden per breakpoint.
- **Spacing:** tokens only (spacing scale). Free-form values are not allowed for now.
- **Insertion:** keyboard tools (F Frame, T Text, I Image), drag from the component/atom list, click in the selected container to append, or drag to show an insertion line between siblings. “Wrap in Frame” uses Ctrl+Alt+G.
- **Selection:** layer list (always visible, including for nodes without dimensions). Empty frames have a minimum editor size and dashed outline (not exported). Click selects the topmost element in the current context; double-click goes one level deeper; Ctrl+click selects the deepest element; Esc selects the parent. Hover outline shows the click target.
- **Moving:** reorder by dragging on the canvas or in the layer list. **Arrow keys move only freely positioned elements.**
- **Commands:** every change is a command (insert, remove, move, setProp, setStyle, setField, etc.) executed as a Yjs transaction. Undo/Redo uses `Y.UndoManager` (only the current user's changes, including in future multi-user editing).

### Project template

- Project creation can optionally initialize default tokens (colors, spacing scale, radius, shadows), a default font with typography scale, and built-in atoms: `button`, `link`, `input`, and `textarea` (more later, such as `checkbox` and `select`).

### Not yet decided / outside the current local scope

- Cloud/production operation, authentication, and permissions.
- Themes/modes, slots, additional generators, and free-form spacing values.
- Presence and a persistent browser-local offline outbox.
- Later: Playwright visual regression and accessibility checks for atoms.

## Open roadmap

### Collaboration

- [ ] Presence: other users' cursors and selections through Yjs Awareness
- [ ] Accounts, projects, and permissions (Next.js)

### Later

- [ ] MCP integration (planned for later; scope to be defined)
- [ ] Themes/modes, slots, additional generators (Web Components, Angular)
- [ ] Visual regression (Playwright), accessibility checks
