import type { DragEvent, MutableRefObject } from 'react';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';
import type { SidebarAsset } from '../../../domain/sidebar/types';

export function AssetRows({
  assets,
  openId,
  draggableAssetIds,
  activeRef,
  contextAssetId,
  onContextAsset,
  onEvent,
}: {
  assets: readonly SidebarAsset[];
  openId: string;
  draggableAssetIds: readonly string[];
  activeRef: MutableRefObject<HTMLButtonElement | null>;
  contextAssetId: string | null;
  onContextAsset: (assetId: string, anchorEl: HTMLElement) => void;
  onEvent: (event: EditorEvent) => void;
}) {
  return assets.map((asset) => {
    const open = asset.id === openId;
    return (
      <div key={asset.id} className="asset-entry">
        <div className="asset-row">
          <button
            type="button"
            ref={open ? activeRef : undefined}
            className={open ? 'asset is-active' : 'asset'}
            data-asset-id={asset.id}
            aria-current={open ? 'true' : undefined}
            aria-haspopup="menu"
            aria-expanded={contextAssetId === asset.id}
            draggable={draggableAssetIds.includes(asset.id)}
            onDragStart={(event) => startAssetDrag(onEvent, event, asset.id)}
            onDragEnd={() => onEvent({ type: EditorEventType.AssetDragEnd, data: {} })}
            onClick={() =>
              onEvent({ type: EditorEventType.AssetOpen, data: { assetId: asset.id } })
            }
            onKeyDown={(event) => {
              if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
                event.preventDefault();
                onContextAsset(asset.id, event.currentTarget);
              }
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              onContextAsset(asset.id, event.currentTarget);
            }}
          >
            <span className="asset-name">{asset.label}</span>
          </button>
        </div>
      </div>
    );
  });
}

function startAssetDrag(onEvent: (event: EditorEvent) => void, event: DragEvent, assetId: string) {
  event.dataTransfer.setData('text/plain', assetId);
  event.dataTransfer.effectAllowed = 'copy';
  onEvent({ type: EditorEventType.AssetDragStart, data: { assetId } });
}
