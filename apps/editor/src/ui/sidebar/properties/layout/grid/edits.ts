import { applyCommand, type Breakpoint, type Command } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../../domain/session';
import {
  canonicalStyleProperty,
  effectiveStyleDeclarations,
} from '../../../../../domain/edits/style-edit';
import { layoutStyleField } from '../style-field';

export function gridDeclarations(
  snap: EditorSnapshot,
  nodeId: string,
  breakpointId: string | null,
  breakpoints: readonly Breakpoint[],
  inherited: Record<string, string> = {},
) {
  const block = structuredClone(snap.activeDocument.styles ?? {});
  const owner =
    nodeId === snap.activeDocument.rootId ? block : ((block.children ??= {})[nodeId] ??= {});
  const node = snap.activeDocument.nodes[nodeId];
  const baseDeclarations = owner.declarations;
  if (node?.type !== 'instance' && node?.style)
    owner.declarations = { ...owner.declarations, ...node.style };
  const declarations = {
    ...Object.fromEntries(
      Object.entries(inherited).map(([key, value]) => [canonicalStyleProperty(key), value]),
    ),
    ...Object.fromEntries(
      Object.entries(
        effectiveStyleDeclarations(
          block,
          snap.activeDocument.rootId,
          { nodeId, ...(breakpointId ? { breakpointId } : {}) },
          breakpoints,
        ),
      ).map(([key, value]) => [canonicalStyleProperty(key), value]),
    ),
  };
  // Resolve gap separately before flattening loses shorthand/longhand provenance.
  // This is a display record only; stored CSS and spacing policy are untouched.
  const gaps: Record<string, string> = {};
  const applyGaps = (layer: Record<string, string> | undefined) => {
    for (const [key, value] of Object.entries(layer ?? {})) {
      const property = canonicalStyleProperty(key);
      if (property === 'gap') {
        delete gaps['row-gap'];
        delete gaps['column-gap'];
        gaps.gap = value;
      } else if (property === 'row-gap' || property === 'column-gap') {
        gaps[property] = value;
      }
    }
  };
  applyGaps(inherited);
  applyGaps(baseDeclarations);
  if (node?.type !== 'instance') applyGaps(node?.style);
  if (breakpointId) {
    const ordered = [...breakpoints].sort((left, right) => left.minWidth - right.minWidth);
    const focused = ordered.find((item) => item.id === breakpointId);
    for (const breakpoint of ordered) {
      if (focused && breakpoint.minWidth > focused.minWidth) break;
      applyGaps(owner.breakpoints?.[breakpoint.id]?.declarations);
    }
    if (!focused) applyGaps(owner.breakpoints?.[breakpointId]?.declarations);
  }
  for (const property of ['gap', 'row-gap', 'column-gap']) delete declarations[property];
  return { ...declarations, ...gaps };
}

/** Build against a local evolving document, then publish all style-owner edits once. */
export function commitGridChanges(
  session: EditorSession,
  snap: EditorSnapshot,
  breakpointId: string | null,
  changes: readonly { nodeId: string; patch: Record<string, string | null> }[],
) {
  const commands: Command[] = [];
  let document = session.getSnapshot().document;
  for (const { nodeId, patch } of changes) {
    for (const [property, value] of Object.entries(patch)) {
      const field = layoutStyleField(session, snap, nodeId, breakpointId, property);
      const command = field.command(value, { ...snap, document });
      if (!command) continue;
      document = applyCommand(document, command);
      commands.push(command);
    }
  }
  if (commands.length) session.execute({ type: 'batch', commands });
}
