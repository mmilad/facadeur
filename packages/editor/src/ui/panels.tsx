import { createId } from '@facadeur/core';
import { useMemo, useState, type DragEvent } from 'react';
import { readTokenTree, type FlatNode, type FontFamily } from '@facadeur/core';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  layerDropTarget,
  layerInsertAt,
  numberTokenRefs,
  placementAllowed,
  refusalMessage,
  shadowTokenRefs,
  toolAllowed,
  type DropZone,
} from '../editing.js';
import { documentToJson, saveJsonFile } from '../files.js';
import type { EditorDrag, EditorSession, EditorSnapshot, EditorTool } from '../session.js';
import {
  ComponentFields,
  ComponentVariants,
  NodeBindings,
  NodeStyleBlock,
  NodeVariantStyles,
  ownsComponentFeatures,
} from './component-panel.js';
import { ColorControl, isColorStyleProperty } from './controls/color/index.js';
import { InstanceOverridesControl } from './controls/instance/index.js';
import { ShadowControl, isShadowStyleProperty } from './controls/shadow/index.js';
import {
  isTypographyStyleProperty,
  isTypographyValue,
  projectFontRefs,
  TypographyControl,
  TypographyStyleControl,
  type TypographyCatalogs,
} from './controls/typography/index.js';
import { LayoutPanel } from './layout-panel.js';
import {
  formatTokenValue,
  parseEditedValue,
  withTokenBreakpoint,
  withTokenValue,
} from '../token-edit.js';
import { editorBreakpoints, viewportEditContext } from '../viewport-edit.js';
import { TextControl } from './fields.js';
import { OverrideCue, ViewportEditBar } from './viewport-bar.js';
import { ViewportLayersList, ViewportOptionsPanel } from './viewport-panel.js';

