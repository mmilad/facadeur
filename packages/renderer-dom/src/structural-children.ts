import {
  selectStructuralChild,
  structuralChildSchemas,
  type ContractResolverInput,
  type NestedNode,
} from '@facadeur/core';
import { joinId } from './resolve';
import type { RenderContext } from './types';
import { repeatedDataScope, scopeWithStructuralProps } from './repeat-scope';

export interface RenderCandidate {
  node: NestedNode;
  context: RenderContext;
}

/** Expand transparent structural nodes into the matching styleable instance children. */
export function expandStructuralChildren(
  children: readonly NestedNode[],
  context: RenderContext,
): RenderCandidate[] {
  const result: RenderCandidate[] = [];
  for (const node of children) {
    if (node.type !== 'repeater' && node.type !== 'switch') {
      result.push({ node, context });
      continue;
    }
    const owner = context.styleDocumentId
      ? context.catalog.get(context.styleDocumentId)
      : context.canvasDocument;
    if (!owner) continue;
    const resolver: ContractResolverInput = {
      documents: context.catalog,
      ...(context.schemaCatalog ? { schemaCatalog: context.schemaCatalog } : {}),
    };
    const candidates = structuralChildSchemas(owner, node.id, resolver);
    if (node.type === 'repeater') {
      const items = context.scope.items;
      if (!Array.isArray(items)) continue;
      items.forEach((item, index) => {
        if (item === undefined) return;
        const selection = selectStructuralChild(item, candidates);
        if (!selection) return;
        const selected = candidates[selection.index];
        if (!selected) return;
        let path = joinId(joinId(context.path, node.id), String(index));
        for (const segment of selected.path.slice(0, -1)) path = joinId(path, segment);
        const repeated = repeatedDataScope(context.scope, item, index, 'item', context.repeatScope);
        result.push({
          node: selected.node as NestedNode,
          context: {
            ...context,
            path,
            scope: scopeWithStructuralProps(
              repeated.scope,
              selection.props,
              item,
              selection.legacy,
            ),
            repeatScope: repeated.repeatScope,
          },
        });
      });
      continue;
    }
    const props = context.scope.props;
    if (props === undefined) continue;
    const selection = selectStructuralChild(props, candidates);
    if (!selection) continue;
    const selected = candidates[selection.index];
    if (!selected) continue;
    let path = joinId(context.path, node.id);
    for (const segment of selected.path.slice(0, -1)) path = joinId(path, segment);
    result.push({
      node: selected.node as NestedNode,
      context: {
        ...context,
        path,
        scope: scopeWithStructuralProps(
          context.scope,
          selection.props,
          undefined,
          selection.legacy,
        ),
      },
    });
  }
  return result;
}
