import { defaultNestingRules, type DefaultKind } from '@facadeur/core';
import type { DragEvent, MutableRefObject } from 'react';
import { ownsVariantContract } from '../../../domain/edits/variant-edit';
import { VariantActionButton } from '../../controls/variants/VariantActionButton';
import type { AssetSummary, EditorSession, EditorSnapshot } from '../../../domain/session';

export function AssetRows({
  assets,
  snap,
  session,
  activeRef,
  onOpenAsset,
  expandedVariants,
  onToggleVariants,
  contextAssetId,
  onContextAsset,
  onRenameVariant,
}: {
  assets: AssetSummary[];
  snap: EditorSnapshot;
  session: EditorSession;
  activeRef: MutableRefObject<HTMLButtonElement | null>;
  onOpenAsset: (id: string) => void;
  expandedVariants: Readonly<Record<string, boolean>>;
  onToggleVariants: (assetId: string) => void;
  contextAssetId: string | null;
  onContextAsset: (assetId: string, anchorEl: HTMLElement) => void;
  onRenameVariant: (assetId: string, name: string, label: string) => void;
}) {
  return assets.map((asset) => {
    const open = asset.id === snap.openId;
    const variants = asset.variants ?? [];
    const canHaveVariants = ownsVariantContract(asset.kind);
    const hasVariants = hasNamedVariants(asset);
    const variantsOpen = expandedVariants[asset.id] === true;
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
          {canHaveVariants && hasVariants ? (
            <button
              type="button"
              className="asset-variants-toggle"
              name={`toggle-variants-${asset.id}`}
              aria-label={`${variantsOpen ? 'Collapse' : 'Expand'} variants for ${asset.name}`}
              aria-expanded={variantsOpen}
              onClick={() => onToggleVariants(asset.id)}
            >
              {variantsOpen ? '▾' : '▸'}
            </button>
          ) : null}
        </div>
        {canHaveVariants && hasVariants && variantsOpen ? (
          <div className="asset-variants" role="list" aria-label={`${asset.name} variants`}>
            {variants.map((variant) => {
              const variantActive = open
                ? (snap.activeVariantName ?? 'default') === variant.name
                : false;
              return (
                <div
                  key={variant.name}
                  role="listitem"
                  className={variantActive ? 'asset-variant is-active' : 'asset-variant'}
                >
                  <VariantActionButton
                    name={`variant-${asset.id}-${variant.name}`}
                    label={variant.label}
                    onRename={(label) => onRenameVariant(asset.id, variant.name, label)}
                    aria-current={variantActive ? 'true' : undefined}
                    onClick={() => {
                      onOpenAsset(asset.id);
                      session.setActiveVariant(variant.isDefault ? null : variant.name);
                    }}
                  >
                    {variant.label}
                  </VariantActionButton>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  });
}

function hasNamedVariants(asset: Pick<AssetSummary, 'variants'>): boolean {
  return (asset.variants ?? []).some((variant) => !variant.isDefault);
}

function canPlace(snap: EditorSnapshot, kind: DefaultKind, id: string): boolean {
  if (id === snap.openId) return false;
  const openKind = kindOf(snap.document.kind);
  return defaultNestingRules[openKind].instanceKinds.includes(kind);
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
