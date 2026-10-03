# facadeur – Plan

> Living document. Active work and open verification items belong here. Completed reports and historical decisions are in [plan-history.md](plan-history.md). The following sections describe current product contracts and architecture; later decisions supersede older log entries.

## Open implementation and verification items

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

- TypeScript, pnpm-Workspaces als Monorepo.
- Editor-UI: Next.js App Router + React. Der Inhalt der Bühne wird **nicht** mit React gerendert, sondern mit unserem DOM-Renderer in viewport-iframes.
- Codegen erzeugt React-Komponenten und CSS Modules; `examples/next` zeigt die Ausgabe in einer Next.js-App.
- Validierung: TypeBox-Schema in `core`, JSON-Schema-Export und Ajv-Prüfung.
- Lokaler Betrieb: `apps/server` hält den autoritativen Yjs-Projektzustand und synchronisiert offene Editoren. JSON-Dateien unter `examples/` bleiben die explizite Quell-/Exportform; Save schreibt bestätigte Änderungen dorthin.
- Dokumentzustand: **Yjs** (CRDT), Commands und `Y.UndoManager`; der lokale Projektserver persistiert die gemeinsame Historie.

### Packages

- `packages/core` – Typen, Schema, Validierung, Befehle (Commands), `DocumentStore`-Schnittstelle.
- `packages/store-yjs` – `DocumentStore`-Implementierung auf Yjs, Umwandlung zwischen Dateiformat und Y-Dokument.
- `packages/tokens` – DTCG-Parser, Referenzauflösung, Ausgabe als CSS Custom Properties.
- `packages/style-engine` – gemeinsame Stilkompilierung und Live-Anwendung über `CSSStyleRule`/`insertRule`; der Controller ist an `style-controller` angelehnt, aber kein Laufzeitpaket-Import.
- `packages/renderer-dom` – JSON zu DOM, stabile `data-id` pro Knoten, gezielte Updates.
- `apps/editor` – Next.js + React App (Bühne, Panels, Werkzeuge).
- `packages/ui` – generiertes React-Designsystem (Komponenten + CSS) aus `pnpm codegen`.
- `apps/storybook` – Storybook-App; listet alle generierten CSF3-Stories aus `@facadeur/ui`.
- `packages/codegen` – gemeinsamer `generate()`-Einstieg; `engines/react` ist zunächst die Standard-Engine für React, CSS Modules und Storybook-Stories.

### Kinds and hierarchy

- Jedes Dokument hat ein `kind`: `atom`, `component`, `section`, `page`. Die Liste ist konfigurierbar (zusammenlegen oder weiter aufteilen), mit Verschachtelungsregeln pro Art.
- Standardregeln: Atome enthalten nur Grundbausteine. Komponenten enthalten Grundbausteine, Atome und Komponenten. Sektionen enthalten alles außer Sektionen und Pages. **Pages enthalten nur Sektionen.**
- Im Editor teilen sich alle Arten einen Projektbaum in der linken Spalte (Design mit Tokens und Schriften, darunter Atoms, Components, Sections, Pages). Die Ebenenliste des offenen Dokuments sitzt darunter. Es gibt keinen Arbeitsbereich-Umschalter, der den Baum ersetzt.

### Primitive nodes

- `frame` (Container mit Auto Layout), `text`, `image`, `instance` (eingesetzte Komponente). Später `slot`.
- Das HTML-Tag ist eine Eigenschaft (`tag`), z. B. `section`, `nav`, `a`, `button`, `input`.

### Instances

- Eine Instanz verweist auf eine Komponente. Am Instanzknoten werden Feldwerte, Varianten und Layout gesetzt; die Struktur bleibt im Master.
- **Kein Detach.** Stilregeln des besitzenden Dokuments dürfen gezielt lokale Nachfahren und verschachtelte Instanz-Roots adressieren; diese Regeln bleiben Teil des Masters, keine freien Inline-Styles auf der Instanz.
- Eine Komponente wird **nur in ihrer eigenen Ansicht** bearbeitet, nicht an der Stelle, wo sie eingesetzt ist. Doppelklick auf eine Instanz kann höchstens zur Komponente springen.

