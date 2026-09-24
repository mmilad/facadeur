# facadeur – Plan

> Lebendes Dokument. Coding-Agenten: Lies zuerst **Prinzipien** und **Entscheidungen**, arbeite dann den ersten offenen Meilenstein ab und hake erledigte Punkte (`- [x]`) im selben PR ab. Neue Erkenntnisse oder Abweichungen kommen unter „Entscheidungslog“ ans Ende.

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
- `packages/editor` – Vite + React App (Bühne, Panels, Werkzeuge).
- `packages/codegen-react` – später.

### Arten (kinds) und Hierarchie

- Jedes Dokument hat ein `kind`: `atom`, `component`, `section`, `page`. Die Liste ist konfigurierbar (zusammenlegen oder weiter aufteilen), mit Verschachtelungsregeln pro Art.
- Standardregeln: Atome enthalten nur Grundbausteine. Komponenten enthalten Grundbausteine, Atome und Komponenten. Sektionen enthalten alles außer Sektionen und Pages. **Pages enthalten nur Sektionen.**
- Jede Art hat einen eigenen Arbeitsbereich im Editor, die Ansicht ist aber überall gleich aufgebaut.

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

- [ ] `style-engine` auf Basis von style-controller, Bugs beheben, Tests
- [ ] Stil-Block pro Komponente mit Varianten, Zuständen und Breakpoint-Overrides
- [ ] Komponenten setzen/überschreiben Tokens für Kinder
- [ ] `renderer-dom`: gezielte Updates pro Knoten statt Neurendern

### M4 – Viewports mit iframes

- [ ] `FrameHost`-Schnittstelle, ein iframe pro Viewport, same-origin
- [ ] Breakpoints konfigurierbar, Frames nebeneinander auf der Bühne
- [ ] Auswahl-/Hover-Overlays über den iframes, korrekt bei Zoom/Pan

### M5 – Editor-Grundgerüst

- [ ] React-Shell: Bühne, Ebenenliste, Eigenschaften-Panel, Asset-Liste (Atome/Komponenten/Sektionen/Pages), Token- und Schriften-Bereich
- [ ] Befehle über `store-yjs` anbinden, Undo/Redo (Strg+Z / Strg+Shift+Z)
- [ ] Renderer und Style-Engine abonnieren Änderungen des Stores und aktualisieren gezielt
- [ ] Laden/Speichern der JSON-Dateien (File System Access API oder kleiner Dev-Server)
- [ ] Arbeitsbereiche pro `kind`

### M6 – Bauen im Editor

- [ ] Einfüge-Werkzeuge (F/T/I), Drag aus Asset-Liste, Einfügelinie
- [ ] Auswahl-Logik (Klick, Doppelklick, Strg+Klick, Esc, Hover)
- [ ] Umsortieren per Drag (Bühne und Ebenenliste), In Frame einpacken
- [ ] Auto-Layout-Panel (Richtung, gap/padding nur Tokens, Ausrichtung, wrap)
- [ ] Größen: hug/fill/fixed pro Achse, min/max, pro Breakpoint
- [ ] Freie Positionierung als Option, Pfeiltasten nur dafür
- [ ] Leere Frames mit Mindestgröße im Editor

### M7 – Komponenten-Features

- [ ] Variable Felder definieren (Typ, Default) und an Text/Attribute/Stile/Sichtbarkeit binden
- [ ] Varianten-Achsen definieren und bearbeiten
- [ ] Instanzen: nur Feld- und Variantenwerte überschreibbar, kein Detach, Bearbeiten nur in eigener Ansicht
- [ ] Pages nur aus Sektionen (Regeln im Editor durchsetzen)
- [ ] Vordefinierte Atome `button`, `link`, `input`, `textarea` in der Projektvorlage

### M8 – Codegen React (Next.js)

- [ ] Komponenten zu React-Komponenten mit typisierten Props aus Feldern und Varianten
- [ ] Tokens und Schriften zu CSS, Stil-Blöcke zu CSS
- [ ] Beispiel-Next.js-Projekt, das die Ausgabe nutzt

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
