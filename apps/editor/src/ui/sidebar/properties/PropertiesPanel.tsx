'use client';

import { useEffect, useState } from 'react';
import { findParent, type FlatDocument, type FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { NestedFieldsPanel } from './content/NestedFieldsPanel.js';
import { ContentPanel } from './content/ContentPanel.js';
import { InstanceContext } from './content/InstanceContext.js';
import { StyleInspector } from './style/StyleInspector.js';
import { ComponentTokensPanel } from './component/ComponentTokensPanel.js';
import { TokenPreviewProvider } from '../../controls/fields/TokenPreviewContext.js';
import { editorBreakpoints, viewportEditContext } from '../../../domain/viewport/viewport-edit.js';
import { VariantTabs } from './VariantTabs.js';

type PropertyPrimaryTab = 'style' | 'content' | 'tokens';

function propertyPrimaryTabs(
  showTokens: boolean,
): readonly (readonly [PropertyPrimaryTab, string])[] {
  const tabs: (readonly [PropertyPrimaryTab, string])[] = [
    ['style', 'Style'],
    ['content', 'Content'],
  ];
  if (showTokens) tabs.push(['tokens', 'Tokens']);
  return tabs;
}

export function PropertiesPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const inspectorSnap = snap.activeVariantName
    ? {
        ...snap,
        document: snap.activeDocument,
        selectedNode: snap.activeDocument.nodes[snap.selectedNodeId ?? ''] ?? null,
      }
    : snap;
  const node = inspectorSnap.selectedNode;
  const [primaryTab, setPrimaryTab] = useState<PropertyPrimaryTab>('content');
  const isRoot = node?.id === inspectorSnap.document.rootId;
  const showComponentTokens =
    node?.id === snap.document.rootId &&
    !snap.nestedSelection &&
    (snap.document.kind === 'atom' ||
      snap.document.kind === 'component' ||
      snap.document.kind === 'section');
  const propertyTabs = propertyPrimaryTabs(showComponentTokens);
  const tokenViewport = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });

  useEffect(() => {
    if (primaryTab === 'tokens' && !showComponentTokens) setPrimaryTab('content');
  }, [primaryTab, showComponentTokens]);

  if (snap.nestedSelection) return <NestedFieldsPanel session={session} snap={snap} />;

  const contextTitle = node
    ? node.type === 'instance'
      ? snap.componentTarget?.name || node.component
      : isRoot
        ? inspectorSnap.document.name
        : node.name || node.id
    : inspectorSnap.document.name;
  const contextKicker =
    node?.type === 'instance'
      ? 'Instance override'
      : isRoot
        ? `${documentKindLabel(inspectorSnap.document.kind)} root`
        : node
          ? 'Selected layer'
          : inspectorSnap.document.kind === 'component'
            ? 'Component'
            : inspectorSnap.document.kind === 'page'
              ? 'Page'
              : inspectorSnap.document.kind === 'section'
                ? 'Section'
                : 'Atom';
  const contextMeta =
    node?.type === 'instance'
      ? `Local to ${inspectorSnap.document.name} · edit master for shared changes`
      : node
        ? isRoot
          ? `Root frame · ${inspectorSnap.document.name}`
          : `${node.type} · ${inspectorSnap.document.name}`
        : inspectorSnap.document.kind === 'component'
          ? 'Master · select a layer to edit'
          : `Document · select a layer to edit`;
  const contextPath = node ? selectionPath(inspectorSnap.document, node) : [];

  return (
    <div className="properties">
      {node?.type === 'instance' ? (
        <InstanceContext session={session} snap={snap} node={node} />
      ) : (
        <div className="inspector-context" data-testid="inspector-context">
          <span className="inspector-context-kicker">{contextKicker}</span>
          <strong className="inspector-context-title">{contextTitle}</strong>
          <span className="inspector-context-meta">{contextMeta}</span>
          {contextPath.length > 1 ? (
            <span className="inspector-context-path" title={contextPath.join(' / ')}>
              {contextPath.join(' / ')}
            </span>
          ) : null}
        </div>
      )}
      <VariantTabs session={session} snap={snap} />
      <div className="tabs property-tabs" role="tablist" aria-label="Properties sections">
        {propertyTabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            name={`property-tab-${id}`}
            className={primaryTab === id ? 'tab is-active' : 'tab'}
            aria-selected={primaryTab === id}
            onClick={() => setPrimaryTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {primaryTab === 'content' ? (
        <div role="tabpanel" className="property-panel">
          {!node ? (
            <p className="inspector-empty">
              Select a layer or an element on the stage. Shared fields and events are edited in
              Schema.
            </p>
          ) : (
            <ContentPanel session={session} snap={inspectorSnap} node={node} />
          )}
        </div>
      ) : null}
      {primaryTab === 'style' ? (
        <div role="tabpanel" className="property-panel">
          {node ? (
            <StyleInspector session={session} snap={snap} node={node} />
          ) : (
            <p className="inspector-empty">Select a layer to edit style.</p>
          )}
        </div>
      ) : null}
      {primaryTab === 'tokens' && showComponentTokens ? (
        <div role="tabpanel" className="property-panel">
          <TokenPreviewProvider
            design={snap.design}
            document={snap.document}
            breakpointId={tokenViewport.writingBreakpointId}
            breakpoints={tokenViewport.breakpoints.slice()}
          >
            <ComponentTokensPanel session={session} snap={snap} />
          </TokenPreviewProvider>
        </div>
      ) : null}
    </div>
  );
}

function selectionPath(doc: FlatDocument, selected: FlatNode): string[] {
  const path: string[] = [];
  let current: FlatNode | undefined = selected;
  const seen = new Set<string>();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(nodeLabel(current));
    if (current.id === doc.rootId) break;
    current = findParent(doc, current.id);
  }

  if (path[0] === 'root') path[0] = doc.name;
  else path.unshift(doc.name);
  return path;
}

function nodeLabel(node: FlatNode): string {
  if (node.name) return node.name;
  if (node.type === 'instance') return node.component;
  if (node.type === 'text' && node.text?.trim()) {
    const value = node.text.trim();
    return value.length > 28 ? `${value.slice(0, 28)}…` : value;
  }
  return node.id;
}

function documentKindLabel(kind: FlatDocument['kind']): string {
  switch (kind) {
    case 'component':
      return 'Component';
    case 'page':
      return 'Page';
    case 'section':
      return 'Section';
    default:
      return 'Atom';
  }
}
