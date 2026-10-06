import { useLayoutEffect, type RefObject } from 'react';
import { ownsVariantContract } from '../../../domain/edits/variant-edit.js';
import type { AssetSummary } from '../../../domain/session.js';

const MENU_MIN_WIDTH = 168;

export function AssetContextMenu({
  asset,
  anchor,
  menuRef,
  onCreateVariant,
  onRename,
  onGroup,
  onRemoveGroup,
  onClose,
}: {
  asset: AssetSummary;
  anchor: DOMRect;
  menuRef: RefObject<HTMLDivElement | null>;
  onCreateVariant: (assetId: string) => void;
  onRename: (assetId: string) => void;
  onGroup: (assetId: string) => void;
  onRemoveGroup: (assetId: string) => void;
  onClose: () => void;
}) {
  const canHaveVariants = ownsVariantContract(asset.kind);

  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - MENU_MIN_WIDTH - 8);
  const top = Math.min(anchor.bottom + 4, window.innerHeight - 8);
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    menu.style.top = `${Math.max(8, Math.min(top, window.innerHeight - rect.height - 8))}px`;
    menu.style.left = `${Math.max(8, Math.min(left, window.innerWidth - rect.width - 8))}px`;
  }, [asset.group, canHaveVariants, left, menuRef, top]);

  return (
    <div
      ref={menuRef}
      className="asset-context-menu layer-context-menu-floating"
      style={{ top, left, minWidth: MENU_MIN_WIDTH }}
      role="menu"
      aria-label={`${asset.name} actions`}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onRename(asset.id);
          onClose();
        }}
      >
        Rename
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onGroup(asset.id);
          onClose();
        }}
      >
        Add to group
      </button>
      {asset.group ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onRemoveGroup(asset.id);
            onClose();
          }}
        >
          Remove from group
        </button>
      ) : null}
      {canHaveVariants ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onCreateVariant(asset.id);
            onClose();
          }}
        >
          Create variant
        </button>
      ) : null}
    </div>
  );
}
