import { useState, type ReactNode } from 'react';
import type { FlatNode } from '@facadeur/core';
import { resolveSelectedInstance } from '../../../../domain/instance-variant-context';
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
import { TokenPreviewProvider } from '../../../controls/fields/TokenPreviewContext';
import type { StructuredDeclarationGroup } from '../../../controls/generic/CssDeclarationsControl';
import { Field, Select } from '../../../form/index';
import { LayoutPanel } from '../layout/LayoutPanel';
import type { LayoutControlSectionContent } from '../../../controls/layout/index';
import { DeclarationEditor } from './declarations/declaration-editor';
import { StyleOverridesPanel } from './overrides/StyleOverridesPanel';
import { NodeVariantStylesPanel } from './variants/NodeVariantStylesPanel';

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
  const viewport = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const instanceContext = resolveSelectedInstance(snap);
  const master = instanceContext?.document;
  const masterRoot = master?.nodes[master.rootId];
  const inheritedStyles = master ? structuredClone(master.styles ?? {}) : undefined;
  if (inheritedStyles && masterRoot && masterRoot.type !== 'instance') {
    inheritedStyles.declarations = { ...inheritedStyles.declarations, ...masterRoot.style };
    // Legacy axes remain an instance input, even though the nested selection UI is read-only.
    for (const [axis, value] of Object.entries(instanceContext?.axes ?? {})) {
      const layer = master.styles?.variants?.[axis]?.[value];
      Object.assign(inheritedStyles.declarations, layer?.declarations);
      for (const [name, declarations] of Object.entries(layer?.states ?? {})) {
        inheritedStyles.states ??= {};
        inheritedStyles.states[name as StyleStateName] = {
          ...inheritedStyles.states[name as StyleStateName],
          ...declarations,
        };
      }
    }
  }
  const inheritedDeclarations = master
    ? effectiveStyleDeclarations(
        inheritedStyles,
        master.rootId,
        {
          nodeId: master.rootId,
          state: state || undefined,
          ...(viewport.writingBreakpointId ? { breakpointId: viewport.writingBreakpointId } : {}),
        },
        editorBreakpoints(master, snap.design),
      )
    : undefined;

  return (
    <TokenPreviewProvider
      declarations={{
        ...inheritedDeclarations,
        ...effectiveStyleDeclarations(
          snap.activeDocument.styles,
          snap.activeDocument.rootId,
          {
            nodeId: node.id,
            state: state || undefined,
            ...(viewport.writingBreakpointId ? { breakpointId: viewport.writingBreakpointId } : {}),
          },
          viewport.breakpoints,
        ),
      }}
      design={snap.design}
      document={
        master
          ? {
              ...snap.activeDocument,
              tokenInterface: {
                ...snap.activeDocument.tokenInterface,
                sets: {
                  ...snap.activeDocument.tokenInterface?.sets,
                  ...master.tokenInterface?.sets,
                },
              },
            }
          : snap.activeDocument
      }
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
        {activeNode.type === 'instance' ? (
          <p className="meta">
            Inherited appearance from {master?.name ?? activeNode.component}. Edits override this
            usage across its resolved variants.
          </p>
        ) : null}
        <DeclarationEditor
          session={session}
          snap={snap}
          inheritedDeclarations={inheritedDeclarations}
          inheritedTokenDocument={master}
          instanceRoot={masterRoot}
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
        {activeNode.type !== 'instance' ? (
          <details className="fold advanced-css">
            <summary>Advanced CSS</summary>
            <StyleOverridesPanel session={session} snap={snap} node={activeNode} />
            {snap.document.variants.length ? (
              <details className="fold">
                <summary>Existing axis rules</summary>
                <NodeVariantStylesPanel session={session} snap={snap} nodeId={styleNode.id} />
              </details>
            ) : null}
          </details>
        ) : null}
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
