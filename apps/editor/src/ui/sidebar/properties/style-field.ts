import { applyCommand, type Command, type VariantNodeOverride } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import {
  canonicalStyleProperty,
  readStyleDeclarations,
  variantStyleBlock,
  writeStyleDeclaration,
} from '../../../domain/edits/style-edit';

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

  function command(value: string | null, current = session.getSnapshot()): Command | undefined {
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
      const presetCommand: Command = { type: 'setVariantPreset', preset: next };
      if (
        value === null &&
        matchingKey(
          readStyleDeclarations(
            variantStyleBlock(current.document, variantName),
            current.document.rootId,
            target,
          ),
        )
      ) {
        return {
          type: 'batch',
          commands: [
            presetCommand,
            {
              type: 'setVariantStyleBlock',
              name: variantName,
              style: writeStyleDeclaration(
                variantStyleBlock(current.document, variantName),
                current.document.rootId,
                target,
                property,
                null,
              ),
            },
          ],
        };
      }
      return presetCommand;
    }
    if (!variantName && !breakpointId && nodeKey) {
      const inlineCommand: Command = { type: 'setStyle', nodeId, property: nodeKey, value };
      if (
        value === null &&
        matchingKey(readStyleDeclarations(current.document.styles, current.document.rootId, target))
      ) {
        return {
          type: 'batch',
          commands: [
            inlineCommand,
            {
              type: 'setStyleBlock',
              style: writeStyleDeclaration(
                current.document.styles,
                current.document.rootId,
                target,
                property,
                null,
              ),
            },
          ],
        };
      }
      return inlineCommand;
    }
    const source = variantName
      ? variantStyleBlock(current.document, variantName)
      : current.document.styles;
    const style = writeStyleDeclaration(source, current.document.rootId, target, property, value);
    return variantName
      ? { type: 'setVariantStyleBlock', name: variantName, style }
      : { type: 'setStyleBlock', style };
  }
  function commit(value: string | null) {
    const next = command(value);
    if (next) session.execute(next);
  }
  return { overridden, commit, command };
}

function variantNodeKey(nodes: Record<string, VariantNodeOverride> | undefined, nodeId: string) {
  return nodes && Object.prototype.hasOwnProperty.call(nodes, nodeId)
    ? nodeId
    : (Object.keys(nodes ?? {}).find((key) => key.endsWith(`.${nodeId}`)) ?? nodeId);
}

/** Compound inspector edits share normal declaration priority and one Undo. */
export function commitStyleFields(
  session: EditorSession,
  snap: EditorSnapshot,
  nodeId: string,
  breakpointId: string | null,
  patch: Record<string, string | null>,
  initial?: Command,
) {
  const commands: Command[] = initial ? [initial] : [];
  let document = initial
    ? applyCommand(session.getSnapshot().document, initial)
    : session.getSnapshot().document;
  for (const [property, value] of Object.entries(patch)) {
    const command = layoutStyleField(
      session,
      snap,
      nodeId,
      breakpointId,
      canonicalStyleProperty(property),
    ).command(value, { ...snap, document });
    if (!command) continue;
    document = applyCommand(document, command);
    commands.push(command);
  }
  if (commands.length) session.execute({ type: 'batch', commands });
}
