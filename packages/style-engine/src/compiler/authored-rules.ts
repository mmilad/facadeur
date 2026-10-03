import { documentClassNames, renderStyleRuleSelector, type DocumentFile } from '@facadeur/core';
import type { CompileOptions, StyleLayerOutputState } from './types';
import { expandDeclarations } from '../css/values';
import { previewStyleRuleSelector } from '../selectors/preview';
import { appendCompiledRule, emitSparseStyleLayers } from './rules';
/** Compile the ordered, owner-scoped selectors authored in a document's Styles panel. */
export function compileAuthoredRules(
  document: DocumentFile,
  options: Pick<CompileOptions, 'selectorForStyleRule'> & {
    address: 'instance' | 'canvas';
    variantScope?: string;
  },
  state: StyleLayerOutputState,
): void {
  const names = documentClassNames(document);
  for (const rule of document.styles?.rules ?? []) {
    const authored = renderStyleRuleSelector(rule, names);
    const extra = { styleRuleId: rule.id, styleRuleBindings: rule.bindings };
    const target = { kind: 'authored-selector' as const };
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
    appendCompiledRule(
      state,
      `${document.id}:rule:${rule.id}:base`,
      selector,
      expandDeclarations(rule.declarations, state.substituteContext),
      target,
      undefined,
      extra,
    );
    emitSparseStyleLayers(document.id, `rule:${rule.id}`, rule, selector, target, state, extra, {
      forVariant: (_selector, axis, value) => select({ axis, value }),
    });
  }
}
