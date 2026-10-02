# facadeur – Plan

> Lebendes Dokument. Coding-Agenten: Lies zuerst **Prinzipien** und **Entscheidungen**, arbeite dann den ersten offenen Meilenstein ab und hake erledigte Punkte (`- [x]`) im selben PR ab. Neue Erkenntnisse oder Abweichungen kommen unter „Entscheidungslog“ ans Ende.

## Refactoring bei der Aufgabenplanung

### Unified token presentation and search (2026-10-02)

- [x] Consolidate group/leaf/selection names in one editor-owned token presentation module.
- [x] Supply saved labels through existing token context; use shared search in pickers and tables.
- [x] Remove redundant namespace/count from group headings; preserve technical refs and unknown values.
- [x] Validate labels, rename/search, duplicate names, dropdown commits and existing editor tests.

Evidence: sidebar token-labels, token-options and TokenValueControl independently build names;
picker, combobox and table search use inconsistent fields. Share presentation in controls and a
generic option search helper in the form layer; retain CSS-value resolution in its current owner.
Preserve refs, values, Undo, token data and staging. Controls/data remains a cohesive domain despite
12 direct files; no unrelated reorganization. No new package or persistence change.
Validation: complete suite passes (692 tests), editor typecheck and ESLint pass; focused tests cover
saved-label updates, group composition, duplicate labels with distinct ids, unknown refs and search.
Browser verifies short group names and reverse-order multiword searches in table/picker. Aliases
and resolved values are included in both searches; technical ids remain visible as secondary text.

### Schema and icon navigation (2026-10-02)

- [x] Extract shared Settings section navigation before adding Schemas to Settings.
- [x] Move Icons from project sidebar to subnav; retain document Schema and legacy surface URLs.
- [x] Validate navigation, schemas and icons with focused tests and editor typecheck.

Boundary: settings tabs have two real consumers (design domains and schema library); colocate their
shared navigation in the existing design UI domain. Preserve schema state, document selection,
design save semantics and staged edits; no persistence or data-model changes.

### Settings-owned viewport management (2026-10-02)

- [x] Remove the redundant viewport disclosure from Layers; retain Settings and stage selection.
- [x] Validate sidebar absence and existing viewport inspector/settings behavior.

Keep LayersPanel cohesive; remove only its viewport-specific mounting/state. Preserve document
layers, settings commands, stage selection and user staging. No data-model or persistence changes.

### Stable chrome during zoom (2026-10-02)

- [x] Exclude header intrinsic width and keep header geometry independent of stage scale.
- [x] Verify stable frame bounds across zoom levels and preserve iframe/padding widths.

Keep stage CSS cohesive: this is a layout defect, not an extraction candidate. Preserve iframe
breakpoint widths, body padding, pan/zoom semantics and user staging. Leave adaptive grid unchanged.
Browser measurements at 20%, 100% and 110% show identical widths, heights and layout offsets for
all six boards; phone width is 415px including padding, and header height remains 28px.
Nine focused zoom/viewport tests and scoped formatting pass. Titles now scale with the artboard;
they no longer counter-scale and change layout at low zoom.

### Exact zoom (2026-10-02)

- [x] Make the percentage readout an exact 100% action and stop rounding near-100 values to 100.
- [x] Snap toolbar zoom across 100%, preserving center anchoring and smooth wheel zoom.

Retain cohesive stage controller and session surface: no new responsibility boundary or extraction
is needed. Preserve fit, pan, zoom limits and stored documents. Validate focused tests and typecheck.

### Intrinsic viewport chrome width (2026-10-02)

- [x] Remove the outer frame's duplicate fixed width; preserve exact iframe breakpoint widths.
- [x] Validate breakpoint rebuilds and padded chrome containment in the browser.

Boundary: viewport board and stage CSS remain cohesive; this is a sizing defect, not a structural
refactor. Let normal intrinsic sizing include chrome padding without coupling JS to CSS values.
Preserve padding, breakpoint semantics, frame lifecycle, selection and all existing staged changes.
Validation: 13 viewport/chrome tests, editor typecheck and scoped lint pass. Browser measurements
confirm all six iframe widths remain exact (375–1760px), with 20px chrome padding and no overflow.

### Product Card workflow (2026-10-02)

- [x] Move the adapter-specific component-token test from core to store-yjs; retain pure Core tests.
- [x] Add Product Card fields, composed Button, image, price, preview data and sparse Compact preset.
- [x] Include it in codegen and verify generated React/Storybook output and rendered variants.
- [x] Exercise API edits, shared editor state, Save and restart on a disposable project copy.

Boundary decision: Core tests currently import its Yjs adapter, creating an undeclared reverse
dependency. Relocate only that adapter behavior test to store-yjs instead of adding a cyclic dev
dependency. Preserve coverage and strengthen actual Undo/Redo assertions. Product Card belongs in
examples; reuse current DSL/renderer/codegen contracts, no new runtime helpers or public API changes.
Retain the cohesive server repository (461 lines); no extension is planned. Preserve all staged
changes and Specimen content. No repository-wide formatting or changes to artboard padding.

Story generation remains cohesive in its existing module: named presets now receive their own
stories and resolved variant preview data; runtime components still exclude sample values.
Validation includes generated-output equality, renderer assertions for both presets, a real
server/two-editor API-Save-restart test and browser inspection of Default and Compact in Storybook.

### Live catalog and green baseline checks (2026-10-02)

- [x] Reconcile the three obsolete schema/preview assertions without changing DSL semantics.
- [x] Add an additive project-wide WebSocket stream, ordering catalog additions before document updates.
- [x] Accept remotely hydrated catalog entries without changing selection, local history or unsent edits.
- [x] Integrate editor transport and verify two tabs, reconnect, dependent instances, Save and full checks.

Refactoring prerequisite: the project adapter currently owns registration and per-document transport;
place multiplexed socket lifecycle in a private domain/project module before integration. Keep the
session coordinator (478 lines) cohesive; remote catalog registration belongs beside session document
registration, not in UI controls. Keep the repository (461 lines) unchanged unless required: HTTP owns
wire publication, not persistence. Preserve current API routes, Core commands, Yjs identity, local Undo,
selection and user changes (including examples/specimen-page.json). No deployment/auth or replacement
imports in this task. Validate focused behavior, full tests, type/lint and an actual two-tab browser run.

Completion: three delegated slices integrated centrally. Project transport multiplexes existing
document providers on one socket; server catalog frames precede dependent edits, including reconnect.
Private session-catalog registration validates batches and hydrates new histories without replacing
existing stores or changing selection, drill state, unsent edits or Undo/Redo. The coordinator remains
cohesive at 493 lines; its registration logic stays in the owning private helper. No transport size
candidates remain. Regenerated schema from existing DSL and UI output for the user's explicit
Specimen child-field override; adjusted preview assertions to honor current data rather than blanks
or historical placeholders. User example source and padding are unchanged.
Validation: all 679 tests in 133 files pass; editor/server typechecks and scoped lint pass. Real
two-session integration covers registration echoes, dependent instances, local Undo, Save and restart
catch-up. Browser on an isolated copy: new component in tab A immediately appeared in tab B without
navigation/reload; API text appeared in both, Save in B succeeded, and a fresh view rendered it.
Stopped isolated preview servers and removed temporary Next configuration changes. Local default
server restarted with the new channel. Remaining local-only/auth/import/schema-library boundaries
are unchanged and documented in project-api.md.
Final validation cleanup: full lint also exposed unused imports/parameters from existing refactors.
Remove imports or prefix unused parameters while preserving signatures and runtime behavior; no
additional decomposition or DSL change. Discard only the generated isolated Next verification cache.
Broader existing gates remain separate: workspace typecheck fails because core's component-token
test imports undeclared store-yjs (10 packages pass, core fails); global Prettier reports widespread
existing formatting deviations.
Do not add a cyclic dev dependency or reformat the repository silently. Editor/server typechecks,
changed-source formatting, ESLint and the complete behavioral test suite are the completion gates
for this scoped change; record those broader follow-ups explicitly.
Final rerun after cleanup: ESLint passes across the repository, all 679 tests pass, changed TS
formatting passes, and the detector retains only the cohesive 493-line session coordinator.

### Global refactor skill (2026-10-02)

- Evidence: the local skill hard-codes Facadeur paths/contracts; its detector assumes a
  monorepo layout and excludes `packages/ui` globally. Its guidelines link resolves incorrectly.
- Boundary: bundle generic guidelines and a project-root-aware detector in the personal
  `$refactor` skill. Keep Facadeur ownership and its existing detector in this repository.
- Scope/contracts: tooling only; retain 450/700-line and 12-direct-file review signals,
  behavior-preserving decisions, existing app behavior, user edits and staging.
- Validation: skill validator, temporary Git/non-Git projects, path/exclusion/threshold
  regression tests, and a read-only scan against this repository.

### Shared Yjs project server and save/edit API (2026-10-02)

- [x] Add durable project document storage with server-owned Y.Docs and validated commands.
- [x] Add local HTTP load/edit/save endpoints and a WebSocket update channel; acknowledge
      edits only after persistence, reject stale revisions and externally changed JSON exports.
