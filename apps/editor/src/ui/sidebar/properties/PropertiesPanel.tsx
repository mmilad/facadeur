'use client';

import { useState } from 'react';
import { findParent, type FlatDocument, type FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { AddPopover, Field, TextInput } from '../../form/index.js';
import { ComponentFields } from './content/ComponentFields.js';
import { ComponentEvents } from './content/ComponentEvents.js';
import { ComponentExpose } from './content/ComponentExpose.js';
import { ComponentVariants } from './content/ComponentVariants.js';
import { ContentPanel } from './content/ContentPanel.js';
import { NodeBindings } from './content/NodeBindings.js';
import { ownsComponentFeatures } from './content/owns-component-features.js';
import { StyleInspector } from './style/StyleInspector.js';

type PropertyPrimaryTab = 'content' | 'style' | 'data';

const PROPERTY_PRIMARY_TABS = [
  ['content', 'Content'],
  ['style', 'Style'],
  ['data', 'Data'],
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
  const showDefinitions =
    ownsComponentFeatures(inspectorSnap.document.kind) &&
    (!node || node.id === inspectorSnap.document.rootId);
  const [primaryTab, setPrimaryTab] = useState<PropertyPrimaryTab>('content');
  const isRoot = node?.id === inspectorSnap.document.rootId;

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
            showDefinitions ? (
              <>
                <ComponentFields session={session} snap={inspectorSnap} />
                <ComponentEvents session={session} snap={inspectorSnap} />
                <ComponentExpose session={session} snap={inspectorSnap} />
              </>
            ) : (
              <p className="inspector-empty">Select a layer or an element on the stage.</p>
            )
          ) : (
            <ContentPanel
              session={session}
              snap={inspectorSnap}
              node={node}
              showDefinitions={showDefinitions}
            />
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
      {primaryTab === 'data' ? (
        <div role="tabpanel" className="property-panel">
          {!node ? (
            showDefinitions ? (
              <ComponentVariants session={session} snap={inspectorSnap} />
            ) : (
              <p className="inspector-empty">Select a layer to edit data bindings.</p>
            )
          ) : node.type === 'instance' ? (
            <p className="inspector-empty">Use the Content tab for field and variant overrides.</p>
          ) : (
            <>
              <NodeBindings session={session} snap={inspectorSnap} node={node} />
              {showDefinitions ? (
                <ComponentVariants session={session} snap={inspectorSnap} />
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function VariantTabs({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [newName, setNewName] = useState('');
  if (snap.document.kind !== 'component') return null;

  const names = [
    'default',
    ...(snap.document.variantPresets ?? [])
      .map((preset) => preset.name)
      .filter((name) => name !== 'default'),
  ];
  function addVariant() {
    const name = newName.trim();
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
      session.setNotice(
        'Variant names start with a letter and use letters, numbers, _ or -',
        'error',
      );
      return;
    }
    if (names.includes(name)) {
      session.setNotice(`Variant "${name}" already exists`, 'error');
      return;
    }
    session.execute({ type: 'setVariantPreset', preset: { name } });
    setNewName('');
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
        {names.map((name) => {
          const active = (snap.activeVariantName ?? 'default') === name;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              name={`variant-tab-${name}`}
              className={active ? 'variant-tab is-active' : 'variant-tab'}
              aria-selected={active}
              onClick={() => session.setActiveVariant(name === 'default' ? null : name)}
            >
              {name}
            </button>
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
