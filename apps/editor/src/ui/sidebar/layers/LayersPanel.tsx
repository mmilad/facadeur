import { createId } from '@facadeur/core';
import { useState, type DragEvent } from 'react';
import {
  layerDropTarget,
  layerInsertAt,
  placementAllowed,
  refusalMessage,
  type DropZone,
} from '../../../domain/editing.js';
import type { EditorDrag, EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { ViewportLayersList } from './ViewportPanel.js';

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
