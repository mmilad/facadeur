import {
  type Breakpoint,
  type DocumentChange,
  type DocumentFile,
  type FontFamily,
} from '@facadeur/core';
import {
  googleFontUrl,
  loadTokens,
  quoteFamily,
  type DesignInput,
  type ResolvedDesign,
} from '@facadeur/tokens';
import { compileDocument, type CompileOptions, type CompiledRule } from './compile.js';
import { StyleController, type StyleControllerTarget } from './controller.js';

interface LiveRule {
  rule: CSSRule;
  /** Media rule that owns `rule`, when the style rule is nested in `@media`. */
  media: CSSMediaRule | null;
}

export interface StyleEngine {
  readonly controller: StyleController;
  readonly ownerDocument: Document;
  /** Breakpoints from the last `setDesign` call. Documents inherit them when they list none. */
  readonly breakpoints: readonly Breakpoint[];
  setDesign(input?: DesignInput, options?: { selector?: string }): void;
  setDocument(document: DocumentFile, options?: CompileOptions): void;
  /** Rebuild this document's rules. The DOM is not involved. */
  applyChange(document: DocumentFile, _change: DocumentChange): void;
  removeDocument(id: string): void;
  destroy(): void;
}

export function createStyleEngine(
  target?: Document | HTMLStyleElement | StyleControllerTarget | null,
): StyleEngine {
  const controller = new StyleController(target);
  const byDocument = new Map<string, LiveRule[]>();
  const addresses = new Map<string, CompileOptions>();
  let designRules: CSSRule[] = [];
  let breakpoints: Breakpoint[] = [];
  let designSelector = ':root';

  function sheet(): CSSStyleSheet {
    return controller.sheet;
  }

  const engine: StyleEngine = {
    controller,
    ownerDocument: controller.ownerDocument,
    get breakpoints() {
      return breakpoints;
    },
    setDesign(input = {}, options = {}) {
      const design = loadTokens(input);
      designSelector = options.selector ?? ':root';
      breakpoints = design.breakpoints;
      clearRules(sheet(), designRules);
      designRules = insertDesign(sheet(), design, designSelector);
    },
    setDocument(document, options = {}) {
      const stored = addresses.get(document.id);
      const compileOptions: CompileOptions = {
        address: options.address ?? stored?.address ?? 'instance',
        breakpoints: options.breakpoints ?? stored?.breakpoints ?? breakpoints,
        paintRoot: options.paintRoot ?? stored?.paintRoot,
      };
      addresses.set(document.id, compileOptions);
      replaceDocument(sheet(), byDocument, document.id, compileDocument(document, compileOptions));
    },
    applyChange(document) {
      engine.setDocument(document);
    },
    removeDocument(id) {
      clearRules(sheet(), rulesOf(byDocument.get(id)));
      byDocument.delete(id);
      addresses.delete(id);
    },
    destroy() {
      clearRules(sheet(), designRules);
      designRules = [];
      for (const id of [...byDocument.keys()]) engine.removeDocument(id);
      controller.destroy();
    },
  };

  return engine;
}

function replaceDocument(
  sheet: CSSStyleSheet,
  byDocument: Map<string, LiveRule[]>,
  id: string,
  compiled: readonly CompiledRule[],
): void {
  clearRules(sheet, rulesOf(byDocument.get(id)));
  byDocument.set(
    id,
    compiled.map((rule) => insertCompiled(sheet, rule)),
  );
}

function rulesOf(rules: LiveRule[] | undefined): CSSRule[] {
  if (!rules) return [];
  return rules.flatMap((live) => (live.media ? [live.media] : [live.rule]));
}

function clearRules(sheet: CSSStyleSheet, rules: readonly CSSRule[]): void {
  for (const rule of rules) {
    const index = indexOf(sheet, rule);
    if (index >= 0) sheet.deleteRule(index);
  }
}

function insertCompiled(sheet: CSSStyleSheet, compiled: CompiledRule): LiveRule {
  const body = declarationsText(compiled.declarations);
  if (compiled.minWidth === undefined) {
    const index = sheet.cssRules.length;
    sheet.insertRule(`${compiled.selector} {${body}}`, index);
    const rule = sheet.cssRules[index];
    if (!rule) throw new Error(`Could not insert ${compiled.selector}`);
    return { rule, media: null };
  }
  const index = sheet.cssRules.length;
  sheet.insertRule(`@media (min-width: ${compiled.minWidth}px) {}`, index);
  const media = sheet.cssRules[index];
  if (!media || media.type !== CSSRule.MEDIA_RULE) {
    throw new Error(`Could not insert @media for ${compiled.selector}`);
  }
  const group = media as CSSMediaRule;
  group.insertRule(`${compiled.selector} {${body}}`, 0);
  const rule = group.cssRules[0];
  if (!rule) throw new Error(`Could not insert ${compiled.selector} inside @media`);
  return { rule, media: group };
}

function insertDesign(sheet: CSSStyleSheet, design: ResolvedDesign, selector: string): CSSRule[] {
  const created: CSSRule[] = [];
  let index = 0;
  for (const font of design.fonts) {
    if (font.source.type !== 'google') continue;
    const rule = insertAt(sheet, `@import url("${escapeCss(googleFontUrl(font))}");`, index);
    created.push(rule);
    index += 1;
  }
  for (const font of design.fonts) {
    if (font.source.type !== 'file') continue;
    for (const text of fontFaceTexts(font)) {
      created.push(insertAt(sheet, text, index));
      index += 1;
    }
  }
  const base = design.properties
    .filter((property) => property.value !== '')
    .map((property) => [property.name, property.value] as [string, string]);
  if (base.length) {
    created.push(insertAt(sheet, `${selector} {${declarationsText(base)}}`, index));
    index += 1;
  }
  const baseId = design.breakpoints[0]?.id;
  for (const breakpoint of design.breakpoints) {
    if (breakpoint.id === baseId) continue;
    const declarations = design.properties.flatMap((property) => {
      const value = property.breakpoints[breakpoint.id];
      return value === undefined ? [] : [[property.name, value] as [string, string]];
    });
    if (!declarations.length) continue;
    const text = `@media (min-width: ${breakpoint.minWidth}px) { ${selector} {${declarationsText(declarations)}} }`;
    created.push(insertAt(sheet, text, index));
    index += 1;
  }
  return created;
}

function insertAt(sheet: CSSStyleSheet, text: string, index: number): CSSRule {
  sheet.insertRule(text, index);
  const rule = sheet.cssRules[index];
  if (!rule) throw new Error(`Could not insert rule: ${text.slice(0, 80)}`);
  return rule;
}

function fontFaceTexts(font: FontFamily): string[] {
  if (font.source.type !== 'file') return [];
  return font.source.files.map((file) => {
    const format = file.format ? ` format("${escapeCss(file.format)}")` : '';
    return `@font-face { font-family: ${quoteFamily(font.family)}; font-style: ${file.style}; font-weight: ${file.weight}; src: url("${escapeCss(file.url)}")${format}; }`;
  });
}

function declarationsText(declarations: readonly [string, string][]): string {
  return declarations.map(([name, value]) => `${name}: ${value};`).join(' ');
}

function indexOf(sheet: CSSStyleSheet, rule: CSSRule): number {
  for (let index = 0; index < sheet.cssRules.length; index += 1) {
    if (sheet.cssRules[index] === rule) return index;
  }
  return -1;
}

function escapeCss(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
