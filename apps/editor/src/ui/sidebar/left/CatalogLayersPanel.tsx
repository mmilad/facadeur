'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import type { SidebarIntent, SidebarLayer, LayerSidebarModel } from '../../../domain/sidebar/types';
import { layerDropZoneFor } from './catalog-layer-drag';
import { CatalogLayerContextMenu } from './CatalogLayerContextMenu';
import { findLayerByAddress } from './layer-tree';

export function CatalogLayersPanel({
  model,
  onIntent,
}: {
  model: LayerSidebarModel;
  onIntent: (intent: SidebarIntent) => void;
}) {
  const layers = model.layers;
  const [over, setOver] = useState<{ id: string; zone: 'before' | 'inside' | 'after' } | null>(
    null,
  );
  const [contextLayer, setContextLayer] = useState<{
    address: string;
    anchor: DOMRect;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const contextItem = findLayerByAddress(model.layers, contextLayer?.address ?? '');

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
      <strong className="layers-document-title">{model.title}</strong>
      <p className="side-note">
        Drag layers to reorder. Right-click to insert or delete. Root stays fixed.
      </p>
      <div className="side-scroll">
        {layers ? (
          <CatalogLayerRows
            key={model.title}
            model={model}
            onIntent={onIntent}
            item={layers}
            depth={0}
            selectedId={model.selectedId}
            selectedRenderId={model.selectedRenderId}
            over={over}
            contextLayerAddress={contextLayer?.address ?? null}
            onOpenLayerContext={(layer, anchor) =>
              setContextLayer({ address: layer.address, anchor: anchor.getBoundingClientRect() })
            }
            onSelect={(item) => onIntent({ type: 'layer.select', id: item.id })}
            onDragStart={(item, event) => {
              if (item.virtual || item.id === model.rootId) return;
              event.dataTransfer.setData('text/plain', item.id);
              event.dataTransfer.effectAllowed = 'move';
              onIntent({ type: 'layer.drag.start', id: item.id });
            }}
            onDragEnd={() => {
              onIntent({ type: 'layer.drag.end' });
              setOver(null);
            }}
            onDragOver={(item, event) => {
              if (item.virtual) return;
              const draggedId = model.draggedNodeId;
              if (!draggedId) return;
              const zone = layerDropZoneFor(event, item);
              event.preventDefault();
              event.stopPropagation();
              if (over?.id !== item.address || over.zone !== zone) {
                setOver({ id: item.address, zone });
              }
            }}
            onDrop={(item, event) => {
              if (item.virtual) return;
              const draggedId = model.draggedNodeId;
              const zone = over?.id === item.address ? over.zone : layerDropZoneFor(event, item);
              setOver(null);
              if (!draggedId) return;
              if (item.virtual) {
                event.preventDefault();
                onIntent({ type: 'layer.drag.end' });
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              onIntent({ type: 'layer.move', sourceId: draggedId, targetId: item.id, zone });
              onIntent({ type: 'layer.drag.end' });
            }}
          />
        ) : (
          <p className="inspector-empty">Open a catalog asset to see its node tree.</p>
        )}
      </div>
      {contextLayer && contextItem
        ? createPortal(
            <CatalogLayerContextMenu
              item={contextItem}
              onInsert={(targetId, placement, option) =>
                onIntent({
                  type: 'layer.insert',
                  targetId,
                  placement,
                  kind: option.kind,
                  value: option.value,
                })
              }
              onDelete={(id) => onIntent({ type: 'layer.delete', id })}
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
  model,
  onIntent,
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
  model: LayerSidebarModel;
  onIntent: (intent: SidebarIntent) => void;
  item: SidebarLayer;
  depth: number;
  selectedId: string | null;
  selectedRenderId: string | null;
  over: { id: string; zone: 'before' | 'inside' | 'after' } | null;
  contextLayerAddress: string | null;
  onOpenLayerContext: (item: SidebarLayer, anchor: HTMLElement) => void;
  onSelect: (item: SidebarLayer) => void;
  onDragStart: (item: SidebarLayer, event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (item: SidebarLayer, event: DragEvent) => void;
  onDrop: (item: SidebarLayer, event: DragEvent) => void;
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
  const rootId = model.rootId;
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
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.label}`}
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
          <span className="layer-name">{item.label}</span>
          <span className="layer-type">{layerTypeLabel(item)}</span>
        </button>
      </div>
      {expanded
        ? item.children.map((child) => (
            <CatalogLayerRows
              key={child.address}
              model={model}
              onIntent={onIntent}
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

function layerTypeLabel(item: SidebarLayer) {
  if (item.type === 'repeater' || item.type === 'switch') return 'Fragment';
  return item.tagName ?? '';
}

function containsLayer(item: SidebarLayer, id: string | null, address: string | null): boolean {
  return (
    item.id === id ||
    item.address === address ||
    item.children.some((child) => containsLayer(child, id, address))
  );
}
