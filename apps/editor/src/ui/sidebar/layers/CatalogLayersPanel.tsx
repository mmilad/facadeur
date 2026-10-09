'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import type { AppService } from '../../../app-service';
import { catalogDefinitionDisplayName } from '../../../domain/catalog/display-name';
import type { DropZone } from '../../../domain/editing';
import type { LayerItem } from '../../../domain/selection/selection-model';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import { catalogNodeDragLegal, dropCatalogLayerNode, layerDropZoneFor } from './catalog-layer-drag';
import { CatalogLayerContextMenu } from './CatalogLayerContextMenu';
import { findLayerByAddress } from './layer-tree';

export function CatalogLayersPanel({
  app,
  session,
  snap,
}: {
  app: AppService;
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const layers = snap.layers;
  const definition = snap.openDefinition;
  const title = definition
    ? catalogDefinitionDisplayName(session.core.getSnapshot().catalog, definition)
    : snap.document.name;
  const [over, setOver] = useState<{ id: string; zone: DropZone } | null>(null);
  const [contextLayer, setContextLayer] = useState<{
    address: string;
    anchor: DOMRect;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const contextItem = findLayerByAddress(snap.layers, contextLayer?.address ?? '');

  useEffect(() => {
    if (!contextLayer) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setContextLayer(null);
    };
    window.addEventListener('keydown', close, true);
    return () => window.removeEventListener('keydown', close, true);
  }, [contextLayer]);

  useEffect(() => {
    if (!contextLayer) return;
    const close = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) setContextLayer(null);
    };
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [contextLayer]);

  return (
    <section className="side-block side-block-grow" aria-label="Layers">
      <h2>Layers</h2>
      <strong className="layers-document-title">{title}</strong>
      <p className="side-note">
        Drag layers to reorder. Right-click to insert or delete. Root stays fixed.
      </p>
      <div className="side-scroll">
        {layers ? (
          <CatalogLayerRows
            key={snap.openId}
            session={session}
            snap={snap}
            item={layers}
            depth={0}
            selectedId={snap.selectedNodeId}
            selectedRenderId={snap.selectedRenderId}
            over={over}
            contextLayerAddress={contextLayer?.address ?? null}
            onOpenLayerContext={(layer, anchor) =>
              setContextLayer({ address: layer.address, anchor: anchor.getBoundingClientRect() })
            }
            onSelect={(item) => session.selectNode(item.id)}
            onDragStart={(item, event) => {
              if (item.virtual || item.id === snap.openDefinition?.root.uuid) return;
              event.dataTransfer.setData('text/plain', item.id);
              event.dataTransfer.effectAllowed = 'move';
              session.beginDrag({ kind: 'node', nodeId: item.id });
            }}
            onDragEnd={() => {
              session.endDrag();
              setOver(null);
            }}
            onDragOver={(item, event) => {
              if (item.virtual) return;
              const drag = session.getSnapshot().drag;
              if (!drag || drag.kind !== 'node') return;
              const zone = layerDropZoneFor(event, item);
              if (!catalogNodeDragLegal(snap, drag.nodeId, item, zone)) return;
              event.preventDefault();
              event.stopPropagation();
              if (over?.id !== item.address || over.zone !== zone) {
                setOver({ id: item.address, zone });
              }
            }}
            onDrop={(item, event) => {
              if (item.virtual) return;
              const drag = session.getSnapshot().drag;
              const zone = over?.id === item.address ? over.zone : layerDropZoneFor(event, item);
              setOver(null);
              if (!drag || drag.kind !== 'node') return;
              if (!catalogNodeDragLegal(snap, drag.nodeId, item, zone)) {
                event.preventDefault();
                session.endDrag();
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              void dropCatalogLayerNode(app, session, drag.nodeId, item, zone).then(() => {
                session.endDrag();
              });
            }}
          />
        ) : (
          <p className="inspector-empty">Open a catalog asset to see its node tree.</p>
        )}
      </div>
      {contextLayer && contextItem
        ? createPortal(
            <CatalogLayerContextMenu
              app={app}
              snap={snap}
              item={contextItem}
              anchor={contextLayer.anchor}
              menuRef={contextMenuRef}
              onClose={() => setContextLayer(null)}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

function CatalogLayerRows({
  session,
  snap,
  item,
  depth,
  selectedId,
  selectedRenderId,
  over,
  contextLayerAddress,
  onOpenLayerContext,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  item: LayerItem;
  depth: number;
  selectedId: string | null;
  selectedRenderId: string | null;
  over: { id: string; zone: DropZone } | null;
  contextLayerAddress: string | null;
  onOpenLayerContext: (item: LayerItem, anchor: HTMLElement) => void;
  onSelect: (item: LayerItem) => void;
  onDragStart: (item: LayerItem, event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (item: LayerItem, event: DragEvent) => void;
  onDrop: (item: LayerItem, event: DragEvent) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (item.children.some((child) => containsLayer(child, selectedId, selectedRenderId))) {
      setExpanded(true);
    }
  }, [item, selectedId, selectedRenderId]);

  const active = item.id === selectedId || item.address === selectedRenderId;
  const menuOpen = contextLayerAddress === item.address;
  const mark = over?.id === item.address ? over.zone : null;
  const rootId = snap.openDefinition?.root.uuid;
  const draggable = !item.virtual && item.id !== rootId;
  const className = [
    'layer',
    active ? 'is-active' : '',
    mark === 'before' ? 'is-insert-before' : '',
    mark === 'after' ? 'is-insert-after' : '',
    mark === 'inside' ? 'is-insert-inside' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="layer-row" style={{ paddingLeft: depth * 14 }}>
        {item.children.length ? (
          <button
            type="button"
            className="layer-toggle"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.name}`}
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="layer-toggle-spacer" />
        )}
        <button
          type="button"
          className={className}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          draggable={draggable}
          onDragStart={(event) => onDragStart(item, event)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => onDragOver(item, event)}
          onDrop={(event) => onDrop(item, event)}
          onClick={() => onSelect(item)}
          onKeyDown={(event) => {
            if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
              event.preventDefault();
              onOpenLayerContext(item, event.currentTarget);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            onOpenLayerContext(item, event.currentTarget);
          }}
        >
          <span className="layer-name">{item.name}</span>
          <span className="layer-type">{layerTypeLabel(item)}</span>
        </button>
      </div>
      {expanded
        ? item.children.map((child) => (
            <CatalogLayerRows
              key={child.address}
              session={session}
              snap={snap}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              selectedRenderId={selectedRenderId}
              over={over}
              contextLayerAddress={contextLayerAddress}
              onOpenLayerContext={onOpenLayerContext}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))
        : null}
    </>
  );
}

function layerTypeLabel(item: LayerItem) {
  if (item.type === 'repeater' || item.type === 'switch') return 'Fragment';
  return item.tagName ?? '';
}

function containsLayer(item: LayerItem, id: string | null, address: string | null): boolean {
  return (
    item.id === id ||
    item.address === address ||
    item.children.some((child) => containsLayer(child, id, address))
  );
}