- [x] Hydrate editor stores from the server's Yjs history, synchronize remote edits and local
      Undo/Redo, and separate remote transaction origins from local Undo history.
- [x] Load the editor through the project API, save shared snapshots without a file picker,
      expose JSON export explicitly and show connection/persistence failures.
- [x] Verify HTTP/API edits, two-client sync, restart recovery, invalid commands/updates,
      save conflicts, local Undo isolation, and the browser save workflow.

Refactoring decisions: `create-editor-session.ts` (455 lines) remains the session coordinator;
new transport and persistence responsibility belongs in a private `domain/project/` adapter.
The shell directory remains one cohesive UI domain. Extract remote Yjs update observation
within `store-yjs` before adding transport. A new `apps/server` owns independent server
runtime, disk persistence and HTTP/WebSocket lifecycle; it consumes package public APIs.
Preserve existing staged changes, the user's chrome-body padding, JSON/command contracts,
sparse overrides, token resolution and local Undo. Runtime sync state is stored separately
from explicit JSON exports. Initial scope is one local project, bound to loopback; deployment,
authentication and multi-project management are later work.

Completion: delegated store/hydration, durable repository, and sync-provider work, integrated
HTTP transport and editor save centrally. Final scan retains the 478-line session coordinator
and 461-line project repository: each coordinates one lifecycle; persistence and validation
are already colocated private modules. Retain the cohesive shell directory. Existing package
exports and nested JSON remain compatible; the store adds explicit hydration/remote APIs.
The codec's JSON-record cast was corrected as a prerequisite for passing store typechecks.
Browser verification used a disposable copy of examples: Save wrote Card without a picker,
HTTP preview-data edits appeared live, a second tab hydrated the unsaved shared state, and
server outage produced an explicit save error. Reconnection after restart retained the API
edit and Save succeeded. No project example or user padding was modified in this verification.
See [project-api.md](project-api.md) for endpoint contracts and local-only boundaries.
Live catalog additions in other tabs, replacement imports, shared schema-library management,
authentication and a browser-durable offline outbox are intentionally not included.
Existing full-suite deviations: generated schema lacks the component-token label, the
Storybook Media assertion still expects the previous placeholder, and bound-field editing
expects an empty preview value despite the newly staged example data. These are unrelated
schema/test expectation follow-ups; the API implementation does not change their contracts.
Final focused result: 81 API/sync/store/save/shell tests pass. Full-suite result: 662 tests
pass; only those 3 existing deviations fail. Changed
TypeScript paths pass lint and editor/server/store typechecks; all new API/sync tests pass.

### Artboard chrome and component previews (2026-10-01)

- [x] Remove editor-only outer/inner artboard padding and the chrome body/screen insets;
      retain viewport width, title and content alignment.
- [x] Supply missing example preview data, including Card and Sign in, and check presets.
- [x] Verify preview rendering, sparse variant inheritance, viewport settings and browser layout.

Refactoring review: the affected viewport, preview-data and viewport-panel paths have no
size candidates. Retain their cohesive boundaries: frame-host owns iframe presentation,
viewports coordinates boards, viewport-chrome resolves settings, and examples own sample
content. No extraction is needed for these focused corrections. Preserve document layout
padding, runtime field contracts, preview-data overrides, exports and Undo behavior.
Validation: targeted preview/viewport tests, example validation, editor typecheck/lint and
browser checks of standalone and nested components across viewports.

Completion: 14 example datasets added and generated Storybook args refreshed. Legacy chrome
padding is accepted but ignored; padding controls are removed. Fixed board widths and title
ellipsis prevent the header from widening small viewports at low zoom. All 67 targeted tests
pass; changed TypeScript sources pass lint, and before/after scans have no candidates.
Browser: Card and Sign in render across all six viewports, Compact retains sample content,
all chrome/body/screen/iframe padding is zero, and frame widths match at 20% zoom. Screenshot
checked at 52% zoom. Temporary inspector resizing was restored.
Existing validation failures outside this change: `store-yjs/src/codec.ts:58` casts
`ComponentTokenMap` directly to a JSON record; the committed JSON Schema is missing the
component-token `label` property. The schema-sync assertion was excluded from the targeted
passing run after confirming its failure separately; catalog/roundtrip checks pass.

Vor Erweiterungen betroffene Dateien mit `node scripts/refactor-candidates.mjs <Pfade>`
prüfen und die [Checkliste](refactoring-checklist.md) anwenden. Größe löst eine Prüfung aus,
keine automatische Aufteilung. Begründete Refactors innerhalb des aktuellen Auftrags kommen
vor die davon abhängige Feature-Arbeit in den Aufgabenplan. Andere Kandidaten bleiben im Backlog.
Aktuelle Nutzerentscheidungen haben Vorrang vor historischen Architekturentscheidungen unten.

### Nested instance fields (2026-10-01)

Aktueller Nutzerauftrag ersetzt den bisherigen Master-only-Drill-in für die Auswahl:
Instanzen in der Ebenenliste aufklappen und innere Layers im enthaltenden Dokument auswählen.
Innere Layers erlauben ausschließlich lokale Feldwerte, keine Struktur-, Style-, Schema- oder
Variantenänderungen am Master. Master-Bearbeitung bleibt eine explizite Aktion.

- [x] Auswahl/virtuellen Baum in einem fokussierten Editor-Domain-Modul kapseln, bevor
      Session, Layers und Stage erweitert werden. Evidenz: lokale Node-IDs und Render-Adressen
      sind bisher absichtlich getrennt und beenden die Auswahl an der Instanzgrenze. Session
      bleibt Koordinator; wiederholte Resolver-/Baumlogik gehört in `nested-selection`.
- [x] Sparse `childFields` auf Instanzen ergänzen: bestehende `fields` adressieren nur den
      öffentlichen Contract; nicht exponierte innere Input-Felder sind damit nicht lokal
      überschreibbar. Pfade enthalten Instanz-IDs, keine vollständigen Kopien der Master.
      Feld-only-Command, Reset und Validierung erhalten atomare Ablehnung, Undo und Roundtrip.
- [x] Renderer, Varianten, Yjs und Codegen unterstützen denselben Contract. Gemeinsame
      portable Pfad-/Overlay-Semantik gehört zu Core; DOM-/Code-Ausgabe bleibt beim Adapter.
      Große Schema-/Flat-Dateien bleiben kohäsiv, neue Overlay-Verantwortung wird separat geführt.
- [x] Inspector zeigt Herkunft, vererbte Werte und Reset; verschachtelte Auswahl hat keine
      Style-/Struktur-/Varianten-Controls. Bestehende Formcontrols werden wiederverwendet.
- [x] Auswahlpfad im URL abbilden; Kollisionen gleicher innerer Node-IDs vermeiden.
- [x] Regressionstests für Isolation zweier Instanzen und Master, tiefe Pfade, Bindings,
      aktive Varianten, Reset, Undo/Redo, Persistenz und Codegen; Browser-Prüfung des Specimen.

Unabhängige Größen-/Organisationskandidaten bleiben im Backlog. Die vorhandenen großen
Stage-/Session-Koordinatoren erhalten nur Integrationspunkte und Guards; keine neue
Resolver-Verantwortung. Änderungen am Datenmodell sind auf die begründete optionale
Feld-Override-Map begrenzt, ohne Migration bestehender Dokumente.

Abschluss: `nested-selection/` trennt Adressauflösung, Feldkontext und virtuelle Baumprojektion;
`InstanceFieldOverride` wird von direktem und verschachteltem Inspector gemeinsam genutzt.
Core besitzt die gemeinsame Pfad-/Merge-Semantik, Codegen einen privaten Transport-Emitter.
Schema/Flat und die Ausgabe-/Session-Koordinatoren bleiben wegen ihrer kohäsiven Verträge erhalten.
Der Yjs-Codec ist in Encode, Decode und gemeinsame Yjs-Helfer getrennt; `codec.ts` behält
`patchDocument`, `readDocument` und `ensureDocumentMaps`. Roundtrip und Undo bleiben unverändert.
`packages/tokens/src/resolve.ts` bleibt ein zusammenhängender Auflösungs- und Ausgabealgorithmus.
Die Content-Inspector-Dateien gehören weiterhin zu einer gemeinsamen UI-Domain.
Validierung: 116 Testdateien / 569 Tests, Typechecks der fünf betroffenen Pakete,
Lint und Formatierung der geänderten Quellen, generierter React-Code semantisch geprüft.
Browser: lokale Label-/Placeholder-Overrides in allen drei Viewports, andere Inputs unverändert,
Reset auf vererbte Werte; Teständerungen zurückgesetzt.

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

### Refactoring-Backlog

