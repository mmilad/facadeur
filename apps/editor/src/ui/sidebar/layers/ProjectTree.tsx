import { defaultKinds, type DefaultKind } from '@facadeur/core';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AssetContextMenu } from './AssetContextMenu.js';
import { blankAsset } from '../../../domain/assets/new-asset.js';
import { ownsVariantContract } from '../../../domain/edits/variant-edit.js';
import { createNamedVariant, renameNamedVariant } from '../../../domain/variant-actions.js';
import { AssetRows } from './AssetRows.js';
import type { AssetSummary, EditorSession, EditorSnapshot } from '../../../domain/session.js';
import {
  SIDEBAR_DESIGN_ITEMS,
  type DesignDomain,
  type EditorSurface,
} from '../design/design-domain.js';

const KIND_LABEL: Record<DefaultKind, string> = {
  atom: 'Atoms',
  component: 'Components',
  section: 'Sections',
  page: 'Pages',
};

export function ProjectTree({
  session,
  snap,
  surface,
  onOpenAsset,
  onOpenDesignDomain,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  surface: EditorSurface;
  onOpenAsset: (id: string) => void;
  onOpenDesignDomain: (domain: DesignDomain) => void;
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [assetContextMenu, setAssetContextMenu] = useState<{
    assetId: string;
    anchor: DOMRect;
  } | null>(null);
  const contextAssetId = assetContextMenu?.assetId ?? null;
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const needle = query.trim().toLowerCase();
  const openKind = snap.catalog.find((asset) => asset.id === snap.openId)?.kind;

  useEffect(() => {
    if (!openKind) return;
    setExpanded((prev) => (prev[openKind] === false ? { ...prev, [openKind]: true } : prev));
  }, [openKind, snap.openId]);

  useEffect(() => {
    const asset = snap.catalog.find((candidate) => candidate.id === snap.openId);
    if (!asset || !ownsVariantContract(asset.kind) || !hasNamedVariants(asset)) return;
    setExpandedVariants((prev) => (prev[asset.id] === true ? prev : { ...prev, [asset.id]: true }));
  }, [snap.catalog, snap.openId]);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [snap.openId, expanded, needle]);

  useEffect(() => {
    if (!assetContextMenu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setAssetContextMenu(null);
    };
    window.addEventListener('keydown', close, true);
    return () => window.removeEventListener('keydown', close, true);
  }, [assetContextMenu]);

  useEffect(() => {
    if (assetContextMenu && !snap.catalog.some((asset) => asset.id === assetContextMenu.assetId)) {
      setAssetContextMenu(null);
    }
  }, [assetContextMenu, snap.catalog]);

  useEffect(() => {
    setAssetContextMenu((current) => (current && current.assetId !== snap.openId ? null : current));
  }, [snap.openId]);

  useEffect(() => {
    if (!assetContextMenu) return;
    const close = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) setAssetContextMenu(null);
    };
    const closeOnBlur = () => setAssetContextMenu(null);
    document.addEventListener('pointerdown', close, true);
    window.addEventListener('blur', closeOnBlur);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      window.removeEventListener('blur', closeOnBlur);
    };
  }, [assetContextMenu]);

  const sidebarDesignItems = useMemo(
    () =>
      SIDEBAR_DESIGN_ITEMS.filter(
        (item) =>
          !needle ||
          item.label.toLowerCase().includes(needle) ||
          item.keys.some((key) => key.includes(needle)),
      ),
    [needle],
  );

  const groups = useMemo(
    () =>
      defaultKinds.map((kind) => {
        const assets = snap.catalog.filter((asset) => asset.kind === kind);
        const labelHit = Boolean(needle) && KIND_LABEL[kind].toLowerCase().includes(needle);
        const directAssets = assets.filter((asset) => !asset.group);
        const directVisible =
          needle && !labelHit
            ? directAssets.filter((asset) => assetMatches(asset, needle))
            : directAssets;
        const groupNames = [
          ...new Set(assets.flatMap((asset) => (asset.group ? [asset.group] : []))),
        ];
        const subgroups = groupNames.map((group) => {
          const groupedAssets = assets.filter((asset) => asset.group === group);
          const groupLabelHit = Boolean(needle) && group.includes(needle);
          const visible =
            needle && !labelHit && !groupLabelHit
              ? groupedAssets.filter((asset) => assetMatches(asset, needle))
              : groupedAssets;
          return {
            id: group,
            label: titleCase(group),
            assets: visible,
            show: !needle || labelHit || groupLabelHit || visible.length > 0,
          };
        });
        return {
          kind,
          assets: directVisible,
          subgroups,
          show:
            !needle ||
            labelHit ||
            directVisible.length > 0 ||
            subgroups.some((group) => group.show),
        };
      }),
    [needle, snap.catalog],
  );

  const empty =
    needle.length > 0 && sidebarDesignItems.length === 0 && groups.every((group) => !group.show);

  function toggle(id: string) {
    if (needle) return;
    setExpanded((prev) => ({ ...prev, [id]: prev[id] === false }));
  }

  function create(kind: DefaultKind) {
    const file = blankAsset(kind, snap.catalog);
    session.loadDocument(file);
    if (session.getSnapshot().notice?.tone === 'error') return;
    setQuery('');
    setExpanded((prev) => ({ ...prev, [kind]: true }));
    onOpenAsset(file.id);
  }

  function createVariant(assetId: string) {
    const current = session.getSnapshot();
    if (current.openId !== assetId) onOpenAsset(assetId);
    if (!createNamedVariant(session)) return;
    setExpandedVariants((prev) => ({ ...prev, [assetId]: true }));
    setAssetContextMenu(null);
  }

  function openAssetContext(assetId: string, anchorEl: HTMLElement) {
    setAssetContextMenu({ assetId, anchor: anchorEl.getBoundingClientRect() });
  }

  function renameVariant(assetId: string, name: string, label: string) {
    const asset = snap.catalog.find((candidate) => candidate.id === assetId);
    if (!asset) return;
    if (session.getSnapshot().openId !== assetId) onOpenAsset(assetId);
    renameNamedVariant(session, name, label);
  }

  const contextAsset = assetContextMenu
    ? snap.catalog.find((candidate) => candidate.id === assetContextMenu.assetId)
    : undefined;

  return (
    <section className="side-block side-block-tree" aria-label="Project">
      <h2>Project</h2>
      <label className="field tree-search">
        <span>Search</span>
        <input
          name="asset-search"
          value={query}
          placeholder="Name or id"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="side-note">Drag a row onto the stage to insert an instance.</p>
      <div className="side-scroll">
        {sidebarDesignItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              surface === item.id
                ? 'asset design-sidebar-item is-active'
                : 'asset design-sidebar-item'
            }
            data-design-domain={item.id}
            aria-pressed={surface === item.id}
            onClick={() => onOpenDesignDomain(item.id)}
          >
            <span className="asset-name">{item.label}</span>
          </button>
        ))}
        {groups.map((group) =>
          group.show ? (
            <TreeGroup
              key={group.kind}
              id={group.kind}
              label={KIND_LABEL[group.kind]}
              open={isOpen(group.kind, needle, expanded)}
              onToggle={() => toggle(group.kind)}
              onCreate={() => create(group.kind)}
            >
              <AssetRows
                assets={group.assets}
                snap={snap}
                session={session}
                activeRef={activeRef}
                onOpenAsset={onOpenAsset}
                expandedVariants={expandedVariants}
                onToggleVariants={(assetId) =>
                  setExpandedVariants((prev) => ({ ...prev, [assetId]: prev[assetId] !== true }))
                }
                contextAssetId={contextAssetId}
                onContextAsset={openAssetContext}
                onRenameVariant={renameVariant}
              />
              {group.subgroups.map((subgroup) =>
                subgroup.show ? (
                  <TreeGroup
                    key={subgroup.id}
                    id={`${group.kind}:${subgroup.id}`}
                    label={subgroup.label}
                    open={isOpen(`${group.kind}:${subgroup.id}`, needle, expanded)}
                    onToggle={() => toggle(`${group.kind}:${subgroup.id}`)}
                  >
                    <AssetRows
                      assets={subgroup.assets}
                      snap={snap}
                      session={session}
                      activeRef={activeRef}
                      onOpenAsset={onOpenAsset}
                      expandedVariants={expandedVariants}
                      onToggleVariants={(assetId) =>
                        setExpandedVariants((prev) => ({
                          ...prev,
                          [assetId]: prev[assetId] !== true,
                        }))
                      }
                      contextAssetId={contextAssetId}
                      onContextAsset={openAssetContext}
                      onRenameVariant={renameVariant}
                    />
                  </TreeGroup>
                ) : null,
              )}
            </TreeGroup>
          ) : null,
        )}
        {empty ? <p className="inspector-empty tree-empty">No assets match.</p> : null}
      </div>
      {contextAsset && assetContextMenu
        ? createPortal(
            <AssetContextMenu
              asset={contextAsset}
              anchor={assetContextMenu.anchor}
              menuRef={contextMenuRef}
              onCreateVariant={createVariant}
              onClose={() => setAssetContextMenu(null)}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

function hasNamedVariants(asset: Pick<AssetSummary, 'variants'>): boolean {
  return (asset.variants ?? []).some((variant) => !variant.isDefault);
}

function TreeGroup({
  id,
  label,
  open,
  onToggle,
  onCreate,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  onCreate?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="tree-group" data-group={id}>
      <div className="tree-group-head">
        <button
          type="button"
          className="tree-toggle"
          name={`toggle-${id}`}
          aria-expanded={open}
          onClick={onToggle}
        >
          <span className="tree-chevron" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <span>{label}</span>
        </button>
        {onCreate ? (
          <button type="button" className="tree-create" name={`create-${id}`} onClick={onCreate}>
            New
          </button>
        ) : null}
      </div>
      {open ? <div className="tree-children">{children}</div> : null}
    </div>
  );
}

function isOpen(id: string, needle: string, expanded: Record<string, boolean>): boolean {
  if (needle) return true;
  return expanded[id] !== false;
}

function assetMatches(asset: { name: string; id: string }, needle: string): boolean {
  return asset.name.toLowerCase().includes(needle) || asset.id.toLowerCase().includes(needle);
}

function titleCase(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
