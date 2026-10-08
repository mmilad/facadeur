import { useState } from 'react';
import { findParent, type FlatNode, type StyleBlock } from '@facadeur/core';
import { nestedInstanceStyleTarget } from '../../../../domain/nested-selection/style-target';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import {
  effectiveStyleDeclarations,
  styleStateNames,
  type StyleStateName,
} from '../../../../domain/edits/style-edit';
import {
  editorBreakpoints,
  viewportEditContext,
} from '../../../../domain/viewport/viewport-edit';
import { Field, Select } from '../../../form/index';
import { TokenPreviewProvider } from '../../../controls/fields/TokenPreviewContext';
import { DeclarationEditor } from './declarations/declaration-editor';

export function NestedStyleInspector({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const selection = snap.nestedSelection;
  const targetNodeId = selection
    ? nestedInstanceStyleTarget(selection, snap.document.rootId)
    : null;
  const [state, setState] = useState<StyleStateName | ''>('');
  if (!selection || !targetNodeId || selection.node.type !== 'instance') return null;

  const master = selection.target;
  const masterRoot = master?.nodes[master.rootId];
  const viewport = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const inheritedDeclarations = nestedInheritedDeclarations({
    master: master ?? undefined,
    masterRoot,
    containing: selection.document,
    selectedNodeId: selection.node.id,
    axes: selection.node.type === 'instance' ? selection.node.variants : undefined,
    state: state || undefined,
    breakpointId: viewport.writingBreakpointId,
    design: snap.design,
  });
  const tokenDocument = master
    ? {
        ...snap.activeDocument,
        tokenInterface: {
          ...snap.activeDocument.tokenInterface,
          sets: {
            ...snap.activeDocument.tokenInterface?.sets,
            ...selection.document.tokenInterface?.sets,
            ...master.tokenInterface?.sets,
          },
        },
      }
    : snap.activeDocument;

  return (
    <TokenPreviewProvider
      declarations={inheritedDeclarations}
      design={snap.design}
      document={tokenDocument}
      breakpointId={viewport.writingBreakpointId}
    >
      <div className="style-inspector">
        <Field label="State">
          <Select
            name="style-state"
            aria-label="State"
            value={state}
            options={[
              { value: '', label: 'Normal' },
              ...styleStateNames.map((name) => ({ value: name, label: name })),
            ]}
            onCommit={(next) => setState(next as StyleStateName | '')}
          />
        </Field>
        <p className="meta">
          Local appearance for this nested instance. Shared appearance belongs to the master.
        </p>
        <DeclarationEditor
          session={session}
          snap={snap}
          inheritedDeclarations={inheritedDeclarations}
          inheritedTokenDocument={tokenDocument}
          instanceRoot={masterRoot}
          instanceTarget
          target={{
            nodeId: targetNodeId,
            variantName: snap.activeVariantName ?? undefined,
            state: state || undefined,
          }}
        />
      </div>
    </TokenPreviewProvider>
  );
}

function nestedInheritedDeclarations(input: {
  master?: EditorSnapshot['activeDocument'];
  masterRoot?: FlatNode;
  containing: EditorSnapshot['activeDocument'];
  selectedNodeId: string;
  axes?: Record<string, string>;
  state?: StyleStateName;
  breakpointId: string | null;
  design: EditorSnapshot['design'];
}): Record<string, string> {
  const { master, masterRoot, containing, selectedNodeId, axes, state, breakpointId, design } =
    input;
  const declarations: Record<string, string> = {};
  if (master) {
    const rootStyles = structuredClone(master.styles ?? {}) as StyleBlock;
    if (masterRoot && masterRoot.type !== 'instance') {
      rootStyles.declarations = { ...rootStyles.declarations, ...masterRoot.style };
    }
    Object.assign(
      declarations,
      effectiveStyleDeclarations(
        rootStyles,
        master.rootId,
        {
          nodeId: master.rootId,
          state,
          ...(breakpointId ? { breakpointId } : {}),
        },
        editorBreakpoints(master, design),
      ),
    );
    for (const axis of master.variants) {
      const value = axes?.[axis.name] ?? axis.default ?? axis.values[0];
      if (!value) continue;
      const layer = master.styles?.variants?.[axis.name]?.[value];
      if (!layer) continue;
      Object.assign(declarations, layer.declarations ?? {});
      if (state) Object.assign(declarations, layer.states?.[state] ?? {});
    }
  }

  const localPath = pathInDocument(containing, selectedNodeId);
  const localPathKey = localPath.join('/');
  const localPaths = [...new Set([selectedNodeId, localPathKey].filter(Boolean))];
  const localBreakpoints = editorBreakpoints(containing, design);
  for (const path of localPaths) {
    Object.assign(
      declarations,
      effectiveStyleDeclarations(
        containing.styles,
        containing.rootId,
        {
          nodeId: path,
          state,
          ...(breakpointId ? { breakpointId } : {}),
        },
        localBreakpoints,
      ),
    );
  }
  return declarations;
}

function pathInDocument(document: EditorSnapshot['activeDocument'], nodeId: string): string[] {
  const path: string[] = [];
  const seen = new Set<string>();
  let current = document.nodes[nodeId];
  while (current && current.id !== document.rootId && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.id);
    current = findParent(document, current.id);
  }
  return path;
}
