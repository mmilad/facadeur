import { resolveInstanceVariantContext } from '../../../../../domain/instance-variant-context.js';
import type { EditorSession, EditorSnapshot } from '../../../../../domain/session.js';
import { editorBreakpoints } from '../../../../../domain/viewport/viewport-edit.js';
import { gridDeclarations } from './edits.js';

/** Resolve appearance from the referenced master without changing its store. */
export function gridInstance(
  session: EditorSession,
  snap: EditorSnapshot,
  nodeId: string,
  breakpointId: string | null,
) {
  const instance = snap.activeDocument.nodes[nodeId];
  if (instance?.type !== 'instance') return null;
  const target = session
    .boardStores()
    .map((store) => store.getDocument())
    .find((document) => document.id === instance.component);
  if (!target) return null;
  const context = resolveInstanceVariantContext({
    ownerDocument: snap.document,
    ownerVariantName: snap.activeVariantName,
    instance,
    targetDocument: target,
  });
  const master = structuredClone(context.document);
  master.styles ??= {};
  for (const [axis, value] of Object.entries(context.axes)) {
    const layer = master.styles.variants?.[axis]?.[value];
    master.styles.declarations = { ...master.styles.declarations, ...layer?.declarations };
  }
  return {
    root: master.nodes[master.rootId],
    declarations: gridDeclarations(
      { ...snap, activeDocument: master },
      master.rootId,
      breakpointId,
      editorBreakpoints(master, snap.design),
    ),
  };
}
