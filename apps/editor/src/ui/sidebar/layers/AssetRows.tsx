import { defaultNestingRules, type DefaultKind } from '@facadeur/core';
import type { DragEvent, MutableRefObject } from 'react';
import type { AssetSummary, EditorSession, EditorSnapshot } from '../../../domain/session';

export function AssetRows({
  assets,
  snap,
  session,
  activeRef,
  onOpenAsset,
  contextAssetId,
  onContextAsset,
}: {
  assets: AssetSummary[];
  snap: EditorSnapshot;
  session: EditorSession;
  activeRef: MutableRefObject<HTMLButtonElement | null>;
  onOpenAsset: (id: string) => void;
  contextAssetId: string | null;
  onContextAsset: (assetId: string, anchorEl: HTMLElement) => void;
}) {
  return assets.map((asset) => {
    const open = asset.id === snap.openId;
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
            draggable={canPlace(snap, asset.kind, asset.id)}
            onDragStart={(event) => startAssetDrag(session, event, asset.id)}
            onDragEnd={() => session.endDrag()}
            onClick={() => onOpenAsset(asset.id)}
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
            <span className="asset-name">{asset.name}</span>
          </button>
        </div>
      </div>
    );
  });
}

function canPlace(snap: EditorSnapshot, kind: DefaultKind, id: string): boolean {
  if (id === snap.openId) return false;
  const openKind = snap.openDefinition?.kind ?? snap.workspace;
  return defaultNestingRules[openKind].instanceKinds.includes(kind);
}

function startAssetDrag(session: EditorSession, event: DragEvent, assetId: string) {
  event.dataTransfer.setData('text/plain', assetId);
  event.dataTransfer.effectAllowed = 'copy';
  session.beginDrag({ kind: 'asset', assetId });
}