Team-Pass (2026-10-01): Validation, Commands und Variants fachlich extrahieren.
Abschlusskriterien: öffentliche Exports/Entry Points erhalten; keine Schema-, API- oder
Verhaltensänderungen; keine Runtime-Zyklen; bestehende Contracts-, Command-/Undo-, Varianten-,
Roundtrip- und Codegen-Tests bestehen. Gemeinsame Integration und Browser-Smoke-Check durch
den Teamleiter nach den drei unabhängigen Extraktionen. Andere Kandidaten bleiben außerhalb
dieses Passes.

Organisationsentscheidung vom 2026-10-01: Core wird nach `document/`, `commands/`, `variants/`
und `styles/` gegliedert. Private Helfer bleiben beim jeweiligen Domain-Modul;
paketübergreifende Wiederverwendung erfolgt über `@facadeur/core`, ohne Deep Imports oder
neues Utility-Paket. Der öffentliche Entry Point und alle bestehenden Contracts bleiben erhalten.
`token-tree.ts` bleibt ein einzelnes Modul; `validate.ts` ist nach fachlicher Extraktion eine Compatibility-Fassade.
Die unten offenen Größen-Kandidaten gelten nach dem Verschieben weiterhin: Organisation
allein löst keine übergroßen Verantwortlichkeiten.

In diesem Pass umgesetzte fachliche Extraktionen: Validierung nach lokalen Definitionen, Baum-/Dokumentregeln
und katalogübergreifenden Contracts; Commands nach Dispatcher und Mutation-Familien;
Varianten nach Auflösung/Anwendung und Ableitung von Deltas. Dabei gemeinsame Helfer erst
nach belegter Wiederverwendung extrahieren und bidirektionale Varianten-/Roundtrip-Tests erhalten.

- **Validation:** `validation/schema.ts` übernimmt den Schema-Eingang, `assertions.ts`
  lokale Assertions, `tree.ts` Baum-/Library-Regeln und `definitions.ts` Definitionen.
  `catalog-exposed.ts` und `data-contracts.ts` kapseln übergreifende Contracts;
  `catalog.ts` koordiniert die Katalogprüfung. `validate.ts` erhält die bisherigen Exports.
- **Commands:** `commands.ts` behält Cloning, Dispatch, Canonicalization und finale Validierung.
  `types.ts` enthält Command-Typen; `structure.ts`, `node.ts`, `definitions.ts` und `design.ts`
  enthalten die Mutation-Familien. Node-/Value-/Token-Read-Helfer sind nur bei belegter
  Wiederverwendung geteilt. Atomare Ablehnung und der Undo-Vertrag bleiben erhalten.
- **Variants:** `resolve.ts` übernimmt Auflösung/Anwendung, `derive.ts` die Preset-Ableitung
  und `derive-node.ts` Node-Deltas. `style-layers.ts` enthält den tatsächlich gemeinsam
  verwendeten Layer-Helfer. `variants.ts` erhält den bisherigen Entry Point.

Abgeschlossen: 530 Tests in 108 Dateien, Core-/Editor-Typechecks, Core-Lint und Formatprüfung
bestanden. Browser-Smoke-Check mit Layout-Änderung und Undo bestanden. Alle 131 ursprünglichen
Funktionskörper erhalten; keine fehlenden Runtime-Imports oder Runtime-Zyklen. Öffentliche
API, Schema und Datenmodell unverändert.

Dependency-Grenzen: Validation darf Variants verwenden, nicht umgekehrt; Commands dürfen
Validation verwenden, nicht umgekehrt. `styles/style-block.ts` verwendet `FlatDocument` nur
als Typ, weil `document/flat.ts` Style-Canonicalization benötigt. Token-Tree bleibt unabhängig
von FlatDocument. Schema, Flat-Konvertierung, Style-Block und Token-Tree werden vorerst
beibehalten, solange keine konkrete Verantwortungsgrenze den Roundtrip-Risiken gegenübersteht.

Erster Größen-Scan vom 2026-10-01. Offene Einträge sind **Prüfaufträge**, keine beschlossenen
Refactors. Vor Umsetzung konkrete Verantwortlichkeiten, Grenzen und Verhaltenstests festlegen.
Bei zusammenhängendem Code darf die Entscheidung ausdrücklich „beibehalten“ lauten.

| Status                    | Kandidat                                                  | Ergebnis / nächste Prüfung                                                                          |
| ------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Erledigt                  | `packages/core/src/validate.ts`                           | Schema, lokale Regeln und Catalog-Contracts extrahiert; Exports und Invarianten erhalten.           |
| Erledigt                  | `packages/core/src/commands/commands.ts`                  | Kleiner Dispatcher und Mutation-Familien; atomare Validierung und Undo-Vertrag erhalten.            |
| Erledigt                  | `packages/store-yjs/src/codec.ts`                         | Encode, Decode und gemeinsame Yjs-Helfer extrahiert; öffentliche Funktionen bleiben in `codec.ts`.   |
| Erledigt                  | `packages/core/src/variants/variants.ts`                  | Resolver, Preset-Ableitung und Node-Deltas getrennt; Sparse-Override-Verhalten erhalten.            |
| Erledigt                  | `packages/core/src/document/schema.ts`                    | Schemafamilien unter `document/schemas/`; `schema.ts` behält die öffentlichen Exports.              |
| Erledigt                  | `apps/editor/src/ui/stage/StageCanvas.tsx`                | Zeigerinteraktion und Board-Mount liegen in `stage/canvas/`; `StageCanvas` bleibt die Komponente. |
| Erledigt                  | `packages/core/src/token-tree.ts`                         | Werteprüfungen, Lesen und Baummutation getrennt; öffentliche Funktionen bleiben in `token-tree.ts`. |
| Erledigt                  | `packages/codegen-react/src/component/render.ts`          | Ereignisse, Datenausdrücke, Bindings und Instanzen extrahiert; `renderNode` bleibt öffentlich.       |
| Erledigt                  | `packages/core/src/document/flat.ts`                      | Klonen und Baumabfragen unter `document/flat/`; Umwandlung bleibt in `flat.ts`.                     |
| Erledigt                  | `packages/core/src/styles/style-block.ts`                 | Parser nach `style-block-parse.ts`; Canonicalize, Prune und Contract bleiben zusammen.             |
| Erledigt                  | `packages/tokens/src/resolve.ts`                          | CSS-Ausgabe nach `css-properties.ts`; `loadTokens` und die öffentlichen Exports bleiben in `resolve.ts`. |
| Erledigt                  | `apps/editor/src/ui/sidebar/layers/ProjectTree.tsx`       | Zeilen und Kontextmenü in `AssetRows.tsx`; Suche und Anlegen bleiben im Baum.                       |
| Erledigt                  | `apps/editor/src/domain/session/create-editor-session.ts` | Katalog, Snapshot und Befehle liegen daneben; `createEditorSession` bleibt der Koordinator.        |
| Erledigt                  | `packages/codegen-react/src/component/catalog.ts`         | Feldtypen und Defaults nach `catalog-fields.ts`; `assignCatalog` bleibt der Katalogdurchlauf.        |
| Erledigt                  | `apps/editor/src/ui/sidebar/design/tokens/TokensDomainPanel.tsx` | Zeile, Vorschau und Breakpoint-Helfer extrahiert; Token-Cluster liegt unter `design/tokens/`. |
| Beibehalten nach Refactor | `packages/renderer-dom/src/render.ts`                     | Rendering/Reconciliation bleibt zusammen; Resolution, Presentation und Contracts wurden extrahiert. |

`apps/editor/src/domain` ist nach `schema/`, `edits/`, `viewport/`, `selection/`, `navigation/`
und `assets/` gruppiert. Token-Panels liegen unter `sidebar/design/tokens/`. Komponenten-Editoren
des Content-Inspectors liegen unter `properties/content/component/`. `controls/data` und `shell`
bleiben flach, jeweils eine UI-Domäne. Keine `shared/`- oder `utils`-Ordner. Der DOM-Renderer
behält Paint und Kind-Abgleich zusammen, weil beide sich gegenseitig aufrufen.

## Ziel

facadeur ist ein visueller Design-System-Editor. Atome, Komponenten, Sektionen und Pages werden auf einer zoombaren Bühne gebaut, ähnlich wie in Figma. Die Quelle der Wahrheit ist JSON (unsere DSL). Daraus werden echte DOM-Elemente gerendert und später Framework-Code generiert (zuerst React für Next.js). Zielgruppe ist zuerst der Autor selbst, später Designer als Produkt.

## Prinzipien

1. **JSON ist die einzige Quelle der Wahrheit.** Der Editor ändert nie direkt das DOM, sondern führt Befehle auf dem JSON aus. DOM und Stile werden daraus abgeleitet.
2. **Web zuerst.** Alles, was im Editor gebaut wird, muss sich sauber als HTML/CSS ausdrücken lassen. Auto Layout (Flexbox) ist Standard, freie Positionierung ist eine bewusste Ausnahme.
3. **Tokens statt Zahlen.** Farben, Typografie und Abstände kommen aus Tokens. Abstände (gap, padding, margin) sind vorerst **nur** über Tokens erlaubt.
4. **Klare Hierarchie.** Pages bestehen nur aus Sektionen. Instanzen sind nur über Felder und Varianten anpassbar.
5. **Generierbar.** Jede Entscheidung im Datenmodell muss sich in typisierten Framework-Code übersetzen lassen.

