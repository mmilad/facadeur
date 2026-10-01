'use client';

import { useState } from 'react';
import { findParent, type FlatDocument, type FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { ownsVariantContract, variantSummaries } from '../../../domain/variant-edit.js';
import { createNamedVariant, renameNamedVariant } from '../../../domain/variant-actions.js';
import { VariantActionButton } from '../../controls/variants/VariantActionButton.js';
import { AddPopover, Field, TextInput } from '../../form/index.js';
import { NestedFieldsPanel } from './content/NestedFieldsPanel.js';
import { ContentPanel } from './content/ContentPanel.js';
import { InstanceContext } from './content/InstanceContext.js';
import { StyleInspector } from './style/StyleInspector.js';

type PropertyPrimaryTab = 'content' | 'style';

const PROPERTY_PRIMARY_TABS = [
  ['content', 'Content'],
  ['style', 'Style'],
] as const;

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
    </div>
  );
}

function VariantTabs({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [newName, setNewName] = useState('');
  if (!ownsVariantContract(snap.document.kind)) return null;

  const variants = variantSummaries(snap.document);
  function addVariant() {
    if (createNamedVariant(session, newName)) setNewName('');
  }

  return (
    <div className="variant-tabs" role="tablist" aria-label="Component variants">
      <div className="variant-tabs-head">
        <span className="variant-tabs-label">Variant</span>
        <AddPopover label="Add variant" onConfirm={addVariant}>
          <Field label="Name">
            <TextInput
              name="new-variant-name"
              value={newName}
              placeholder="compact"
              onChange={setNewName}
            />
          </Field>
        </AddPopover>
      </div>
      <div className="variant-tabs-list">
        {variants.map((variant) => {
          const active = (snap.activeVariantName ?? 'default') === variant.name;
          return (
            <div key={variant.name} className="variant-tab-entry">
              <VariantActionButton
                role="tab"
                name={`variant-tab-${variant.name}`}
                label={variant.label}
                onRename={(label) => renameNamedVariant(session, variant.name, label)}
                className={active ? 'variant-tab is-active' : 'variant-tab'}
                aria-selected={active}
                onClick={() => session.setActiveVariant(variant.isDefault ? null : variant.name)}
              >
                {variant.label}
              </VariantActionButton>
            </div>
          );
        })}
      </div>
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
