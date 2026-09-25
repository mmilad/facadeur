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
- `packages/codegen-react` – React-Komponenten und CSS aus den Dokumenten, für Next.js.

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
- 2026-09-25: Die Projektvorlage bleibt die Design-Datei. Daneben starten `button`, `link`, `input` und `textarea` (`starterAtomIds`). `link` bindet Beschriftung und `href` und hat die Achse `tone`. `textarea` folgt `input`, mit dem Feld `rows` und der Achse `resize` am Control.
- 2026-09-25: M8. `packages/codegen-react` liest die verschachtelten Dokumente und schreibt pro Dokument eine React-Komponente. Props sind die Felder und die Varianten-Achsen. Eine Achse wird eine String-Literal-Union. Die Wurzel setzt `data-component` und `data-variant-*`, Kinder setzen `data-node`. Eine Instanz wird der Aufruf der erzeugten Komponente mit den Feld- und Variantenwerten aus dem Dokument. `nodeId` ist die Instanz-Id und landet auf `data-node`, damit `[data-component="…"] [data-node="…"]` dasselbe Element trifft wie der Renderer. Jede Komponente nimmt zusätzlich `className` und mischt es mit dem Klassen-Attribut aus dem Dokument. Ein boolesches Feld an einem booleschen Attribut wird ein React-Boolean (`hidden={open}`), nicht der HTML-String, den der DOM-Renderer schreibt.
- 2026-09-25: CSS bleibt am bestehenden Compiler. Tokens und Schriften kommen aus `renderDesignCss`. Stil-Blöcke und Layout kommen aus `compileDocument` mit `address: 'instance'` und werden als ein Stylesheet serialisiert, inklusive `@media (min-width)`. Breakpoints stammen aus dem Design-Dokument, sonst aus den Standardwerten. Es gibt kein zweites Stilmodell.
- 2026-09-25: Eine Page wird in der Ausgabe als echtes Wurzel-Element erzeugt. Im Editor bleibt das Wurzel-Frame der Page die unbemalte Arbeitsfläche. Next.js hat kein Artboard-iframe, also braucht die Page ein Element, an dem `data-component` und das Layout hängen.
- 2026-09-25: `richText` bleibt ein String-Kind, wie der Renderer. Kein HTML. Ein Default, dessen Laufzeittyp nicht zum Feldtyp passt, bricht die Generierung ab, damit die erzeugte Datei typisiert bleibt. Felder ohne Bindung stehen in den Props, werden im Funktionsrumpf aber nicht gelesen.
- 2026-09-25: Die Ausgabe liegt unter `examples/next/generated` und ist eingecheckt. `pnpm codegen` schreibt sie neu aus den Beispieldokumenten; die Projektvorlage ist das Design, keine Komponente. Die Beispiel-App ist `examples/next`. Dateien und Regeln sind nach Dokument-Id sortiert, damit dieselbe Menge Dokumente immer dieselbe Ausgabe ergibt.
- 2026-09-25: Die linke Spalte ist ein Projektbaum, kein Arbeitsbereich-Umschalter. Oben der Baum: Design (Tokens, Schriften), dann Atoms, Components, Sections und Pages mit den Assets darunter. Unten bleibt die Ebenenliste des offenen Dokuments. Ein Klick auf ein Asset öffnet es auf der Bühne. Tokens und Schriften öffnen den bestehenden Bereich im rechten Panel. Suche filtert den ganzen Baum. „Neu anlegen“ legt pro Art ein leeres Frame-Dokument an und öffnet es. Ziehen einer Baumzeile auf die Bühne erzeugt eine Instanz, wenn die Verschachtelung das erlaubt. Ein Doppelklick auf eine Instanz öffnet den Master wie bisher; der Baum klappt die Art auf und rückt die Zeile ins Blickfeld.
- 2026-09-25: Ein ausgewählter Knoten wird in jedem Viewport-Frame umrandet. Farbe A (Akzent) ist der Frame, in den zuletzt geklickt wurde. Farbe B ist derselbe Knoten in den anderen Frames. Höchstens ein Fokus-Viewport. Ein Klick in einen Frame setzt diesen Fokus und färbt sein Label; die Ebenenliste ändert ihn nicht. Vor dem ersten Klick ist kein Frame primär. Griffe gibt es nur am primären Umriss.
- 2026-09-25: Die Basis ist der Breakpoint mit der kleinsten `minWidth` (mobil, Standard 375) und bleibt ohne Media Query. Der Inspector bleibt auf Basis, bis auf den Override des Fokus-Viewports umgeschaltet wird. Ein Klick auf einen Frame wechselt das Ziel nicht von selbst. Der Basis-Frame hat keinen Override. Im Override-Modus schreibt der Editor nur diesen Breakpoint: Stil-Deklarationen und Zustände nach `styles` bzw. `styles.children` → `breakpoints` (das bestehende `@media (min-width)`), Layout nach `layout.breakpoints`, Tokens nach `$extensions.facadeur.breakpoints`. Andere Breakpoints und die Basis bleiben unangetastet. `node.style` bleibt die Basis-Überschreibung ohne Query und liegt unter den Breakpoint-Regeln. Eine Eigenschaft mit Override am fokussierten Viewport zeigt „Override bei 768“ (die `minWidth` des Fokus-Frames) und lässt sich einzeln zurücksetzen. Varianten bleiben an der Basis, weil Breakpoints dort nicht geschachtelt sind. Schriften haben keine Viewport-Werte; Größen laufen über Typografie-Tokens.