export type EditorSurface = 'properties' | 'tokens' | 'fonts';

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
    <div className="topbar-tools" role="toolbar" aria-label="Tools">
      {TOOLS.map(([id, label, key]) => {
        const allowed = id === 'select' || toolAllowed(kind, id);
        return (
          <button
            key={id}
            type="button"
            className={tool === id ? 'tool tool-compact is-active' : 'tool tool-compact'}
            aria-pressed={tool === id}
            aria-label={label}
            disabled={!allowed}
            title={allowed ? `${label} (${key})` : refusalMessage(kind, id)}
            onClick={() => session.setTool(id)}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

export function LayersPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [over, setOver] = useState<{ id: string; zone: DropZone } | null>(null);
  return (
    <section className="side-block side-block-grow" aria-label="Layers">
      <h2>Layers</h2>
      <ViewportLayersList session={session} snap={snap} />
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

export function RightRail({
  session,
  snap,
  surface,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  surface: EditorSurface;
}) {
  const showViewportBar =
    !snap.selectedViewportId && (surface === 'properties' || surface === 'tokens');
  const railLabel =
    surface === 'properties' ? 'Inspector' : surface === 'tokens' ? 'Tokens' : 'Fonts';
  return (
    <section className="side-block side-block-grow inspector" aria-label={railLabel}>
      {surface !== 'properties' ? <h2>{railLabel}</h2> : null}
      {showViewportBar ? <ViewportEditBar session={session} snap={snap} /> : null}
      <div className="side-scroll">
        {snap.selectedViewportId ? (
          <ViewportOptionsPanel session={session} snap={snap} />
        ) : surface === 'properties' ? (
          <Properties session={session} snap={snap} />
        ) : null}
        {!snap.selectedViewportId && surface === 'tokens' ? (
          <TokensPanel session={session} snap={snap} />
        ) : null}
        {!snap.selectedViewportId && surface === 'fonts' ? (
          <FontsPanel session={session} snap={snap} />
        ) : null}
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
        {showDefinitions ? (
          <>
            <ComponentFields session={session} snap={snap} />
            <ComponentVariants session={session} snap={snap} />
          </>
        ) : null}
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
      {showDefinitions ? <ComponentFields session={session} snap={snap} /> : null}
      {node.type !== 'instance' ? <NodeBindings session={session} snap={snap} node={node} /> : null}
      {showDefinitions ? <ComponentVariants session={session} snap={snap} /> : null}
      {node.type !== 'instance' && node.id !== snap.document.rootId ? (
        <NodeVariantStyles session={session} snap={snap} nodeId={node.id} />
      ) : null}
      {node.type !== 'instance' ? (
        <NodeStyleBlock session={session} snap={snap} nodeId={node.id} />
      ) : null}
      {node.type !== 'instance' ? <StyleFields session={session} snap={snap} node={node} /> : null}
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
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Exclude<FlatNode, { type: 'instance' }>;
}) {
  const [property, setProperty] = useState('');
  const [value, setValue] = useState('');
  const colorTokens = useMemo(() => colorTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const shadowTokens = useMemo(() => shadowTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const typographyCatalogs = useMemo<TypographyCatalogs>(
    () => ({
      fontRefs: projectFontRefs(snap.design.fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    }),
    [snap.design.fonts, snap.design.tokens],
  );
  const entries = Object.entries(node.style ?? {});
  const addingColor = isColorStyleProperty(property);
  const addingTypography = isTypographyStyleProperty(property);
  const addingShadow = isShadowStyleProperty(property);
  const addingSpecial = addingColor || addingTypography || addingShadow;
  return (
    <div className="stack">
      <h3>Node style</h3>
      <p className="meta">
        Always Base. It overrides the style block, and breakpoint rules stay above it.
      </p>
      {entries.length === 0 ? <p className="meta">No style overrides.</p> : null}
      {entries.map(([key, current]) => {
        const commitStyle = (next: string | null) =>
          session.execute({
            type: 'setStyle',
            nodeId: node.id,
            property: key,
            value: next?.trim() ? next.trim() : null,
          });
        if (isColorStyleProperty(key)) {
          return (
            <ColorControl
              key={key}
              name={`style-${key}`}
              label={key}
              value={current}
              colorTokens={colorTokens}
              onCommit={commitStyle}
            />
          );
        }
        if (isShadowStyleProperty(key)) {
          return (
            <ShadowControl
              key={key}
              name={`style-${key}`}
              label={key}
              value={current}
              shadowTokens={shadowTokens}
              onCommit={commitStyle}
            />
          );
        }
        if (isTypographyStyleProperty(key)) {
          return (
            <TypographyStyleControl
              key={key}
              name={`style-${key}`}
              label={key}
              property={key}
              value={current}
              catalogs={typographyCatalogs}
              onCommit={commitStyle}
            />
          );
        }
        return (
          <TextControl
            key={key}
            label={key}
            value={current}
            onCommit={(next) => commitStyle(next.trim() ? next : null)}
          />
        );
      })}
      <label className="field">
        <span>Add property</span>
        <span className="pair">
          <input
            name="style-property"
            value={property}
            placeholder="property"
            onChange={(event) => setProperty(event.target.value)}
          />
          {!addingSpecial ? (
            <input
              name="style-value"
              value={value}
              placeholder="value"
              onChange={(event) => setValue(event.target.value)}
            />
          ) : null}
        </span>
      </label>
      {addingColor ? (
        <ColorControl
          name="style-add-value"
          label="Value"
          value={value}
          colorTokens={colorTokens}
          onCommit={(next) => setValue(next ?? '')}
        />
      ) : null}
      {addingShadow ? (
        <ShadowControl
          name="style-add-value"
          label="Value"
          value={value}
          shadowTokens={shadowTokens}
          onCommit={(next) => setValue(next ?? '')}
        />
      ) : null}
      {addingTypography ? (
        <TypographyStyleControl
          name="style-add-value"
          label="Value"
          property={property}
          value={value}
          catalogs={typographyCatalogs}
          onCommit={(next) => setValue(next ?? '')}
        />
      ) : null}
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
    <InstanceOverridesControl
      masterName={target.name}
      fields={target.fields}
      variants={target.variants}
      fieldOverrides={node.fields}
      variantOverrides={node.variants}
      onOpenMaster={() => session.openAsset(node.component, 'root')}
      onSetField={(field, value) =>
        session.execute({ type: 'setField', nodeId: node.id, field, value })
      }
      onSetVariant={(axis, value) =>
        session.execute({ type: 'setVariant', nodeId: node.id, axis, value })
      }
      onInvalid={(message) => session.setNotice(message, 'error')}
    />
  );
}

function TokensPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [query, setQuery] = useState('');
  const tokens = useMemo(() => {
    const indexed = readTokenTree(snap.design.tokens);
    return [...indexed.tokens.values()].sort((left, right) => left.path.localeCompare(right.path));
  }, [snap.design]);
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const writingId = ctx.writingBreakpointId;
  const colorTokens = useMemo(() => colorTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const shadowTokens = useMemo(() => shadowTokenRefs(snap.design.tokens), [snap.design.tokens]);
  const typographyCatalogs = useMemo<TypographyCatalogs>(
    () => ({
      fontRefs: projectFontRefs(snap.design.fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    }),
    [snap.design.fonts, snap.design.tokens],
  );
  const needle = query.trim().toLowerCase();
  const visible = needle ? tokens.filter((token) => token.path.includes(needle)) : tokens;
  let group = '';
  return (
    <div className="stack">
      <div className="panel-head">
        <p className="meta">
          {writingId
            ? `Token overrides at ${writingId}. $value stays the base.`
            : 'Project tokens. Base edits $value and update every viewport that has no override.'}
        </p>
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
        const override = writingId ? token.breakpoints[writingId] : undefined;
        const shownValue = writingId ? override : token.value;
        const text = shownValue === undefined ? '' : formatTokenValue(shownValue);
        const previous = shownValue === undefined ? token.value : shownValue;
        const colorString =
          token.type === 'color' && typeof previous === 'string' ? previous : null;
        const shadowString =
          token.type === 'shadow' && typeof previous === 'string' ? previous : null;
        const typographyObject =
          token.type === 'typography' && isTypographyValue(previous) ? previous : null;
        const tokenLabel = `${token.path} · ${token.type}`;
        const commitTokenValue = (next: string | null) => {
          if (writingId && (next === null || next.trim() === '')) {
            if (override !== undefined) {
              resetTokenBreakpoint(session, snap, token.path, writingId);
            }
            return;
          }
          commitToken(session, snap, token.path, previous, next ?? '', writingId);
        };
        const commitTypographyValue = (next: Record<string, unknown> | null) => {
          if (writingId && next === null) {
            if (override !== undefined) {
              resetTokenBreakpoint(session, snap, token.path, writingId);
            }
            return;
          }
          commitToken(
            session,
            snap,
            token.path,
            previous,
            next === null ? '' : JSON.stringify(next),
            writingId,
          );
        };
        return (
          <div key={token.path}>
            {heading ? <h3>{nextGroup}</h3> : null}
            <div className="token-row">
              {colorString !== null ? (
                <ColorControl
                  name={`token-${token.path}`}
                  label={tokenLabel}
                  value={text}
                  colorTokens={colorTokens}
                  onCommit={commitTokenValue}
                />
              ) : shadowString !== null ? (
                <ShadowControl
                  name={`token-${token.path}`}
                  label={tokenLabel}
                  value={text}
                  shadowTokens={shadowTokens}
                  onCommit={commitTokenValue}
                />
              ) : typographyObject !== null ? (
                <TypographyControl
                  namePrefix={`token-${token.path}`}
                  label={tokenLabel}
                  value={typographyObject}
                  partial={writingId !== null && override !== undefined}
                  catalogs={typographyCatalogs}
                  onCommit={commitTypographyValue}
                />
              ) : (
                <TextControl
                  label={tokenLabel}
                  name={`token-${token.path}`}
                  value={text}
                  placeholder={
                    writingId && override === undefined ? formatTokenValue(token.value) : undefined
                  }
                  multiline={typeof previous === 'object' && previous !== null}
                  onCommit={(next) => {
                    if (writingId && next.trim() === '') {
                      if (override !== undefined) {
                        resetTokenBreakpoint(session, snap, token.path, writingId);
                      }
                      return;
                    }
                    commitToken(session, snap, token.path, previous, next, writingId);
                  }}
                />
              )}
            </div>
            {ctx.overrideViewport && token.breakpoints[ctx.overrideViewport.id] !== undefined ? (
              <OverrideCue
                minWidth={ctx.overrideViewport.minWidth}
                onReset={() =>
                  resetTokenBreakpoint(session, snap, token.path, ctx.overrideViewport?.id ?? '')
                }
              />
            ) : null}
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
  breakpointId: string | null,
) {
  try {
    const value = parseEditedValue(text, previous);
    const token = breakpointId
      ? withTokenBreakpoint(snap.design.tokens, path, breakpointId, value)
      : withTokenValue(snap.design.tokens, path, value);
    session.executeDesign({ type: 'setToken', path, token });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function resetTokenBreakpoint(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  breakpointId: string,
) {
  if (!breakpointId) return;
  try {
    session.executeDesign({
      type: 'setToken',
      path,
      token: withTokenBreakpoint(snap.design.tokens, path, breakpointId, null),
    });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function FontsPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  return (
    <div className="stack">
      <div className="panel-head">
        <p className="meta">
          Project fonts. The last fallback must be a generic family. Font files are shared across
          viewports; type size changes live on typography tokens.
        </p>
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
