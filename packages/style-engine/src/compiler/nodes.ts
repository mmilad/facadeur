import type { DocumentFile, NestedNode, StyleBlock, StyleChild } from '@facadeur/core';
import type { WalkState } from './types';
import { expandDeclarations, substituteRefs } from '../css/values';
import { mergeDeclarations } from '../css/declarations';
import { layoutDeclarations, layoutOverrideDeclarations } from '../layout/declarations';
import { selectorFor } from '../selectors/nodes';
import { appendCompiledRule, emitSparseStyleLayers } from './rules';
export function walk(document: DocumentFile, node: NestedNode, state: WalkState): void {
  const structural = node.type === 'repeater' || node.type === 'switch';
  if (state.rendered && !structural) emitNode(document, node, state);
  if (node.type !== 'frame' && !structural) return;
  const direction =
    node.type === 'frame' ? (node.layout?.direction ?? 'column') : state.parentDirection;
  for (const child of node.children ?? []) {
    const childPath = state.path ? `${state.path}/${child.id}` : child.id;
    walk(document, child, {
      ...state,
      parentDirection: direction,
      path: childPath,
      isRoot: false,
      rendered: true,
    });
  }
}

function emitNode(document: DocumentFile, node: NestedNode, state: WalkState): void {
  const defaultSelector = selectorFor(document, node, state);
  const selector =
    state.selectorForNode?.({
      documentId: document.id,
      node,
      nodeId: node.id,
      path: state.path,
      isRoot: state.isRoot,
      address: state.address,
      ...(node.type === 'instance' ? { targetComponentId: node.component } : {}),
      variantScope: state.variantScope,
    }) ?? defaultSelector;
  const target = { kind: 'node' as const, nodeId: node.id, isInstance: node.type === 'instance' };
  const layer = styleLayerFor(document.styles, node, state.isRoot);
  const context = state.substituteContext;
  const base = mergeDeclarations([
    layoutDeclarations(node, state.parentDirection, context),
    state.isRoot ? tokenSetDeclarations(document) : [],
    expandDeclarations(layer?.declarations, context),
    node.type === 'instance' ? [] : expandDeclarations(node.style, context),
  ]);
  appendCompiledRule(state, `${document.id}:${node.id}:base`, selector, base, target);

  const baseId = state.breakpoints[0]?.id;
  emitSparseStyleLayers(document.id, node.id, layer, selector, target, state, undefined, {
    forVariant: state.selectorForVariant,
  });

  if (node.type === 'instance' || node.layout?.breakpoints) {
    for (const [id, override] of Object.entries(node.layout?.breakpoints ?? {})) {
      if (id === baseId) continue;
      const minWidth = state.breakpoints.find((breakpoint) => breakpoint.id === id)?.minWidth;
      if (minWidth === undefined) continue;
      appendCompiledRule(
        state,
        `${document.id}:${node.id}:layout:${id}`,
        selector,
        layoutOverrideDeclarations(node, override, state.parentDirection, context),
        target,
        minWidth,
      );
    }
  }
}

function styleLayerFor(
  block: StyleBlock | undefined,
  node: NestedNode,
  isRoot: boolean,
): StyleChild | undefined {
  if (!block) return undefined;
  if (isRoot) return block;
  return block.children?.[node.id];
}

function tokenSetDeclarations(document: DocumentFile): [string, string][] {
  return Object.entries(document.tokenInterface?.sets ?? {}).map(([path, value]) => [
    customProperty(path),
    substituteRefs(value),
  ]);
}

function customProperty(path: string): string {
  return `--${path.split('.').join('-')}`;
}
