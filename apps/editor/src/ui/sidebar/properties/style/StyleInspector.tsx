import { useState, type ReactNode } from 'react';
import type { FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { styleStateNames, type StyleStateName } from '../../../../domain/style-edit.js';
import { editorBreakpoints, viewportEditContext } from '../../../../domain/viewport-edit.js';
import { TokenPreviewProvider } from '../../../controls/fields/TokenPreviewContext.js';
import type { StructuredDeclarationGroup } from '../../../controls/generic/CssDeclarationsControl.js';
import { Field, Select } from '../../../form/index.js';
import { LayoutPanel } from '../layout/LayoutPanel.js';
import type { LayoutControlSectionContent } from '../../../controls/layout/index.js';
import { DeclarationEditor } from './declarations/declaration-editor.js';
import { StyleOverridesPanel } from './overrides/StyleOverridesPanel.js';
import { NodeVariantStylesPanel } from './variants/NodeVariantStylesPanel.js';

export function StyleInspector({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: FlatNode;
}) {
  const [state, setState] = useState<StyleStateName | ''>('');
  // Content uses the effective variant document. Style sources always stay on
  // the canonical document so a named preset is edited through variantName.
  const styleNode = snap.document.nodes[node.id] ?? node;
  const activeNode = snap.activeDocument.nodes[node.id] ?? node;
  const overrideNode =
    activeNode.type === 'instance'
      ? (styleNode as Exclude<FlatNode, { type: 'instance' }>)
      : activeNode;
  const viewport = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });

  return (
    <TokenPreviewProvider
      design={snap.design}
      document={snap.activeDocument}
      breakpointId={viewport.writingBreakpointId}
    >
      <div className="style-inspector">
        {activeNode.type !== 'instance' ? (
          <Field label="State">
            <Select
              name="style-state"
              value={state}
              options={[
                { value: '', label: 'Normal' },
                ...styleStateNames.map((name) => ({ value: name, label: name })),
              ]}
              onCommit={(next) => setState(next as StyleStateName | '')}
            />
          </Field>
        ) : null}
        {activeNode.type === 'instance' ? (
          <>
            <LayoutPanel session={session} snap={snap} node={activeNode} />
            <p className="meta">Edit the master component for shared styles.</p>
          </>
        ) : (
          <>
            <DeclarationEditor
              session={session}
              snap={snap}
              target={{
                nodeId: styleNode.id,
                variantName: snap.activeVariantName ?? undefined,
                state: state || undefined,
              }}
              renderStructuredSection={
                !state
                  ? (group, content) => (
                      <LayoutPanel
                        key={group}
                        session={session}
                        snap={snap}
                        node={activeNode}
                        section={group}
                        sectionContent={structuredSectionContent(group, content)}
                      />
                    )
                  : undefined
              }
            />
            <details className="fold advanced-css">
              <summary>Advanced CSS</summary>
              <StyleOverridesPanel session={session} snap={snap} node={overrideNode} />
              {snap.document.variants.length ? (
                <details className="fold">
                  <summary>Existing axis rules</summary>
                  <NodeVariantStylesPanel session={session} snap={snap} nodeId={styleNode.id} />
                </details>
              ) : null}
            </details>
          </>
        )}
      </div>
    </TokenPreviewProvider>
  );
}

function structuredSectionContent(
  group: StructuredDeclarationGroup,
  content: ReactNode,
): LayoutControlSectionContent {
  return { [group]: content } as LayoutControlSectionContent;
}
