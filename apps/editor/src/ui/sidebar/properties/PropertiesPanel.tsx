'use client';

import { useEffect, useState } from 'react';
import { findParent, type FlatDocument, type FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { ComponentFields } from './content/ComponentFields.js';
import { ComponentVariants } from './content/ComponentVariants.js';
import { ContentPanel } from './content/ContentPanel.js';
import { NodeBindings } from './content/NodeBindings.js';
import { ownsComponentFeatures } from './content/owns-component-features.js';
import { LayoutPanel } from './layout/LayoutPanel.js';
import { StyleDeclarationsPanel } from './style/declarations/StyleDeclarationsPanel.js';
import { StyleOverridesPanel } from './style/overrides/StyleOverridesPanel.js';
import { NodeVariantStylesPanel } from './style/variants/NodeVariantStylesPanel.js';

type PropertyPrimaryTab = 'content' | 'style' | 'layout' | 'data';
type PropertyStyleSubTab = 'declarations' | 'variants' | 'overrides';

const PROPERTY_PRIMARY_TABS = [
  ['content', 'Content'],
  ['style', 'Style'],
  ['layout', 'Layout'],
  ['data', 'Data'],
] as const;

const PROPERTY_STYLE_SUBTABS = [
  ['declarations', 'Declarations'],
  ['variants', 'Variants'],
  ['overrides', 'Overrides'],
] as const;

export function PropertiesPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const node = snap.selectedNode;
  const showDefinitions =
    ownsComponentFeatures(snap.document.kind) && (!node || node.id === snap.document.rootId);
  const [primaryTab, setPrimaryTab] = useState<PropertyPrimaryTab>('content');
  const [styleSubTab, setStyleSubTab] = useState<PropertyStyleSubTab>('declarations');
  const selectionKey = node?.id ?? '__none__';

  useEffect(() => {
    setPrimaryTab('content');
    setStyleSubTab('declarations');
  }, [selectionKey]);

  const editableStyle = node && node.type !== 'instance';
  const contextTitle = node?.name || node?.id || snap.document.name;
  const contextKicker = node
    ? 'Selected layer'
    : snap.document.kind === 'component'
      ? 'Component'
      : snap.document.kind === 'page'
        ? 'Page'
        : snap.document.kind === 'section'
          ? 'Section'
          : 'Atom';
  const contextMeta = node
    ? `${node.type} · ${snap.document.name}`
    : snap.document.kind === 'component'
      ? 'Master · select a layer to edit'
      : `Document · select a layer to edit`;
  const contextPath = node ? selectionPath(snap.document, node) : [];

  return (
    <div className="properties">
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
      <div className="tabs property-tabs" role="tablist" aria-label="Properties sections">
        {PROPERTY_PRIMARY_TABS.map(([id, label]) => (
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
            showDefinitions ? (
              <ComponentFields session={session} snap={snap} />
            ) : (
              <p className="inspector-empty">Select a layer or an element on the stage.</p>
            )
          ) : (
            <ContentPanel
              session={session}
              snap={snap}
              node={node}
              showDefinitions={showDefinitions}
            />
          )}
        </div>
      ) : null}
      {primaryTab === 'style' ? (
        <div role="tabpanel" className="property-panel">
          {!editableStyle ? (
            <p className="inspector-empty">
              {node?.type === 'instance'
                ? 'Style is edited on the master component.'
                : 'Select a layer to edit style.'}
            </p>
          ) : (
            <>
              <div className="tabs property-subtabs" role="tablist" aria-label="Style sections">
                {PROPERTY_STYLE_SUBTABS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    name={`property-style-tab-${id}`}
                    className={styleSubTab === id ? 'tab is-active' : 'tab'}
                    aria-selected={styleSubTab === id}
                    onClick={() => setStyleSubTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {styleSubTab === 'declarations' ? (
                <StyleDeclarationsPanel session={session} snap={snap} nodeId={node.id} />
              ) : null}
              {styleSubTab === 'variants' ? (
                node.id !== snap.document.rootId ? (
                  <NodeVariantStylesPanel session={session} snap={snap} nodeId={node.id} />
                ) : (
                  <p className="meta">
                    Variant styles for child layers appear when a nested node is selected.
                  </p>
                )
              ) : null}
              {styleSubTab === 'overrides' ? (
                <StyleOverridesPanel session={session} snap={snap} node={node} />
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {primaryTab === 'layout' ? (
        <div role="tabpanel" className="property-panel">
          {!node ? (
            <p className="inspector-empty">Select a layer to edit layout.</p>
          ) : (
            <LayoutPanel session={session} snap={snap} node={node} />
          )}
        </div>
      ) : null}
      {primaryTab === 'data' ? (
        <div role="tabpanel" className="property-panel">
          {!node ? (
            showDefinitions ? (
              <ComponentVariants session={session} snap={snap} />
            ) : (
              <p className="inspector-empty">Select a layer to edit data bindings.</p>
            )
          ) : node.type === 'instance' ? (
            <p className="inspector-empty">Use the Content tab for field and variant overrides.</p>
          ) : (
            <>
              <NodeBindings session={session} snap={snap} node={node} />
              {showDefinitions ? <ComponentVariants session={session} snap={snap} /> : null}
            </>
          )}
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
