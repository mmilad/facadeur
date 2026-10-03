import type { DocumentFile, NestedNode } from '@facadeur/core';
import type { WalkState } from '../compiler/types';
import { cssString } from '../css/strings';
import { withVariant } from './variants';
import { instanceTargetSelector } from './instance-target';
export function selectorFor(document: DocumentFile, node: NestedNode, state: WalkState): string {
  // A local instance rule must address the root element itself. Its component
  // marker alone is shared by the master stylesheet, so include the rendered
  // path and repeated marker attributes to win the cascade independent of
  // document insertion order.
  const scopedInstance =
    node.type === 'instance' && !state.isRoot && document.styles?.children?.[node.id] !== undefined;
  if (scopedInstance) {
    const path =
      state.address === 'canvas' ? node.id : (state.path?.split('/').slice(1).join('/') ?? node.id);
    const selector = instanceTargetSelector(
      document.id,
      path,
      node.component,
      state.address,
      state.path ?? node.id,
    );
    return state.address === 'instance' && state.variantScope
      ? withVariant(selector, 'variant', state.variantScope)
      : selector;
  }
  if (state.address === 'canvas') return `[data-id="${cssString(state.path ?? node.id)}"]`;
  const selector = state.isRoot
    ? `[data-component="${cssString(document.id)}"]`
    : `[data-component="${cssString(document.id)}"] [data-node="${cssString(node.id)}"]`;
  return state.variantScope ? withVariant(selector, 'variant', state.variantScope) : selector;
}