## Entscheidungen

### Tech-Stack

- TypeScript, pnpm-Workspaces als Monorepo.
- Editor-UI: Vite + React. Der Inhalt der Bühne wird **nicht** mit React gerendert, sondern mit unserem eigenen Renderer.
- Next.js ist Ausgabeziel (Codegen) und später eventuell Produkthülle (Accounts, Cloud, Marketing) mit eingebettetem Editor, aber nicht die Basis des Editors.
- Validierung: Schema in `core` (TypeBox oder Zod), JSON-Schema-Export für Agenten und Ajv.
- Speicherung: JSON-Dateien im Repo (Git). Kein Backend vorerst.
- Dokumentzustand im Editor: **Yjs** (CRDT) als lokaler Store von Anfang an, vorerst ohne Server. Undo/Redo über den `Y.UndoManager`. Später kommt nur noch ein Sync-Server dazu (siehe „Kollaboration“).

### Pakete

- `packages/core` – Typen, Schema, Validierung, Befehle (Commands), `DocumentStore`-Schnittstelle.
- `packages/store-yjs` – `DocumentStore`-Implementierung auf Yjs, Umwandlung zwischen Dateiformat und Y-Dokument.
- `packages/tokens` – DTCG-Parser, Referenzauflösung, Ausgabe als CSS Custom Properties.
- `packages/style-engine` – Live-Stile über `CSSStyleRule`/`insertRule`, basiert auf `mmilad/style-controller` (siehe unten).
- `packages/renderer-dom` – JSON zu DOM, stabile `data-id` pro Knoten, gezielte Updates.
- `apps/editor` – Vite + React App (Bühne, Panels, Werkzeuge).
- `packages/ui` – generiertes React-Designsystem (Komponenten + CSS) aus `pnpm codegen`.
- `apps/storybook` – Storybook-App; listet alle generierten CSF3-Stories aus `@facadeur/ui`.
- `packages/codegen-react` – React-Komponenten, CSS und Storybook-Stories aus den Dokumenten.

### Arten (kinds) und Hierarchie

- Jedes Dokument hat ein `kind`: `atom`, `component`, `section`, `page`. Die Liste ist konfigurierbar (zusammenlegen oder weiter aufteilen), mit Verschachtelungsregeln pro Art.
- Standardregeln: Atome enthalten nur Grundbausteine. Komponenten enthalten Grundbausteine, Atome und Komponenten. Sektionen enthalten alles außer Sektionen und Pages. **Pages enthalten nur Sektionen.**
- Im Editor teilen sich alle Arten einen Projektbaum in der linken Spalte (Design mit Tokens und Schriften, darunter Atoms, Components, Sections, Pages). Die Ebenenliste des offenen Dokuments sitzt darunter. Es gibt keinen Arbeitsbereich-Umschalter, der den Baum ersetzt.

### Grundbausteine

- `frame` (Container mit Auto Layout), `text`, `image`, `instance` (eingesetzte Komponente). Später `slot`.
- Das HTML-Tag ist eine Eigenschaft (`tag`), z. B. `section`, `nav`, `a`, `button`, `input`.

### Instanzen

- Eine Instanz verweist auf eine Komponente und darf **nur** Feldwerte und Varianten überschreiben.
- **Kein Detach**, keine Stil-Overrides einzelner Kind-Elemente.
- Eine Komponente wird **nur in ihrer eigenen Ansicht** bearbeitet, nicht an der Stelle, wo sie eingesetzt ist. Doppelklick auf eine Instanz kann höchstens zur Komponente springen.

### Variable Felder (Component Properties)

- Eine Komponente definiert Felder: `name`, `type` (`text`, `richText` später, `image`, `link`, `boolean`, `enum`, `number`, `token`), `default`.
- Felder werden an Text, Attribute, Stile oder Sichtbarkeit von Kind-Knoten gebunden.
- Instanzen überschreiben Werte. Codegen macht daraus typisierte Props/Inputs.

### Varianten

- Eine Komponente definiert Varianten-Achsen (z. B. `size: sm|md|lg`, `intent: primary|secondary`). Varianten überschreiben Stile des Stil-Blocks. Auch Zustände wie `:hover`, `:focus-visible`, `:disabled` gehören in den Stil-Block.

### Codegen-Ausgabe (Monorepo)

- `pnpm codegen` schreibt **`packages/ui`** (Komponenten, Barrel, Token- und Komponenten-CSS) und **`apps/storybook/src/stories/generated`** (CSF3-Stories mit Args aus Feld- und Varianten-Defaults).
- Die Ausgabe ist eingecheckt und folgt dem Monorepo-Muster wie facadeur selbst (`apps/*`, `packages/*`). Storybook ist die primäre Vorschau; `examples/next` importiert `@facadeur/ui`.
- Sortierung nach Dokument-Id bleibt, damit dieselbe Katalogmenge immer dieselbe Ausgabe liefert.

### Tokens

- Format: W3C DTCG (`$value`, `$type`). Ein Eintrag ist ein Token oder eine Token-Gruppe. Referenzen wie `{color.blue.500}`.
- Drei Ebenen: primitive, semantische und Komponenten-Tokens.
- Im Editor werden Tokens zu CSS Custom Properties auf einer Root-Regel.
- Komponenten dürfen Tokens lesen und für verschachtelte Kinder überschreiben (CSS-Variablen-Kaskade). Das Schema deklariert, welche Tokens eine Komponente liest und setzt.
- Themes/Modi (Dark Mode, Marken): **nicht jetzt**, als spätere Verbesserung vorgesehen.

### Schriften

- Eigener Bereich: Familien, Gewichte, Quelle (Datei oder Google Fonts), Fallbacks.
- Typo-Skala als Tokens, Werte pro Breakpoint. Daraus entstehen echte `@media`-Regeln.

### Viewports

- Breakpoints sind konfigurierbar (Standard: mobile 375, tablet 768, desktop 1440).
- **Ein iframe pro Viewport-Frame**, damit echte Media Queries greifen. Die iframes sind same-origin; der Editor greift direkt über `contentDocument` zu (kein `postMessage`), aber immer über eine dünne Schnittstelle (`FrameHost`), damit später Isolation möglich bleibt.
- Die Style-Engine läuft pro iframe. Auswahl- und Hover-Rahmen zeichnet der Editor **über** den iframes, nie in ihnen.

### Stile

- Jede Komponente hat einen eigenen Stil-Block, der Tokens referenziert. Varianten und Breakpoints überschreiben ihn.
- Kein Tailwind im Kern. Generatoren erzeugen CSS (später optional CSS Modules o. Ä.).

### Datenmodell und Kollaboration

- **Flaches Modell im Speicher:** Knoten liegen in einer Map nach stabiler ID, Kinder sind geordnete ID-Listen (`Y.Map` pro Knoten, `Y.Array` für Kinder). Tokens, Schriften und Einstellungen liegen ebenfalls als Maps im Y-Dokument.
- **Dateiformat bleibt lesbar:** Auf der Platte wird verschachteltes, gut lesbares JSON gespeichert (für Git und Agenten). Beim Laden wird es in das flache Modell umgewandelt, beim Speichern zurück. Die Umwandlung ist verlustfrei und getestet.
- **Nur Befehle ändern das Dokument.** Jeder Befehl läuft als eine Yjs-Transaktion. Keine direkten Zugriffe auf das Y-Dokument aus UI-Komponenten.
- **Editor spricht nur mit `DocumentStore`** (lesen, Befehl ausführen, Änderungen abonnieren). Renderer und Style-Engine reagieren auf Änderungsereignisse und aktualisieren gezielt.
- **Später:** eigener Sync-Dienst neben Next.js (Hocuspocus o. Ä., oder Liveblocks/PartyKit), da Serverless-Hosting wie Vercel keine WebSockets offenhält. Präsenz (Cursor, Auswahl) über Yjs Awareness.

### Editor-Verhalten

- **Layout:** Jeder Frame ist standardmäßig Auto Layout (Richtung, gap, padding, Ausrichtung, wrap). Freie Positionierung (`position: absolute` relativ zum Eltern-Frame) ist eine explizite Option pro Element.
- **Größen:** pro Achse `hug` (fit-content), `fill` (flex: 1 bzw. stretch) oder `fixed` (px oder Token), plus min/max. Prozent nur als erweiterter Wert. Jeder Wert kann pro Breakpoint überschrieben werden.
- **Abstände:** nur Tokens (Spacing-Skala). Freie Werte sind vorerst nicht erlaubt.
- **Einfügen:** Werkzeuge mit Tastenkürzeln (F Frame, T Text, I Bild), Drag aus der Komponenten-/Atomliste, Klick in ausgewählten Container hängt ans Ende an, beim Ziehen zeigt eine Einfügelinie die Position zwischen Geschwistern. „In Frame einpacken“ mit Strg+Alt+G.
- **Auswahl:** Ebenenliste (immer, auch für Knoten ohne Größe). Leere Frames haben im Editor eine Mindestgröße mit gestricheltem Rahmen (wird nicht exportiert). Klick wählt das oberste Element im aktuellen Kontext, Doppelklick geht eine Ebene tiefer, Strg+Klick wählt das tiefste Element, Esc geht zum Eltern-Element. Hover-Umriss zeigt das Klickziel.
- **Verschieben:** Umsortieren per Drag in der Bühne oder in der Ebenenliste. **Pfeiltasten verschieben nur frei positionierte Elemente.**
- **Befehle:** Jede Änderung ist ein Befehl (insert, remove, move, setProp, setStyle, setField …), ausgeführt als Yjs-Transaktion. Undo/Redo über `Y.UndoManager` (nur eigene Änderungen, auch später im Mehrbenutzerbetrieb).

