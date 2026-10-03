import type { Breakpoint } from '@facadeur/core';
import { loadTokens } from '@facadeur/tokens';
import type { CompileOptions, CompiledRule } from '../compiler/types';
import { compileDocument } from '../compiler/compile';
import { StyleController } from './controller';
import type { StyleControllerTarget, StyleEngine } from './types';
import { clearRules, insertCompiled } from './stylesheet';
import { insertDesign } from './design';
export function createStyleEngine(
  target?: Document | HTMLStyleElement | StyleControllerTarget | null,
): StyleEngine {
  const controller = new StyleController(target);
  const byDocument = new Map<string, CSSRule[]>();
  const addresses = new Map<string, CompileOptions>();
  let designRules: CSSRule[] = [];
  let breakpoints: Breakpoint[] = [];

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
      breakpoints = design.breakpoints;
      clearRules(sheet(), designRules);
      designRules = insertDesign(sheet(), design, options.selector ?? ':root');
    },
    setDocument(document, options = {}) {
      const stored = addresses.get(document.id);
      const compileOptions: CompileOptions = {
        ...stored,
        ...options,
        address: options.address ?? stored?.address ?? 'instance',
        breakpoints: options.breakpoints ?? stored?.breakpoints ?? breakpoints,
        paintRoot: options.paintRoot ?? stored?.paintRoot,
        selectorForStyleRule: options.selectorForStyleRule ?? stored?.selectorForStyleRule,
      };
      addresses.set(document.id, compileOptions);
      replaceDocument(sheet(), byDocument, document.id, compileDocument(document, compileOptions));
    },
    applyChange(document) {
      engine.setDocument(document);
    },
    removeDocument(id) {
      clearRules(sheet(), byDocument.get(id) ?? []);
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
  byDocument: Map<string, CSSRule[]>,
  id: string,
  compiled: readonly CompiledRule[],
): void {
  clearRules(sheet, byDocument.get(id) ?? []);
  byDocument.set(
    id,
    compiled.map((rule) => insertCompiled(sheet, rule)),
  );
}