### Component properties

- Eine Komponente definiert Felder: `name`, `type` (`text`, `richText` später, `image`, `link`, `boolean`, `enum`, `number`, `token`), `default`.
- Felder werden an Text, Attribute, Stile oder Sichtbarkeit von Kind-Knoten gebunden.
- Instanzen überschreiben Werte. Codegen macht daraus typisierte Props/Inputs.

### Variants

- Eine Komponente definiert Varianten-Achsen (z. B. `size: sm|md|lg`, `intent: primary|secondary`). Varianten überschreiben Stile des Stil-Blocks. Auch Zustände wie `:hover`, `:focus-visible`, `:disabled` gehören in den Stil-Block.

### Code generation output (monorepo)

- `pnpm codegen` schreibt **`packages/ui`** (Komponenten, Barrel, Token- und Komponenten-CSS) und **`apps/storybook/src/stories/generated`** (CSF3-Stories mit Args aus Feld- und Varianten-Defaults).
- Die Ausgabe ist eingecheckt und folgt dem Monorepo-Muster wie facadeur selbst (`apps/*`, `packages/*`). Storybook ist die primäre Vorschau; `examples/next` importiert `@facadeur/ui`.
- Sortierung nach Dokument-Id bleibt, damit dieselbe Katalogmenge immer dieselbe Ausgabe liefert.

### Tokens

- Format: W3C DTCG (`$value`, `$type`). Ein Eintrag ist ein Token oder eine Token-Gruppe. Referenzen wie `{color.blue.500}`.
- Drei Ebenen: primitive, semantische und Komponenten-Tokens.
- Im Editor werden Tokens zu CSS Custom Properties auf einer Root-Regel.
- Komponenten dürfen Tokens lesen und für verschachtelte Kinder überschreiben (CSS-Variablen-Kaskade). Das Schema deklariert, welche Tokens eine Komponente liest und setzt.
- Themes/Modi (Dark Mode, Marken): **nicht jetzt**, als spätere Verbesserung vorgesehen.

### Fonts

- Eigener Bereich: Familien, Gewichte, Quelle (Datei oder Google Fonts), Fallbacks.
- Typo-Skala als Tokens, Werte pro Breakpoint. Daraus entstehen echte `@media`-Regeln.

### Viewports

- Breakpoints sind konfigurierbar (Standard: mobile 375, tablet 768, desktop 1440).
- **Ein iframe pro Viewport-Frame**, damit echte Media Queries greifen. Die iframes sind same-origin; der Editor greift direkt über `contentDocument` zu (kein `postMessage`), aber immer über eine dünne Schnittstelle (`FrameHost`), damit später Isolation möglich bleibt.
- Die Style-Engine läuft pro iframe. Auswahl- und Hover-Rahmen zeichnet der Editor **über** den iframes, nie in ihnen.

### Styles

- Jede Komponente hat einen eigenen Stil-Block, der Tokens referenziert. Varianten und Breakpoints überschreiben ihn.
- The editor renders preview styles through `style-engine`; die React-Engine erzeugt CSS Modules. Both translate the same document/style contracts into their own DOM and React selectors.
- No Tailwind in core.

### Data model and local synchronization