### Projektvorlage

- Beim Anlegen eines Projekts optional mitinitialisieren: Standard-Tokens (Farben, Spacing-Skala, Radius, Schatten), Standard-Schrift mit Typo-Skala und vordefinierte Atome: `button`, `link`, `input`, `textarea` (weitere später, z. B. `checkbox`, `select`).

### Außerhalb des Umfangs (vorerst)

- MCP-Server: nur dokumentieren, nicht bauen.
- Themes/Modi, Slots, freie Abstandswerte, Cloud.
- Sync-Server und Mehrbenutzer (das Datenmodell ist aber schon darauf ausgelegt).
- Später: Playwright Visual Regression, Accessibility-Prüfungen in Atomen.

## Bekannte Bugs in style-controller (bei Übernahme beheben)

- `children`, die an `Rule` übergeben werden, werden nie eingefügt.
- `delete` prüft `if (indexInChildren)`: Index 0 wird übersprungen, bei -1 wird die letzte Regel gelöscht.

## Meilensteine

### M0 – POC (erledigt)

- [x] JSON-DSL, Renderer zu echtem DOM, zoombare/pannbare Bühne, Auswahl mit Sidebar (PR #1)
- [x] Hintergrund-Raster bewegt sich mit Pan/Zoom

### M1 – Fundament

- [x] Monorepo mit pnpm-Workspaces, TypeScript, Vite, ESLint/Prettier, Vitest
- [x] POC nach `packages/editor` bzw. `packages/renderer-dom` überführen (oder als Referenz unter `legacy/` behalten)
- [x] `core`: Typen und Schema für Dokument, Knoten (`frame`, `text`, `image`, `instance`), `kind`, Verschachtelungsregeln
- [x] `core`: flaches Modell (Knoten-Map nach ID, Kinder als ID-Listen) und verlustfreie Umwandlung von/zu verschachteltem Dateiformat, mit Tests
- [x] `core`: `DocumentStore`-Schnittstelle und Befehls-Typen
- [x] `store-yjs`: Yjs-Implementierung von `DocumentStore`, Befehle als Transaktionen, `Y.UndoManager`, Tests
- [x] JSON-Schema-Export und Validierung (Ajv), Beispiele unter `examples/` validieren im Test
- [x] `docs/dsl.md` auf das neue Modell aktualisieren
- [x] CI (GitHub Actions): Lint, Typecheck, Tests

### M2 – Tokens und Schriften

- [x] `tokens`: DTCG laden, Gruppen, Referenzen auflösen, Zyklen erkennen
- [x] Ausgabe als CSS Custom Properties
- [x] Schriften-Modell (Familien, Quellen, Fallbacks) und Typo-Skala mit Breakpoint-Werten zu `@media`
- [x] Standard-Token-Set und Standard-Schrift als Vorlage

### M3 – Style-Engine und Renderer

- [x] `style-engine` auf Basis von style-controller, Bugs beheben, Tests
- [x] Stil-Block pro Komponente mit Varianten, Zuständen und Breakpoint-Overrides
- [x] Komponenten setzen/überschreiben Tokens für Kinder
- [x] `renderer-dom`: gezielte Updates pro Knoten statt Neurendern

### M4 – Viewports mit iframes

- [x] `FrameHost`-Schnittstelle, ein iframe pro Viewport, same-origin
- [x] Breakpoints konfigurierbar, Frames nebeneinander auf der Bühne
- [x] Auswahl-/Hover-Overlays über den iframes, korrekt bei Zoom/Pan

### M5 – Editor-Grundgerüst

- [x] React-Shell: Bühne, Ebenenliste, Eigenschaften-Panel, Asset-Liste (Atome/Komponenten/Sektionen/Pages), Token- und Schriften-Bereich
- [x] Befehle über `store-yjs` anbinden, Undo/Redo (Strg+Z / Strg+Shift+Z)
- [x] Renderer und Style-Engine abonnieren Änderungen des Stores und aktualisieren gezielt
- [x] Laden/Speichern der JSON-Dateien (File System Access API oder kleiner Dev-Server)
- [x] Arbeitsbereiche pro `kind`

### M6 – Bauen im Editor

- [x] Einfüge-Werkzeuge (F/T/I), Drag aus Asset-Liste, Einfügelinie
- [x] Auswahl-Logik (Klick, Doppelklick, Strg+Klick, Esc, Hover)
- [x] Umsortieren per Drag (Bühne und Ebenenliste), In Frame einpacken
- [x] Auto-Layout-Panel (Richtung, gap/padding nur Tokens, Ausrichtung, wrap)
- [x] Größen: hug/fill/fixed pro Achse, min/max, pro Breakpoint
- [x] Freie Positionierung als Option, Pfeiltasten nur dafür
- [x] Leere Frames mit Mindestgröße im Editor

### M7 – Komponenten-Features

- [x] Variable Felder definieren (Typ, Default) und an Text/Attribute/Stile/Sichtbarkeit binden
- [x] Varianten-Achsen definieren und bearbeiten
- [x] Instanzen: nur Feld- und Variantenwerte überschreibbar, kein Detach, Bearbeiten nur in eigener Ansicht
- [x] Pages nur aus Sektionen (Regeln im Editor durchsetzen)
- [x] Vordefinierte Atome `button`, `link`, `input`, `textarea` in der Projektvorlage

### M8 – Codegen React (Next.js)

- [x] Komponenten zu React-Komponenten mit typisierten Props aus Feldern und Varianten
- [x] Tokens und Schriften zu CSS, Stil-Blöcke zu CSS
- [x] Beispiel-Next.js-Projekt, das die Ausgabe nutzt

### Editor-Navigation

- [x] Linke Spalte: ein Projektbaum (Tokens, Schriften, Atoms, Components, Sections, Pages) oben, Ebenenliste des offenen Dokuments unten; Suche und „Neu anlegen“ pro Art

### Später – Kollaboration

- [ ] Sync-Dienst (Hocuspocus o. Ä.) neben Next.js, Persistenz der Y-Dokumente
- [ ] Präsenz: Cursor und Auswahl anderer Nutzer über Yjs Awareness
- [ ] Live-Updates von Tokens und Schriften in allen offenen Editoren
- [ ] Accounts, Projekte, Rechte (Next.js)

### Später

- [ ] MCP-Server (zuerst nur Doku unter `docs/mcp.md`)
- [ ] Themes/Modi, Slots, weitere Generatoren (Web Components, Angular)
- [ ] Visual Regression (Playwright), Accessibility-Checks

## Entscheidungslog

- 2026-09-24: Grundsatzentscheidungen oben festgehalten (iframes pro Viewport, Auto Layout als Standard, Abstände nur über Tokens, Instanzen ohne Detach, Vite + React statt Next.js für den Editor).
- 2026-09-24: Yjs von Anfang an als lokaler Store mit flachem Datenmodell, damit Echtzeit-Zusammenarbeit später nur einen Sync-Server braucht. Sync-Dienst läuft getrennt von Next.js/Vercel.
- 2026-09-24: Schema in `core` mit TypeBox (Draft 2020-12), Validierung mit Ajv. TypeBox ist das Schema, das wir exportieren; ein zweites Zod-Modell würde nur driften.
- 2026-09-24: POC liegt in `packages/renderer-dom` und `packages/editor` (Vite, noch ohne React). Die React-Shell bleibt M5. Die Bühne (Pan/Zoom, Raster, Auswahl) ist die bisherige, auf das neue Dokument umgestellt.
- 2026-09-24: Dateiformat hat ein verschachteltes `root`. Das Wurzel-Frame ist die Arbeitsfläche des Dokuments; Verschachtelungsregeln gelten für alles darunter. Eine Page enthält deshalb als Kinder nur Sektions-Instanzen, das Wurzel-Frame selbst ist der Canvas und kein Inhalt. „Atome enthalten nur Grundbausteine“ heißt: `frame`, `text`, `image`, keine Instanzen. Instanzen sind das Mittel, um Atome und Komponenten einzusetzen.
- 2026-09-24: Felder und Varianten-Achsen stehen im Schema an Atom und Komponente (der Button ist ein Atom und braucht `label`, `tone`, `size`). Instanzen haben keine Kinder, keine Attribute und keinen Stil; nur `layout` plus Feld- und Variantenwerte. Die alte Sign-in-Karte mit Kindern an der Instanz ist eine eigene Komponente `sign-in`.
- 2026-09-24: `style` an Primitiv-Knoten ist Daten (`setStyle`). Anwenden macht die Style-Engine in M3. Die Specimen-Bühne zeigt Varianten über `data-variant-*`, damit der POC-Look ohne Style-Engine bleibt. Abstände (gap, padding, margin) fehlen im Schema, damit keine freien Zahlen die Token-Regel unterlaufen. Absolute Platzierung (`x`, `y`, `width`, `height`) ist drin, weil die Bühne und die freie Position sie brauchen.
- 2026-09-24: `undo`/`redo` gehören zur `DocumentStore`-Schnittstelle, damit die UI den `Y.UndoManager` nicht anfasst. Nur Transaktionen mit Origin `facadeur` landen im Undo-Stack (`captureTimeout: 0`, ein Befehl = ein Schritt). Laden ist nicht rückgängig zu machen. `tokens` und `fonts` sind leere Y.Maps, reserviert für M2.
- 2026-09-24: Standard-Kinds sind `atom | component | section | page`. `defaultNestingRules` ist austauschbar; `createDocumentSchema({ kinds })` baut ein Schema für eine andere Liste. Das committete JSON Schema zählt die vier Standard-Kinds.
- 2026-09-24: M2. Der DTCG-Baum liegt im Dokument unter `tokens`. Ein Objekt mit `$value` ist ein Token, sonst eine Gruppe. `$type` und `facadeur.tier` werden von der Gruppe vererbt; ein eigenes `$type` oder `tier` gewinnt. Referenzen bleiben im Y-Dokument unaufgelöst, CSS macht daraus `var(--…)`. Der Store lehnt Zyklen und fehlende Ziele ab, bevor die Transaktion schreibt.
- 2026-09-24: CSS-Name ist `--` plus Pfadsegmente, verbunden mit `-` (`color.blue.500` → `--color-blue-500`). Segmente sind `[a-z0-9]+`, damit jeder Pfad genau einen Namen hat. Typografie wird pro Feld aufgefächert, das Feld mit doppeltem Bindestrich (`--type-body--font-size`): ein Token-Pfad kann `--` nicht enthalten, also kollidiert das Feld nicht mit einem anderen Token.
- 2026-09-24: Werte pro Breakpoint stehen in `$extensions.facadeur.breakpoints` (gültiges DTCG, andere Werkzeuge ignorieren die Extension). `$value` ist die Basis. Der Breakpoint mit der kleinsten `minWidth` ist diese Basis und erzeugt keine `@media`-Regel. Seine Breite ist die Viewport-Breite des Frames (Standard mobile 375), keine Query-Schwelle — eine Query ab 375 würde schmalere Phones von der Basis abschneiden. Größere Breakpoints erzeugen `@media (min-width: Npx)`. Fehlen Breakpoints im Dokument, gelten mobile 375, tablet 768, desktop 1440.
- 2026-09-24: Schriften sind eine eigene Liste: id, CSS-Familie, Gewichte, Quelle `file` oder `google`, Fallbacks. Der letzte Fallback muss eine generische Familie sein. Daraus werden `--font-<id>`, `@font-face` oder ein Google-`@import`. `{font.sans}` verweist auf die Schrift, nicht auf ein DTCG-Token; ein Token darf denselben Pfad nicht belegen.
- 2026-09-24: Die Abstandsskala ist ein 4px-Raster. Der Name ist der Schritt (`space.4` = 16px), mit den üblichen Sprüngen nach 24px: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24. `space.gap`, `space.inset` und `space.stack` sind die Aliase für gap, padding und margin. Komponenten-Tokens verweisen nur darauf, nie auf eine nackte Länge. Negative Abstände gibt es im Standard-Set nicht; ein negativer Margin wäre später ein eigenes Token, keine freie Zahl am Knoten.
- 2026-09-24: Die Strukturprüfung des DTCG-Baums (`readTokenTree`) liegt in `core`, damit Schema, Katalog und Befehle denselben Baum ablehnen, ohne die CSS-Ausgabe einzubinden. Referenzauflösung und CSS bleiben in `@facadeur/tokens`. Der Store ruft sie vor dem Commit auf. Ein rekursives TypeBox-Schema für den Baum hat den Static-Typ des Dokuments zerstört; das JSON Schema beschreibt den Knoten deshalb über `$defs`, die Typen bleiben in TypeScript von Hand.
- 2026-09-24: Unterstützte `$type`-Werte sind `color`, `dimension`, `number`, `fontFamily`, `fontWeight`, `shadow`, `typography`. Der übrige DTCG-Katalog (duration, cubicBezier, gradient, …) kommt dazu, wenn ein Stil ihn braucht.
- 2026-09-24: `packages/editor` hängt das Stylesheet der Projektvorlage als `<style id="facadeur-tokens">` ein, damit die Custom Properties in der Specimen-Seite sichtbar sind. Die Bühne wendet sie noch nicht auf Knoten an; das bleibt die Style-Engine in M3.
- 2026-09-24: M3. `packages/style-engine` übernimmt `StyleController` und `Rule` aus style-controller, ohne das npm- oder Webpack-Build. Kinder, die an `insert` übergeben werden, landen als eigene Regeln im selben Stylesheet; der Selektor ist Eltern-Selektor plus Kind-Selektor. CSS-Nesting (`CSSStyleRule.insertRule`) entfällt, damit dasselbe Verhalten in jsdom und später pro iframe gilt. `delete` entfernt nur bei Index `>= 0`. Regeln werden ans Ende angehängt, nicht an Index 0, damit die Kaskade der Einfügereihenfolge folgt. Der Konstruktor nimmt ein `Document`, ein `HTMLStyleElement` oder `{ document, styleElement }`.
- 2026-09-24: Der Stil-Block heißt im Dokument `styles`, damit er nicht mit `node.style` (`setStyle`) kollidiert. Zustände sind `hover`, `focus-visible`, `disabled`. `font: "{type.body}"` wird zu den Typo-Longhands. `tokenInterface.reads` muss jede Token-Referenz aus Stil-Block und Layout enthalten; `sets` schreibt die Custom Property auf die Komponentenwurzel, Kinder erben sie. `{font.<id>}` ist eine Schrift und kein Read. `node.style` überschreibt die Basisdeklaration derselben Eigenschaft; Zustände, Varianten und Breakpoints bleiben darüber. `setStyleBlock` und `setTokenInterface` ersetzen den Block als ein Befehl.
- 2026-09-24: Frames sind Flexbox. Die Standardrichtung ist `column` (die CSS-Anfangrichtung wäre `row`; Sektionen, Karten und Formulare stapeln). `gap`, `padding` und `margin` sind nur Token-Referenzen. `width` und `height` sind `{ mode: hug | fill | fixed }`, nicht mehr nackte Pixel. `fixed.size` ist px, ein Token oder `{ unit: "%", value }`. Absolut nur bei `position: "absolute"`. Breakpoint-Overrides werden `@media (min-width)` ab dem nächstgrößeren Breakpoint; die Basis bleibt ohne Query. Fill/Hug eines Kindes wird gegen die Basis-Richtung des Eltern-Frames berechnet, nicht gegen eine Richtung, die erst in einer Query gilt. Die Beispiele nutzen Auto Layout; absolute Platzierung bleibt im Schema und im Konvertierungstest die ausdrückliche Ausnahme.
- 2026-09-24: Der Renderer schreibt `data-node` (lokale Id) und patched über `data-id`. `setStyle` und Layout-Änderungen bauen das Element nicht neu. `DocumentStore`-Events aktualisieren den betroffenen Teilbaum. Die Bühne erzeugt die Style-Engine auf `document` und malt das Specimen daraus. Die früheren Klassen-Styles für Button, Input und Card in `styles.css` entfallen.
- 2026-09-24: `data-id` enthält jedes Frame unter der Instanz (`specimen-section/intro/heading`). Das Wurzel-Frame der Komponente ist das Instanz-Element und fügt kein zweites `root` an. Ein Stylesheet braucht einen Browsing Context: `createHTMLDocument()` hat in jsdom keins, ein iframe-Dokument schon. Die Engine hängt ihr `<style>` an das übergebene `Document` und läuft später einmal pro iframe.
- 2026-09-24: M4. `FrameHost` in `packages/editor` kapselt ein same-origin iframe. `contentDocument` und `contentWindow` gibt es nur dort; der übrige Editor spricht die Schnittstelle an, kein `postMessage`. Pro Breakpoint eine Style-Engine und ein Renderer, alle am selben `DocumentStore`. Ein Befehl malt jeden Viewport. Tokens und Schriften kommen über `setDesign` in jedes iframe.
- 2026-09-24: Die Bühne liest Breakpoints aus dem offenen Dokument, sonst aus der Projektvorlage, sonst mobile 375, tablet 768, desktop 1440. Die iframe-Breite ist `minWidth`, damit echte `@media (min-width)` greifen. Die Höhe folgt der Content-Box. Ein Label steht über jedem Frame und bleibt in Bildschirmgröße lesbar (`font-size` geteilt durch den Bühnen-Scale). `settings.artboard` bleibt das Blattmaß im Dokument; die Bühne zeichnet kein einzelnes Sheet mehr.
- 2026-09-24: Auswahl und Hover liegen im Overlay auf der Bühne, nie im iframe. `overlayBox` rechnet iframe-lokale `getBoundingClientRect`-Werte plus die Bildschirmbox des iframes in Bühnenkoordinaten um. Ein Klick setzt dieselbe `data-id` in jedem Frame; Hover zeigt nur das Ziel unter dem Zeiger. `instanceof HTMLElement` gilt nicht über das iframe-Realm, deshalb prüft Renderer und Overlay `nodeType`.
- 2026-09-24: iframes haben `pointer-events: none`. Wheel und Drag treffen die Bühne, auch über einem Frame. Bewegung unter 4px ist ein Klick und wählt per `elementFromPoint` im Frame-Dokument; eine größere Bewegung schwenkt. Doppelklick, Strg+Klick und Esc-zum-Eltern bleiben M6. Der Renderer erzeugt Knoten im `ownerDocument` des Parents.
- 2026-09-24: Das Specimen füllt die Frame-Breite (`width: fill` statt fest 1040, ohne Mindesthöhe 860). Die Card-Reihe ist bis desktop eine Spalte, ab desktop eine Zeile; die Karten sind darunter `fill` und auf desktop fest 420/460. Die Typo-Skala bleibt die bestehende `@media`-Stufe (display 40/48/56). So unterscheiden sich Layout und Schrift zwischen den drei Frames.
- 2026-09-25: M5. Die Shell ist React. Die Bühne bleibt der bisherige Renderer (Pan/Zoom, same-origin iframes, Overlays über den Frames). React zeichnet Chrome und Panels und liest nur über `DocumentStore`. Die UI-Sprache bleibt Englisch, wie die bisherige Bühne.
- 2026-09-25: Ein Arbeitsbereich ist ein `kind`. Die Asset-Liste filtert darauf; Wechseln öffnet das zuletzt geöffnete Dokument dieser Art, sonst das erste. Start ist die Page `specimen`. Jeder Befehl bekommt `resolveKind` aus dem Katalog, damit die Verschachtelungsregeln aus `core` auch an der Bühne gelten. Ein Klick in eine Instanz wählt die Instanz des offenen Dokuments, nicht die inneren Knoten — die gehören zum anderen Dokument und werden nur in dessen Arbeitsbereich bearbeitet.
- 2026-09-25: Seiten lassen das Wurzel-Frame ungemalt (die iframe-Fläche ist die Arbeitsfläche). Atom, Komponente und Sektion setzen `paintRoot`: sonst wäre der Button eine leere Bühne, weil er selbst das Wurzel-Frame ist und keine Kinder hat. `compileDocument` gibt die Root-Regel nur dann aus. Selektoren auf der eigenen Bühne bleiben `data-id`. Der Scope beim Malen des offenen Dokuments sind seine Feld-Defaults, damit die Atom-Wurzel ihre Beschriftung zeigt. Instanzen ersetzen den Scope weiter mit ihren Overrides.
- 2026-09-25: Token- und Schriften-Bereich bearbeiten ein Design-`DocumentStore`, gefüllt aus der Projektvorlage. Die Beispieldateien tragen den Token-Baum nicht in jedem Asset; die Style-Engine malt ihn über `setDesign`, und ein `setToken`/`setFont` aktualisiert jedes iframe, ohne die Frames neu zu bauen. Undo/Redo zielt auf den Store des letzten Befehls (Strg+Z, Strg+Shift+Z, auch Meta). Laden ist nicht undoable. Laden der Datei `project-template` ersetzt das Design, nicht die Asset-Liste.
- 2026-09-25: Das Eigenschaften-Panel schreibt `setProp` (name, tag, text, src, alt, attributes), `setStyle`, an Instanzen `setField`/`setVariant`, und am Wurzelknoten den Default eines bestehenden Feldes über `defineField` (die Button-Beschriftung). Neue Felder, Varianten-Achsen, Auto Layout, Größen und freie Position bleiben M6/M7.
- 2026-09-25: Speichern nutzt die File System Access API und merkt sich den Handle. Fehlt die API, schreibt `PUT /__facadeur/examples` im Vite-Dev-Server nach `examples/<datei>.json`. Sonst startet ein Download. Öffnen nutzt dieselbe API oder ein `<input type="file">`. Der Dateiname des Specimen bleibt `specimen-page.json`.
- 2026-09-25: `setDocument` merkt sich `paintRoot` zusammen mit Adresse und Breakpoints. Ein späteres `applyChange` ohne das Flag würde sonst die Root-Regel aus dem Live-Sheet werfen, und der Button bliebe ein ungestyltes natives `<button>` in der Standard-iframe-Höhe. Die Frame-Höhe misst die Kind-Rects (`getBoundingClientRect`), nicht `scrollHeight` (das bleibt bei leerem Inhalt auf 150px stehen). Ein `MutationObserver` misst nach, sobald der Renderer die Wurzel einfügt.
- 2026-09-25: M6. Der Auswahlkontext ist der Elternknoten der Selektion, sonst die Wurzel. Ein Klick wählt das direkte Kind dieses Kontexts unter dem Zeiger. Liegt der Treffer außerhalb, fällt der Kontext auf die Wurzel zurück. Doppelklick geht eine Stufe die Trefferkette hinunter, Strg/Cmd+Klick wählt den tiefsten Dokumentknoten. Die Kette endet an der Instanz; ein Doppelklick springt nicht in die Komponente (das bleibt M7). Esc wählt den Elternknoten, an der Wurzel hebt er die Auswahl auf. Ist ein Einfügewerkzeug aktiv, bricht das erste Esc das Werkzeug ab, bevor es zum Elternknoten geht. V ist das Auswahlwerkzeug. Der Hover-Umriss ist das Klickziel, mit Strg/Cmd das tiefste Ziel.
- 2026-09-25: Ziehen auf einem Knoten sortiert um (`move`). Ziehen auf leerer Bühne oder auf der Wurzel schwenkt wie bisher. F/T/I bleiben aktiv, bis Esc oder V. Ein Klick in den ausgewählten Frame hängt ans Ende an; ein Ziehen zeigt die Einfügelinie und fügt an diesem Index ein. Die Linie folgt der Hauptrichtung des Eltern-Frames (Zeile oder Spalte), nicht den umbrochenen Zeilen. Liegt der Zeiger in der Mitte eines Frames, fällt das Element hinein; am Rand daneben. Leere Frames gelten immer als innen. Die Asset-Liste ist ziehbar, wenn die Verschachtelung die Art erlaubt. Eine Place-Liste zeigt erlaubte Assets aus anderen Arbeitsbereichen, ohne das offene Dokument (keine Instanz seiner selbst über die Liste).
- 2026-09-25: `wrap` ist ein eigener Befehl, damit „In Frame einpacken“ (Strg/Cmd+Alt+G) ein Undo-Schritt ist. Der neue Frame heißt `Frame` und übernimmt den Index des Knotens. Ein `setProp`/`insert`, das eine Token-Referenz einführt, ergänzt `tokenInterface.reads`, sonst scheitert die Layout-Änderung an der bestehenden Pflicht.
- 2026-09-25: Gap, Padding und Margin wählen nur Dimensions-Tokens. Feste Größe ist px, ein Dimensions-Token oder Prozent. Breakpoint-Overrides schreiben `layout.breakpoints`. Die Basis bleibt ohne Query. Pfeiltasten ändern nur `x`/`y` der Basis, und nur wenn `position` dort `absolute` ist (Shift 10px). Fehlen `x`/`y`, ist der Start der `offset` im ersten Frame, damit das Element nicht auf 0 springt. Absolute nur in einem Breakpoint schiebt die Tastatur nicht; das steht im Panel.
- 2026-09-25: Leere Frames (keine Kinder, kein Text) bekommen im Editor `data-empty`. Das Mindestmaß 64px und der gestrichelte Rahmen stehen im iframe-Shell-Stylesheet, nicht in der Style-Engine und nicht im JSON. Der Button bleibt ohne Markierung, weil seine Beschriftung Text am Frame ist.
- 2026-09-25: Die Einfügelinie liegt im Bühnen-Overlay und wird mit der Bühne skaliert. Ihre kurze Seite ist mindestens vier Bildschirmpixel, sonst ist sie beim Fit über drei Viewports nicht zu sehen.
- 2026-09-25: M7. Felder und Varianten-Achsen bleiben an Atom und Komponente. `defineField` und `defineVariant` lehnen Sektion und Page ab. `removeField` entfernt Bindings, die das Feld nennen, damit das Dokument in einem Befehl gültig bleibt. `removeVariant`, und `defineVariant` wenn ein Wert wegfällt, streichen die passenden Lagen im Stil-Block (Wurzel und Kinder). `setStyle` und `setStyleBlock` tragen neue Token-Pfade in `tokenInterface.reads` ein, wie das Layout.
- 2026-09-25: Der Editor legt Felder der Typen `text`, `image`, `link`, `boolean`, `enum`, `number` und `token` an. `richText` bleibt im Schema und wird nicht angeboten. Bindings nutzen die bestehenden Ziele, auch `src` und `alt`, damit ein Bild ohne zweites Modell an ein Feld kommt. Sichtbarkeit ist `visible` (versteckt, wenn der Wert `false` ist).
- 2026-09-25: Varianten-Achsen schreiben `styles.variants` und, am ausgewählten Kind, `styles.children`. Jeder Wert setzt Deklarationen und die Zustände `hover`, `focus-visible` und `disabled`. Dieselben Zustände gibt es an der Basis des Stil-Blocks. Instanzen bleiben bei `setField` und `setVariant`; es gibt kein Detach. Ein Doppelklick, der nicht tiefer als die bereits gewählte Instanz kommt, öffnet die Komponente und wählt ihre Wurzel. Ein Doppelklick in der Ebenenliste öffnet sie direkt.
- 2026-09-25: Einfügen, Platzieren und Ziehen fragen die Verschachtelungsregeln, bevor eine Einfügelinie erscheint. Eine Page nimmt keine Frames, Texte oder Bilder an und keine Instanz, die keine Sektion ist. Die Werkzeuge F, T und I sind dort aus. Ein verbotenes Ziel setzt eine Meldung, der Befehl läuft nicht.
- 2026-09-25: Die Projektvorlage bleibt die Design-Datei. Daneben starten `button` und `link` als Atoms sowie `input` und `textarea` als Form-Komponenten (`starterAtomIds` und `starterFormIds`). `link` bindet Beschriftung und `href` und hat die Achse `tone`. `textarea` folgt `input`, mit dem Feld `rows` und der Achse `resize` am Control.
- 2026-09-25: M8. `packages/codegen-react` liest die verschachtelten Dokumente und schreibt pro Dokument eine React-Komponente. Props sind die Felder und die Varianten-Achsen. Eine Achse wird eine String-Literal-Union. Die Wurzel setzt `data-component` und `data-variant-*`, Kinder setzen `data-node`. Eine Instanz wird der Aufruf der erzeugten Komponente mit den Feld- und Variantenwerten aus dem Dokument. `nodeId` ist die Instanz-Id und landet auf `data-node`, damit `[data-component="…"] [data-node="…"]` dasselbe Element trifft wie der Renderer. Jede Komponente nimmt zusätzlich `className` und mischt es mit dem Klassen-Attribut aus dem Dokument. Ein boolesches Feld an einem booleschen Attribut wird ein React-Boolean (`hidden={open}`), nicht der HTML-String, den der DOM-Renderer schreibt.
- 2026-09-25: CSS bleibt am bestehenden Compiler. Tokens und Schriften kommen aus `renderDesignCss`. Stil-Blöcke und Layout kommen aus `compileDocument` mit `address: 'instance'` und werden als ein Stylesheet serialisiert, inklusive `@media (min-width)`. Breakpoints stammen aus dem Design-Dokument, sonst aus den Standardwerten. Es gibt kein zweites Stilmodell.
- 2026-09-25: Eine Page wird in der Ausgabe als echtes Wurzel-Element erzeugt. Im Editor bleibt das Wurzel-Frame der Page die unbemalte Arbeitsfläche. Next.js hat kein Artboard-iframe, also braucht die Page ein Element, an dem `data-component` und das Layout hängen.
- 2026-09-25: `richText` bleibt ein String-Kind, wie der Renderer. Kein HTML. Ein Default, dessen Laufzeittyp nicht zum Feldtyp passt, bricht die Generierung ab, damit die erzeugte Datei typisiert bleibt. Felder ohne Bindung stehen in den Props, werden im Funktionsrumpf aber nicht gelesen.
- 2026-09-26: Codegen-Ausgabe ist ein Monorepo-Schnitt im Haupt-Repo: `packages/ui` plus generierte Stories unter `apps/storybook`. Kein flaches `examples/next/generated` mehr. `@facadeur/codegen-react` CLI: `--out packages/ui`, optional `--storybook apps/storybook`. Der Editor liegt unter `apps/editor`.
- 2026-09-25: Die Ausgabe lag unter `examples/next/generated` und war eingecheckt. `pnpm codegen` schrieb sie aus den Beispieldokumenten; die Projektvorlage war das Design. (Ersetzt durch Monorepo-Ausgabe oben.)
- 2026-09-25: Die linke Spalte ist ein Projektbaum, kein Arbeitsbereich-Umschalter. Oben der Baum: Design (Tokens, Schriften), dann Atoms, Components, Sections und Pages mit den Assets darunter. Unten bleibt die Ebenenliste des offenen Dokuments. Ein Klick auf ein Asset öffnet es auf der Bühne. Tokens und Schriften öffnen den bestehenden Bereich im rechten Panel. Suche filtert den ganzen Baum. „Neu anlegen“ legt pro Art ein leeres Frame-Dokument an und öffnet es. Ziehen einer Baumzeile auf die Bühne erzeugt eine Instanz, wenn die Verschachtelung das erlaubt. Ein Doppelklick auf eine Instanz öffnet den Master wie bisher; der Baum klappt die Art auf und rückt die Zeile ins Blickfeld.
- 2026-09-25: Ein ausgewählter Knoten wird in jedem Viewport-Frame umrandet. Farbe A (Akzent) ist der Frame, in den zuletzt geklickt wurde. Farbe B ist derselbe Knoten in den anderen Frames. Höchstens ein Fokus-Viewport. Ein Klick in einen Frame setzt diesen Fokus und färbt sein Label; die Ebenenliste ändert ihn nicht. Vor dem ersten Klick ist kein Frame primär. Griffe gibt es nur am primären Umriss.
- 2026-09-25: Die Basis ist der Breakpoint mit der kleinsten `minWidth` (mobil, Standard 375) und bleibt ohne Media Query. Der Inspector bleibt auf Basis, bis auf den Override des Fokus-Viewports umgeschaltet wird. Ein Klick auf einen Frame wechselt das Ziel nicht von selbst. Der Basis-Frame hat keinen Override. Im Override-Modus schreibt der Editor nur diesen Breakpoint: Stil-Deklarationen und Zustände nach `styles` bzw. `styles.children` → `breakpoints` (das bestehende `@media (min-width)`), Layout nach `layout.breakpoints`, Tokens nach `$extensions.facadeur.breakpoints`. Andere Breakpoints und die Basis bleiben unangetastet. `node.style` bleibt die Basis-Überschreibung ohne Query und liegt unter den Breakpoint-Regeln. Eine Eigenschaft mit Override am fokussierten Viewport zeigt „Override bei 768“ (die `minWidth` des Fokus-Frames) und lässt sich einzeln zurücksetzen. Varianten bleiben an der Basis, weil Breakpoints dort nicht geschachtelt sind. Schriften haben keine Viewport-Werte; Größen laufen über Typografie-Tokens.
- 2026-09-30: `displayOn` ist ein strikt disjunktiver Contract: genau eine Bedingung aus `equals` oder `truthy`, nie beide und nie keine. Das Schema, der Editor, Renderer und Codegen verwenden dieselbe Unterscheidung; dadurch gibt es keine implizite „immer sichtbar“-Fallback-Bedeutung bei unvollständigen Bedingungen.
- 2026-09-30: Node-Layout-Overrides bleiben sparse auf der Layout-Ebene: einzelne Breakpoint-Layer werden mit dem bestehenden Layer gemerged, statt die gesamte Breakpoint-Map zu ersetzen. `width` und `height` sind dabei atomare Axis-Werte; ein Override von `mode` trägt nicht versehentlich die alte `size` mit.
- 2026-09-30: DSL-Namen dürfen Bindestriche enthalten, generierter JavaScript-Code aber nicht. Der React-Codegen sanitisiert deshalb Repeater-Aliase zu lokalen Identifiern und verwendet optionale Bracket-Notation für nicht identifierfähige Pfadsegmente; der Datenpfad selbst bleibt unverändert.
- 2026-09-30: Benannte Variant-Style-Edits verwenden jetzt den kanonischen sparsamen Block `overrides.styles`. Der Editor migriert die Legacy-Layer `styles.variants.variant.<preset>` atomar für das bearbeitete Preset und lässt andere Style-Achsen unangetastet.
- 2026-09-30: `deriveVariantPreset` leitet nun auch sparse Style-Overrides aus einem aufgelösten Variant-Dokument ab — inklusive States, Style-Achsen, Breakpoints und Child-Regeln. Direkte Styles migrieren dabei ebenfalls die alte Named-Layer-Struktur.
- 2026-09-30: Data-Directive-Controls bieten Gleichheitsbedingungen nur für skalare Felder an und erlauben als Repeater-Key nur skalare Item-Pfade. Objekt-/Array-Felder bleiben für Truthy-Bedingungen und den Repeater-Scope verfügbar.
