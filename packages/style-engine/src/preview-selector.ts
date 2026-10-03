import { replaceSelectorClasses, type StyleRule } from '@facadeur/core';
import { scopeStyleSelector } from './selector-scope.js';

interface PreviewSelectorContext {
  documentId: string;
  rule: StyleRule;
  selector: string;
  nodeClassNames: ReadonlyMap<string, string>;
  address: 'instance' | 'canvas';
  variantScope?: string;
  axisVariant?: { axis: string; value: string };
}

/** Bind preview rules to owner-local data markers without changing selector relationships. */
export function previewStyleRuleSelector(context: PreviewSelectorContext): string {
  const nodeByClass = new Map(
    [...context.nodeClassNames].map(([nodeId, className]) => [className, nodeId]),
  );
  let index = 0;
  const markers = new Map<string, string>();
  const withMarkers = replaceSelectorClasses(context.selector, (name) => {
    const nodeId = nodeByClass.get(name);
    if (!nodeId)
      throw new Error(`Style rule class ".${name}" is not bound in "${context.documentId}"`);
    let marker = `facadeur_preview_target_${index++}`;
    while (context.selector.includes(`.${marker}`) || markers.has(marker)) marker = `_${marker}`;
    markers.set(marker, nodeId);
    return marker;
  });
  let bound = withMarkers;
  for (const [marker, nodeId] of markers) {
    bound = bound.replaceAll(
      `.${marker}`,
      `[data-style-node~="${cssString(`${context.documentId}:${nodeId}`)}"]`,
    );
  }
  const root =
    context.address === 'canvas'
      ? `[data-style-document="${cssString(context.documentId)}"]`
      : `[data-component="${cssString(context.documentId)}"]`;
  const variants = [
    ...(context.variantScope ? [['variant', context.variantScope] as const] : []),
    ...(context.axisVariant
      ? [[context.axisVariant.axis, context.axisVariant.value] as const]
      : []),
  ];
  const rootWithVariants = `${root}${variants.map(([axis, value]) => variantAttribute(axis, value)).join('')}`;
  return scopeStyleSelector(bound, rootWithVariants);
}

function variantAttribute(axis: string, value: string): string {
  return axis === 'variant'
    ? `[data-variant="${cssString(value)}"]`
    : `[data-variant-${cssString(axis)}="${cssString(value)}"]`;
}

function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
