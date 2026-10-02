import type { VariantNodeOverride } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import {
  canonicalStyleProperty,
  readStyleDeclarations,
  variantStyleBlock,
  writeStyleDeclaration,
} from '../../../../domain/edits/style-edit.js';

/** Match the existing node/base/variant/viewport cascade without moving unrelated declarations. */
export function layoutStyleField(
  session: EditorSession,
  snap: EditorSnapshot,
  nodeId: string,
  breakpointId: string | null,
  property: string,
) {
  const target = { nodeId, ...(breakpointId ? { breakpointId } : {}) };
  const variantName = snap.activeVariantName;
  const block = variantName ? variantStyleBlock(snap.document, variantName) : snap.document.styles;
  const matchingKey = (style: Record<string, string> | undefined) =>
    Object.keys(style ?? {}).find((key) => canonicalStyleProperty(key) === property);
  const node = snap.activeDocument.nodes[nodeId];
  const nodeKey = node?.type !== 'instance' ? matchingKey(node?.style) : undefined;
  const preset = snap.document.variantPresets?.find((item) => item.name === variantName);
  const entryKey = variantNodeKey(preset?.overrides?.nodes, nodeId);
  const ownNodeKey = matchingKey(preset?.overrides?.nodes?.[entryKey]?.style);
  const overridden = Boolean(
    matchingKey(readStyleDeclarations(block, snap.document.rootId, target)) ||
    (!breakpointId && (variantName ? ownNodeKey : nodeKey)),
  );

  function commit(value: string | null) {
    const current = session.getSnapshot();
    if (variantName && !breakpointId && nodeKey) {
      const original = current.document.variantPresets?.find((item) => item.name === variantName);
      if (!original) return;
      const next = structuredClone(original);
      const overrides = (next.overrides ??= {});
      const nodes = (overrides.nodes ??= {});
      const key = variantNodeKey(nodes, nodeId);
      const own = (nodes[key] ??= {});
      const style = { ...own.style };
      for (const key of Object.keys(style)) {
        if (canonicalStyleProperty(key) === property) delete style[key];
      }
      if (value !== null) style[nodeKey] = value;
      if (Object.keys(style).length) own.style = style;
      else delete own.style;
      if (!Object.keys(own).length) delete nodes[key];
      if (!Object.keys(nodes).length) delete overrides.nodes;
      if (!Object.keys(overrides).length) delete next.overrides;
      session.execute({ type: 'setVariantPreset', preset: next });
      return;
    }
    if (!variantName && !breakpointId && nodeKey) {
      session.execute({ type: 'setStyle', nodeId, property: nodeKey, value });
      return;
    }
    const source = variantName
      ? variantStyleBlock(current.document, variantName)
      : current.document.styles;
    const style = writeStyleDeclaration(source, current.document.rootId, target, property, value);
    if (variantName) session.execute({ type: 'setVariantStyleBlock', name: variantName, style });
    else session.execute({ type: 'setStyleBlock', style });
  }
  return { overridden, commit };
}

function variantNodeKey(nodes: Record<string, VariantNodeOverride> | undefined, nodeId: string) {
  return nodes && Object.prototype.hasOwnProperty.call(nodes, nodeId)
    ? nodeId
    : (Object.keys(nodes ?? {}).find((key) => key.endsWith(`.${nodeId}`)) ?? nodeId);
}
