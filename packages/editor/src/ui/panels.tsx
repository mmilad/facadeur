import { createId } from '@facadeur/core';
import { useMemo, useState, type DragEvent } from 'react';
import {
  defaultKinds,
  defaultNestingRules,
  readTokenTree,
  type DefaultKind,
  type FieldDefinition,
  type FieldValue,
  type FlatNode,
  type FontFamily,
} from '@facadeur/core';
import {
  layerDropTarget,
  layerInsertAt,
  placementAllowed,
  refusalMessage,
  toolAllowed,
  type DropZone,
} from '../editing.js';
import { documentToJson, saveJsonFile } from '../files.js';
import type { EditorDrag, EditorSession, EditorSnapshot, EditorTool } from '../session.js';
import {
  ComponentDefinitions,
  NodeBindings,
  NodeVariantStyles,
  ownsComponentFeatures,
} from './component-panel.js';
import { LayoutPanel } from './layout-panel.js';
import { formatTokenValue, parseEditedValue, withTokenValue } from '../token-edit.js';
import { TextControl } from './fields.js';

const WORKSPACE_LABEL: Record<DefaultKind, string> = {
  atom: 'Atoms',
  component: 'Components',
  section: 'Sections',
  page: 'Pages',
};

export function WorkspaceTabs({
  session,
  workspace,
}: {
  session: EditorSession;
  workspace: DefaultKind;
}) {
  return (
    <nav className="workspaces" aria-label="Workspaces">
      {defaultKinds.map((kind) => (
        <button
          key={kind}
          type="button"
          className={kind === workspace ? 'workspace is-active' : 'workspace'}
          aria-pressed={kind === workspace}
          onClick={() => session.setWorkspace(kind)}
        >
          {WORKSPACE_LABEL[kind]}
        </button>
      ))}
    </nav>
  );
}

const TOOLS = [
  ['select', 'Select', 'V'],
  ['frame', 'Frame', 'F'],
  ['text', 'Text', 'T'],
  ['image', 'Image', 'I'],
] as const;

