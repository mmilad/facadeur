import { type FlatNode, type LayoutOverride } from '@facadeur/core';
import {
  clearLayoutBreakpoint,
  dimensionTokenRefs,
  writeLayoutFields,
  type LayoutPatch,
} from '../editing.js';
import type { EditorSession, EditorSnapshot } from '../session.js';
import { editorBreakpoints, viewportEditContext } from '../viewport-edit.js';
import { LayoutControl, layoutControlValue } from './controls/layout/index.js';
import { OverrideCue } from './viewport-bar.js';

export function LayoutPanel({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: FlatNode;
}) {
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const breakpointId = ctx.writingBreakpointId;
  const tokens = dimensionTokenRefs(snap.design.tokens);
  const cueViewport = ctx.overrideViewport;
  const controlValue = layoutControlValue({
    nodeType: node.type,
    layout: node.layout,
    writingBreakpointId: breakpointId,
  });

  function cue(key: keyof LayoutOverride) {
    if (!cueViewport) return null;
    const override = node.layout?.breakpoints?.[cueViewport.id];
    if (!override || override[key] === undefined) return null;
    return (
      <OverrideCue
        minWidth={cueViewport.minWidth}
        onReset={() =>
          session.execute({
            type: 'setProp',
            nodeId: node.id,
            prop: 'layout',
            value: writeLayoutFields(node.layout, cueViewport.id, { [key]: null }),
          })
        }
      />
    );
  }

  function commit(patch: LayoutPatch) {
    session.execute({
      type: 'setProp',
      nodeId: node.id,
      prop: 'layout',
      value: writeLayoutFields(node.layout, breakpointId, patch),
    });
  }

  return (
    <div className="stack">
      <h3>Layout</h3>
      {cueViewport && node.layout?.breakpoints?.[cueViewport.id] ? (
        <button
          type="button"
          className="text-button"
          onClick={() =>
            session.execute({
              type: 'setProp',
              nodeId: node.id,
              prop: 'layout',
              value: clearLayoutBreakpoint(node.layout, cueViewport.id),
            })
          }
        >
          Reset layout {cueViewport.id}
        </button>
      ) : null}
      <LayoutControl
        value={controlValue}
        dimensionTokens={tokens}
        writingBreakpointId={breakpointId}
        onCommit={commit}
        afterField={cue}
      />
    </div>
  );
}