- **Flaches Modell im Speicher:** Knoten liegen in einer Map nach stabiler ID, Kinder sind geordnete ID-Listen (`Y.Map` pro Knoten, `Y.Array` für Kinder). Tokens, Schriften und Einstellungen liegen ebenfalls als Maps im Y-Dokument.
- **Dateiformat bleibt lesbar:** Auf der Platte wird verschachteltes, gut lesbares JSON gespeichert (für Git und Agenten). Beim Laden wird es in das flache Modell umgewandelt, beim Speichern zurück. Die Umwandlung ist verlustfrei und getestet.
- **Nur Befehle ändern das Dokument.** Jeder Befehl läuft als eine Yjs-Transaktion. Keine direkten Zugriffe auf das Y-Dokument aus UI-Komponenten.
- **Editor spricht nur mit `DocumentStore`** (lesen, Befehl ausführen, Änderungen abonnieren). Renderer und Style-Engine reagieren auf Änderungsereignisse und aktualisieren gezielt.
- `apps/server` stellt die lokale HTTP-API und den Yjs-WebSocket bereit. The server currently runs alongside Next.js on port 3002; a shared browser port is planned for later.
- Das aktuelle Setup unterstützt einen lokalen Projektzustand und offene synchronisierte Editoren.
- Präsenz (Cursor und Auswahl) über Yjs Awareness ist noch nicht implementiert.

### Editor behavior

- **Layout:** Jeder Frame ist standardmäßig Auto Layout (Richtung, gap, padding, Ausrichtung, wrap). Freie Positionierung (`position: absolute` relativ zum Eltern-Frame) ist eine explizite Option pro Element.
- **Größen:** pro Achse `hug` (fit-content), `fill` (flex: 1 bzw. stretch) oder `fixed` (px oder Token), plus min/max. Prozent nur als erweiterter Wert. Jeder Wert kann pro Breakpoint überschrieben werden.
- **Abstände:** nur Tokens (Spacing-Skala). Freie Werte sind vorerst nicht erlaubt.
- **Einfügen:** Werkzeuge mit Tastenkürzeln (F Frame, T Text, I Bild), Drag aus der Komponenten-/Atomliste, Klick in ausgewählten Container hängt ans Ende an, beim Ziehen zeigt eine Einfügelinie die Position zwischen Geschwistern. „In Frame einpacken“ mit Strg+Alt+G.
- **Auswahl:** Ebenenliste (immer, auch für Knoten ohne Größe). Leere Frames haben im Editor eine Mindestgröße mit gestricheltem Rahmen (wird nicht exportiert). Klick wählt das oberste Element im aktuellen Kontext, Doppelklick geht eine Ebene tiefer, Strg+Klick wählt das tiefste Element, Esc geht zum Eltern-Element. Hover-Umriss zeigt das Klickziel.
- **Verschieben:** Umsortieren per Drag in der Bühne oder in der Ebenenliste. **Pfeiltasten verschieben nur frei positionierte Elemente.**
- **Befehle:** Jede Änderung ist ein Befehl (insert, remove, move, setProp, setStyle, setField …), ausgeführt als Yjs-Transaktion. Undo/Redo über `Y.UndoManager` (nur eigene Änderungen, auch später im Mehrbenutzerbetrieb).

### Project template

- Beim Anlegen eines Projekts optional mitinitialisieren: Standard-Tokens (Farben, Spacing-Skala, Radius, Schatten), Standard-Schrift mit Typo-Skala und vordefinierte Atome: `button`, `link`, `input`, `textarea` (weitere später, z. B. `checkbox`, `select`).

### Not yet decided / outside the current local scope

- Cloud-/Produktionsbetrieb, Authentifizierung und Rechte.
- Themes/Modi, Slots, weitere Generatoren und freie Abstandswerte.
- Präsenz und browserlokaler dauerhafter Offline-Outbox.
- Später: Playwright Visual Regression, Accessibility-Prüfungen in Atomen.

## Open roadmap

### Collaboration

- [ ] Präsenz: Cursor und Auswahl anderer Nutzer über Yjs Awareness
- [ ] Accounts, Projekte, Rechte (Next.js)

### Later

- [ ] MCP integration (planned for later; scope to be defined)
- [ ] Themes/Modi, Slots, weitere Generatoren (Web Components, Angular)
- [ ] Visual Regression (Playwright), Accessibility-Checks
