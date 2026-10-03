import type { StyleChild } from '@facadeur/core';
import type { CompiledRule, StyleLayerOutputState } from './types';
import { appendStyleSelectorSuffix } from '../selectors/scope';
import { withVariant } from '../selectors/variants';
import { expandDeclarations } from '../css/values';
export function appendCompiledRule(
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
    appendCompiledRule(
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
      appendCompiledRule(
        state,
        `${documentId}:${targetKey}:variant:${axis}:${value}`,
        current,
        expandDeclarations(variant.declarations, context),
        undefined,
        styleRule,
      );
      for (const [name, declarations] of Object.entries(variant.states ?? {})) {
        appendCompiledRule(
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
    appendCompiledRule(
      state,
      `${documentId}:${targetKey}:style:${id}`,
      selector,
      expandDeclarations(breakpoint.declarations, context),
      minWidth,
      styleRule,
    );
    for (const [name, declarations] of Object.entries(breakpoint.states ?? {})) {
      appendCompiledRule(
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