export function ToolBar({
  session,
  tool,
  kind,
}: {
  session: EditorSession;
  tool: EditorTool;
  kind: string;
}) {
  return (
    <div className="tool-row" role="toolbar" aria-label="Tools">
      {TOOLS.map(([id, label, key]) => {
        const allowed = id === 'select' || toolAllowed(kind, id);
        return (
          <button
            key={id}
            type="button"
            className={tool === id ? 'tool is-active' : 'tool'}
            aria-pressed={tool === id}
            disabled={!allowed}
            title={allowed ? undefined : refusalMessage(kind, id)}
            onClick={() => session.setTool(id)}
          >
            <span>{label}</span>
            <span className="tool-key">{key}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AssetList({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const rule = defaultNestingRules[snap.workspace];
  const openRule = defaultNestingRules[kindOf(snap.document.kind)];
  const instances = rule.instanceKinds.length
    ? `Instances of ${rule.instanceKinds.join(' and ')}.`
    : 'No instances.';
  const listed = new Set(snap.assets.map((asset) => asset.id));
  const placeable = snap.catalog.filter(
    (asset) =>
      asset.id !== snap.openId &&
      openRule.instanceKinds.includes(asset.kind) &&
      !listed.has(asset.id),
  );
  return (
    <section className="side-block" aria-label="Assets">
      <h2>Assets</h2>
      <p className="side-note">
        {rule.nodeTypes.join(', ')}. {instances}
      </p>
      <div className="side-scroll">
        {snap.assets.length === 0 ? (
          <p className="inspector-empty">No {WORKSPACE_LABEL[snap.workspace].toLowerCase()} yet.</p>
        ) : (
          <ul className="asset-list">
            {snap.assets.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  className={asset.id === snap.openId ? 'asset is-active' : 'asset'}
                  aria-current={asset.id === snap.openId ? 'true' : undefined}
                  draggable={canPlace(snap, asset.kind, asset.id)}
                  onDragStart={(event) => startAssetDrag(session, event, asset.id)}
                  onDragEnd={() => session.endDrag()}
                  onClick={() => session.openAsset(asset.id)}
                >
                  <span className="asset-name">{asset.name}</span>
                  <span className="asset-id">{asset.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {placeable.length ? (
          <>
            <h3 className="place-title">Place</h3>
            <p className="side-note">Drag onto the stage. Dropping creates an instance.</p>
            <ul className="asset-list">
              {placeable.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className="asset"
                    draggable
                    onDragStart={(event) => startAssetDrag(session, event, asset.id)}
                    onDragEnd={() => session.endDrag()}
                    onClick={() => session.openAsset(asset.id)}
                  >
                    <span className="asset-name">{asset.name}</span>
                    <span className="asset-id">{asset.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

function canPlace(snap: EditorSnapshot, kind: DefaultKind, id: string): boolean {
  if (id === snap.openId) return false;
  const rule = defaultNestingRules[kindOf(snap.document.kind)];
  return rule.instanceKinds.includes(kind);
}

function kindOf(kind: string): DefaultKind {
  if (kind === 'atom' || kind === 'component' || kind === 'section' || kind === 'page') return kind;
  return 'component';
}

function startAssetDrag(session: EditorSession, event: DragEvent, assetId: string) {
  event.dataTransfer.setData('text/plain', assetId);
  event.dataTransfer.effectAllowed = 'copy';
  session.beginDrag({ kind: 'asset', assetId });
}

export function LayersPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [over, setOver] = useState<{ id: string; zone: DropZone } | null>(null);
  return (
    <section className="side-block side-block-grow" aria-label="Layers">
      <h2>Layers</h2>
      <div className="side-scroll">
        {snap.layers ? (
          <LayerRows
            item={snap.layers}
            depth={0}
            selectedId={snap.selectedNodeId}
            over={over}
            onSelect={(id) => session.selectNode(id)}
            onOpenInstance={(nodeId) => {
              const node = snap.document.nodes[nodeId];
              if (node?.type === 'instance') session.openAsset(node.component, 'root');
            }}
            onDragStart={(id, event) => {
              event.dataTransfer.setData('text/plain', id);
              event.dataTransfer.effectAllowed = 'move';
              session.beginDrag({ kind: 'node', nodeId: id });
            }}
            onDragEnd={() => {
              session.endDrag();
              setOver(null);
            }}
            onDragOver={(id, type, event) => {
              const drag = session.getSnapshot().drag;
              if (!drag) return;
              const zone = zoneFor(event, type);
              if (!layerDropLegal(snap, drag, id, zone)) return;
              event.preventDefault();
              event.stopPropagation();
              if (over?.id !== id || over.zone !== zone) setOver({ id, zone });
            }}
            onDrop={(id, event) => {
              const drag = session.getSnapshot().drag;
              const zone = over?.id === id ? over.zone : zoneFor(event, 'frame');
              setOver(null);
              if (!drag) return;
              if (!layerDropLegal(snap, drag, id, zone)) {
                event.preventDefault();
                session.endDrag();
                const node = drag.kind === 'node' ? snap.document.nodes[drag.nodeId] : undefined;
                const instanceKind =
                  drag.kind === 'asset'
                    ? dragKind(snap, drag.assetId)
                    : node?.type === 'instance'
                      ? dragKind(snap, node.component)
                      : undefined;
                session.setNotice(
                  refusalMessage(
                    snap.document.kind,
                    drag.kind === 'asset' ? 'instance' : (node?.type ?? 'node'),
                    instanceKind,
                  ),
                );
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              if (drag.kind === 'node') {
                const target = layerDropTarget(snap.document, drag.nodeId, id, zone);
                session.endDrag();
                if (!target) return;
                session.execute({
                  type: 'move',
                  nodeId: drag.nodeId,
                  parentId: target.parentId,
                  index: target.index,
                });
                session.selectNode(drag.nodeId);
                return;
              }
              const target = layerInsertAt(snap.document, id, zone);
              session.endDrag();
              if (!target) return;
              const asset = snap.catalog.find((item) => item.id === drag.assetId);
              const nodeId = createId();
              session.execute({
                type: 'insert',
                parentId: target.parentId,
                index: target.index,
                node: {
                  id: nodeId,
                  type: 'instance',
                  component: drag.assetId,
                  ...(asset ? { name: asset.name } : {}),
                },
              });
              if (session.getSnapshot().document.nodes[nodeId]) session.selectNode(nodeId);
            }}
          />
        ) : (
          <p className="inspector-empty">This document has no nodes.</p>
        )}
      </div>
    </section>
  );
}

function zoneFor(event: DragEvent, type: string): DropZone {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
  if (type === 'frame' && ratio > 0.28 && ratio < 0.72) return 'inside';
  return ratio < 0.5 ? 'before' : 'after';
}

function layerDropLegal(
  snap: EditorSnapshot,
  drag: EditorDrag,
  targetId: string,
  zone: DropZone,
): boolean {
  if (drag.kind === 'node') {
    const spot = layerDropTarget(snap.document, drag.nodeId, targetId, zone);
    if (!spot) return false;
    const node = snap.document.nodes[drag.nodeId];
    if (!node) return false;
    const instanceKind = node.type === 'instance' ? dragKind(snap, node.component) : undefined;
    return placementAllowed(snap.document, spot.parentId, node.type, instanceKind);
  }
  const spot = layerInsertAt(snap.document, targetId, zone);
  if (!spot) return false;
  return placementAllowed(snap.document, spot.parentId, 'instance', dragKind(snap, drag.assetId));
}

function dragKind(snap: EditorSnapshot, assetId: string): string | undefined {
  return snap.catalog.find((item) => item.id === assetId)?.kind;
}

function LayerRows({
  item,
  depth,
  selectedId,
  over,
  onSelect,
  onOpenInstance,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  item: NonNullable<EditorSnapshot['layers']>;
  depth: number;
  selectedId: string | null;
  over: { id: string; zone: DropZone } | null;
  onSelect: (id: string) => void;
  onOpenInstance: (id: string) => void;
  onDragStart: (id: string, event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (id: string, type: string, event: DragEvent) => void;
  onDrop: (id: string, event: DragEvent) => void;
}) {
  const mark = over?.id === item.id ? over.zone : null;
  const className = [
    'layer',
    item.id === selectedId ? 'is-active' : '',
    mark === 'before' ? 'is-insert-before' : '',
    mark === 'after' ? 'is-insert-after' : '',
    mark === 'inside' ? 'is-insert-inside' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <button
        type="button"
        className={className}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={depth > 0}
        onDragStart={(event) => onDragStart(item.id, event)}
        onDragEnd={onDragEnd}
        onDragOver={(event) => onDragOver(item.id, item.type, event)}
        onDrop={(event) => onDrop(item.id, event)}
        onClick={() => onSelect(item.id)}
        onDoubleClick={() => onOpenInstance(item.id)}
      >
        <span className="layer-type">{item.type}</span>
        <span className="layer-name">{item.name}</span>
      </button>
      {item.children.map((child) => (
        <LayerRows
          key={child.id}
          item={child}
          depth={depth + 1}
          selectedId={selectedId}
          over={over}
          onSelect={onSelect}
          onOpenInstance={onOpenInstance}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      ))}
    </>
  );
}

export function Inspector({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [tab, setTab] = useState<'properties' | 'tokens' | 'fonts'>('properties');
  return (
    <section className="side-block side-block-grow inspector" aria-label="Inspector">
      <div className="tabs" role="tablist">
        {(
          [
            ['properties', 'Properties'],
            ['tokens', 'Tokens'],
            ['fonts', 'Fonts'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={tab === id ? 'tab is-active' : 'tab'}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="side-scroll">
        {tab === 'properties' ? <Properties session={session} snap={snap} /> : null}
        {tab === 'tokens' ? <TokensPanel session={session} snap={snap} /> : null}
        {tab === 'fonts' ? <FontsPanel session={session} snap={snap} /> : null}
      </div>
    </section>
  );
}

function Properties({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const node = snap.selectedNode;
  const showDefinitions =
    ownsComponentFeatures(snap.document.kind) && (!node || node.id === snap.document.rootId);
  if (!node) {
    return (
      <div className="properties">
        <p className="inspector-empty">Select a layer or an element on the stage.</p>
        {showDefinitions ? <ComponentDefinitions session={session} snap={snap} /> : null}
      </div>
    );
  }
  return (
    <div className="properties">
      <p className="inspector-id">{node.id}</p>
      <dl className="kv">
        <dt>Type</dt>
        <dd>{node.type}</dd>
        <dt>Document</dt>
        <dd>{snap.document.name}</dd>
      </dl>
      <TextControl
        label="Name"
        name="name"
        value={node.name ?? ''}
        onCommit={(value) =>
          session.execute({
            type: 'setProp',
            nodeId: node.id,
            prop: 'name',
            value: value.trim() ? value.trim() : null,
          })
        }
      />
      {node.type !== 'instance' ? (
        <TextControl
          label="Tag"
          name="tag"
          value={node.tag ?? ''}
          onCommit={(value) =>
            session.execute({
              type: 'setProp',
              nodeId: node.id,
              prop: 'tag',
              value: value.trim() ? value.trim() : null,
            })
          }
        />
      ) : (
        <p className="meta">Component · {node.component}</p>
      )}
      {node.type === 'text' ? (
        <TextControl
          label="Text"
          name="text"
          value={node.text ?? ''}
          multiline
          onCommit={(value) =>
            session.execute({ type: 'setProp', nodeId: node.id, prop: 'text', value })
          }
        />
      ) : null}
      {node.type === 'image' ? (
        <>
          <TextControl
            label="Source"
            name="src"
            value={node.src ?? ''}
            onCommit={(value) =>
              session.execute({
                type: 'setProp',
                nodeId: node.id,
                prop: 'src',
                value: value.trim() ? value : null,
              })
            }
          />
          <TextControl
            label="Alt"
            name="alt"
            value={node.alt ?? ''}
            onCommit={(value) =>
              session.execute({ type: 'setProp', nodeId: node.id, prop: 'alt', value })
            }
          />
        </>
      ) : null}
      {node.type !== 'instance' && node.attributes
        ? Object.entries(node.attributes).map(([key, value]) => (
            <TextControl
              key={key}
              label={key}
              name={`attr-${key}`}
              value={value}
              onCommit={(next) => commitAttribute(session, node, key, next)}
            />
          ))
        : null}
      {node.type === 'instance' ? (
        <InstanceFields session={session} node={node} snap={snap} />
      ) : null}
      {showDefinitions ? <ComponentDefinitions session={session} snap={snap} /> : null}
      {node.type !== 'instance' ? <NodeBindings session={session} snap={snap} node={node} /> : null}
      {node.type !== 'instance' && node.id !== snap.document.rootId ? (
        <NodeVariantStyles session={session} snap={snap} nodeId={node.id} />
      ) : null}
      {node.type !== 'instance' ? <StyleFields session={session} node={node} /> : null}
      <LayoutPanel session={session} snap={snap} node={node} />
    </div>
  );
}

function commitAttribute(
  session: EditorSession,
  node: Exclude<FlatNode, { type: 'instance' }>,
  key: string,
  value: string,
) {
  const attributes = { ...(node.attributes ?? {}) };
  if (value === '') delete attributes[key];
  else attributes[key] = value;
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'attributes',
    value: Object.keys(attributes).length ? attributes : null,
  });
}

function StyleFields({
  session,
  node,
}: {
  session: EditorSession;
  node: Exclude<FlatNode, { type: 'instance' }>;
}) {
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
  const entries = Object.entries(node.style ?? {});
  return (
    <div className="stack">
      <h3>Style</h3>
      {entries.length === 0 ? <p className="meta">No style overrides.</p> : null}
      {entries.map(([key, current]) => (
        <TextControl
          key={key}
          label={key}
          value={current}
          onCommit={(next) =>
            session.execute({
              type: 'setStyle',
              nodeId: node.id,
              property: key,
              value: next.trim() ? next : null,
            })
          }
        />
      ))}
      <label className="field">
        <span>Add property</span>
        <span className="pair">
          <input
            name="style-property"
            value={property}
            placeholder="property"
            onChange={(event) => setProperty(event.target.value)}
          />
          <input
            name="style-value"
            value={value}
            placeholder="value"
            onChange={(event) => setValue(event.target.value)}
          />
        </span>
      </label>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          const name = property.trim();
          if (!name || !value.trim()) return;
          session.execute({
            type: 'setStyle',
            nodeId: node.id,
            property: name,
            value: value.trim(),
          });
          setProperty('');
          setValue('');
        }}
      >
        Add style
      </button>
    </div>
  );
}

function InstanceFields({
  session,
  node,
  snap,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'instance' }>;
  snap: EditorSnapshot;
}) {
  const target = snap.componentTarget;
  if (!target) {
    return <p className="meta">Unknown component {node.component}.</p>;
  }
  return (
    <div className="stack">
      <p className="meta">Overrides only. Edit the component in its own workspace.</p>
      <button
        type="button"
        className="text-button"
        name="open-component"
        onClick={() => session.openAsset(node.component, 'root')}
      >
        Open {target.name}
      </button>
      {target.fields.length ? <h3>Fields</h3> : null}
      {target.fields.map((field) => (
        <FieldOverride key={field.name} session={session} node={node} field={field} />
      ))}
      {target.variants.length ? <h3>Variants</h3> : null}
      {target.variants.map((axis) => {
        const current = node.variants?.[axis.name] ?? '';
        return (
          <label key={axis.name} className="field">
            <span>{axis.name}</span>
            <select
              name={`variant-${axis.name}`}
              value={current}
              onChange={(event) =>
                session.execute({
                  type: 'setVariant',
                  nodeId: node.id,
                  axis: axis.name,
                  value: event.target.value || null,
                })
              }
            >
              <option value="">Default ({axis.default ?? axis.values[0]})</option>
              {axis.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function FieldOverride({
  session,
  node,
  field,
}: {
  session: EditorSession;
  node: Extract<FlatNode, { type: 'instance' }>;
  field: FieldDefinition;
}) {
  const override = node.fields?.[field.name];
  if (field.type === 'enum' && field.options?.length) {
    const current = typeof override === 'string' ? override : '';
    return (
      <label className="field">
        <span>{field.name}</span>
        <select
          name={`field-${field.name}`}
          value={current}
          onChange={(event) =>
            session.execute({
              type: 'setField',
              nodeId: node.id,
              field: field.name,
              value: event.target.value || null,
            })
          }
        >
          <option value="">
            Default ({field.default === undefined ? 'none' : String(field.default)})
          </option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === 'boolean') {
    const checked = typeof override === 'boolean' ? override : field.default === true;
    return (
      <label className="field field-check">
        <span>{field.name}</span>
        <input
          type="checkbox"
          name={`field-${field.name}`}
          checked={checked}
          onChange={(event) =>
            session.execute({
              type: 'setField',
              nodeId: node.id,
              field: field.name,
              value: event.target.checked,
            })
          }
        />
      </label>
    );
  }
  const shown = override === undefined || override === null ? '' : String(override);
  const placeholder = field.default === undefined ? undefined : String(field.default);
  return (
    <TextControl
      label={field.name}
      name={`field-${field.name}`}
      value={shown}
      placeholder={placeholder}
      onCommit={(raw) => {
        try {
          session.execute({
            type: 'setField',
            nodeId: node.id,
            field: field.name,
            value: raw === '' ? null : parseField(field, raw),
          });
        } catch (error) {
          session.setNotice(error instanceof Error ? error.message : 'Invalid field', 'error');
        }
      }}
    />
  );
}

function parseField(field: FieldDefinition, raw: string): FieldValue {
  if (field.type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${field.name} must be a number`);
    return value;
  }
  if (field.type === 'boolean') return raw === 'true';
  return raw;
}

function TokensPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [query, setQuery] = useState('');
  const tokens = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return [...indexed.tokens.values()].sort((left, right) => left.path.localeCompare(right.path));
  }, [snap.design]);
  const needle = query.trim().toLowerCase();
  const visible = needle ? tokens.filter((token) => token.path.includes(needle)) : tokens;
  let group = '';
  return (
    <div className="stack">
      <div className="panel-head">
        <p className="meta">Project tokens. Edits update every viewport.</p>
        <button
          type="button"
          className="text-button"
          onClick={() => void saveDesign(session, snap)}
        >
          Save design
        </button>
      </div>
      <label className="field">
        <span>Filter</span>
        <input
          name="token-filter"
          value={query}
          placeholder="color.accent"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {visible.map((token) => {
        const nextGroup = token.path.split('.')[0] ?? '';
        const heading = nextGroup !== group;
        group = nextGroup;
        const text = formatTokenValue(token.value);
        const hex = typeof token.value === 'string' && /^#[0-9a-fA-F]{6}$/.test(token.value);
        return (
          <div key={token.path}>
            {heading ? <h3>{nextGroup}</h3> : null}
            <div className="token-row">
              {hex ? (
                <input
                  className="swatch"
                  type="color"
                  aria-label={`${token.path} color`}
                  value={token.value as string}
                  onChange={(event) =>
                    commitToken(session, snap, token.path, token.value, event.target.value)
                  }
                />
              ) : null}
              <TextControl
                label={`${token.path} · ${token.type}`}
                name={`token-${token.path}`}
                value={text}
                multiline={typeof token.value === 'object' && token.value !== null}
                onCommit={(next) => commitToken(session, snap, token.path, token.value, next)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function commitToken(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  previous: Parameters<typeof parseEditedValue>[1],
  text: string,
) {
  try {
    const value = parseEditedValue(text, previous);
    session.executeDesign({
      type: 'setToken',
      path,
      token: withTokenValue(snap.design.tokens, path, value),
    });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function FontsPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  return (
    <div className="stack">
      <div className="panel-head">
        <p className="meta">Project fonts. The last fallback must be a generic family.</p>
        <button
          type="button"
          className="text-button"
          onClick={() => void saveDesign(session, snap)}
        >
          Save design
        </button>
      </div>
      {snap.design.fonts.length === 0 ? <p className="inspector-empty">No fonts yet.</p> : null}
      {snap.design.fonts.map((font) => (
        <fieldset key={font.id} className="font-card">
          <legend>{font.id}</legend>
          <TextControl
            label="Family"
            name={`font-${font.id}-family`}
            value={font.family}
            onCommit={(family) => {
              const trimmed = family.trim();
              if (!trimmed || trimmed === font.family) return;
              session.executeDesign({
                type: 'setFont',
                font: editedFont(font, { family: trimmed }),
              });
            }}
          />
          <TextControl
            label="Fallbacks"
            name={`font-${font.id}-fallbacks`}
            value={font.fallbacks.join(', ')}
            onCommit={(text) => {
              const fallbacks = text
                .split(',')
                .map((part) => part.trim())
                .filter((part) => part.length > 0);
              session.executeDesign({ type: 'setFont', font: editedFont(font, { fallbacks }) });
            }}
          />
          <p className="meta">
            {font.source.type === 'google' ? `Google · ${font.source.family}` : 'File'} ·{' '}
            {font.weights.join(', ')}
          </p>
        </fieldset>
      ))}
    </div>
  );
}

function editedFont(
  font: FontFamily,
  patch: { family?: string; fallbacks?: string[] },
): FontFamily {
  const family = patch.family ?? font.family;
  return {
    id: font.id,
    family,
    weights: [...font.weights],
    ...(font.styles ? { styles: [...font.styles] } : {}),
    source:
      font.source.type === 'google'
        ? { type: 'google', family: patch.family ?? font.source.family }
        : { type: 'file', files: font.source.files.map((file) => ({ ...file })) },
    fallbacks: patch.fallbacks ? [...patch.fallbacks] : [...font.fallbacks],
  };
}

async function saveDesign(session: EditorSession, snap: EditorSnapshot) {
  const id = snap.design.id;
  try {
    const result = await saveJsonFile({
      filename: session.filenameFor(id),
      text: documentToJson(snap.design),
      handle: session.fileHandle(id),
    });
    if (result.handle) session.rememberHandle(id, result.handle);
    const verb = result.via === 'download' ? 'Downloaded' : 'Saved';
    session.setNotice(`${verb} ${session.filenameFor(id)}`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    session.setNotice(error instanceof Error ? error.message : 'Could not save', 'error');
  }
}
