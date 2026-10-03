import {
  documentClassNames,
  renderStyleRuleSelector,
  type Breakpoint,
  type DocumentFile,
  type StyleChild,
} from '@facadeur/core';
import type { CompileOptions, CompiledRule } from './compile.js';
import { appendStyleSelectorSuffix } from './selector-scope.js';
import { previewStyleRuleSelector } from './preview-selector.js';
import { expandDeclarations, type SubstituteContext } from './values.js';

export interface StyleLayerOutputState {
  breakpoints: readonly Breakpoint[];
  substituteContext: SubstituteContext;
  rules: CompiledRule[];
}

export interface AuthoredRuleOutputState extends StyleLayerOutputState {
  address: 'instance' | 'canvas';
  variantScope?: string;
}

/** Compile the ordered, owner-scoped selectors authored in a document's Styles panel. */
export function compileAuthoredRules(
  document: DocumentFile,
  options: Pick<CompileOptions, 'selectorForStyleRule'> & {
    address: 'instance' | 'canvas';
    variantScope?: string;
  },
  state: AuthoredRuleOutputState,
): void {
  const names = documentClassNames(document);
  for (const rule of document.styles?.rules ?? []) {
    const authored = renderStyleRuleSelector(rule, names);
    const extra = { styleRuleId: rule.id, styleRuleBindings: rule.bindings };
    const select = (axisVariant?: { axis: string; value: string }): string =>
      (options.selectorForStyleRule ?? previewStyleRuleSelector)({
        documentId: document.id,
        rule,
        selector: authored,
        nodeClassNames: names,
        address: options.address,
        ...(options.variantScope ? { variantScope: options.variantScope } : {}),
        ...(axisVariant ? { axisVariant } : {}),
      });
    const selector = select();
    push(
      state,
      `${document.id}:rule:${rule.id}:base`,
      selector,
      expandDeclarations(rule.declarations, state.substituteContext),
      undefined,
      extra,
    );
    emitSparseStyleLayers(document.id, `rule:${rule.id}`, rule, selector, state, extra, {
      forVariant: (_selector, axis, value) => select({ axis, value }),
    });
  }
}

/** Share state, axis, and breakpoint declaration expansion across rule owners. */
export function emitSparseStyleLayers(
  documentId: string,
  targetKey: string,
  layer: StyleChild | undefined,
  selector: string,
  state: StyleLayerOutputState,
  styleRule?: Pick<CompiledRule, 'styleRuleId' | 'styleRuleBindings'>,
  selectorHooks?: {
    forState?: (selector: string, name: string) => string;
    forVariant?: (selector: string, axis: string, value: string) => string;
  },
): void {
  if (!layer) return;
  const context = state.substituteContext;
  const forState =
    selectorHooks?.forState ?? ((current, name) => appendStyleSelectorSuffix(current, `:${name}`));
  const forVariant = selectorHooks?.forVariant ?? withVariant;
  for (const [name, declarations] of Object.entries(layer.states ?? {})) {
    push(
      state,
      `${documentId}:${targetKey}:state:${name}`,
      forState(selector, name),
      expandDeclarations(declarations, context),
      undefined,
      styleRule,
    );
  }
  for (const [axis, values] of Object.entries(layer.variants ?? {})) {
    for (const [value, variant] of Object.entries(values)) {
      const current = forVariant(selector, axis, value);
      push(
        state,
        `${documentId}:${targetKey}:variant:${axis}:${value}`,
        current,
        expandDeclarations(variant.declarations, context),
        undefined,
        styleRule,
      );
      for (const [name, declarations] of Object.entries(variant.states ?? {})) {
        push(
          state,
          `${documentId}:${targetKey}:variant:${axis}:${value}:state:${name}`,
          forState(current, name),
          expandDeclarations(declarations, context),
          undefined,
          styleRule,
        );
      }
    }
  }
  const baseId = state.breakpoints[0]?.id;
  for (const [id, breakpoint] of Object.entries(layer.breakpoints ?? {})) {
    if (id === baseId) continue;
    const minWidth = state.breakpoints.find((item) => item.id === id)?.minWidth;
    if (minWidth === undefined) continue;
    push(
      state,
      `${documentId}:${targetKey}:style:${id}`,
      selector,
      expandDeclarations(breakpoint.declarations, context),
      minWidth,
      styleRule,
    );
    for (const [name, declarations] of Object.entries(breakpoint.states ?? {})) {
      push(
        state,
        `${documentId}:${targetKey}:style:${id}:state:${name}`,
        forState(selector, name),
        expandDeclarations(declarations, context),
        minWidth,
        styleRule,
      );
    }
  }
}

function push(
  state: Pick<StyleLayerOutputState, 'rules'>,
  key: string,
  selector: string,
  declarations: [string, string][],
  minWidth?: number,
  extra?: Pick<CompiledRule, 'styleRuleId' | 'styleRuleBindings'>,
): void {
  if (!declarations.length) return;
  state.rules.push({
    key,
    selector,
    declarations,
    ...(minWidth !== undefined ? { minWidth } : {}),
    ...(extra?.styleRuleId ? { styleRuleId: extra.styleRuleId } : {}),
    ...(extra?.styleRuleBindings ? { styleRuleBindings: extra.styleRuleBindings } : {}),
  });
}

export function withVariant(selector: string, axis: string, value: string): string {
  const attribute =
    axis === 'variant'
      ? `[data-variant="${cssString(value)}"]`
      : `[data-variant-${axis}="${cssString(value)}"]`;
  const space = selector.indexOf(' ');
  if (space === -1) return `${selector}${attribute}`;
  return `${selector.slice(0, space)}${attribute}${selector.slice(space)}`;
}

function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
