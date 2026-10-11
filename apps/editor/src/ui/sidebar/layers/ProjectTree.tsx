import type { DefaultKind } from '@facadeur/core';
import { SearchField } from '@facadeur/form';
import type { AppService } from '../../../app-service';
import {
  assetKindToCatalogMap,
  blankCatalogDefinition,
} from '../../../domain/catalog/blank-definition';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AssetContextMenu } from './AssetContextMenu';
import { RenameAssetDialog } from './RenameAssetDialog';
import { AssetRows } from './AssetRows';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import {
  SIDEBAR_DESIGN_ITEMS,
  type DesignDomain,
  type EditorSurface,
} from '../../design/design-domain';

const TREE_KINDS = ['atom', 'component', 'page'] as const satisfies readonly DefaultKind[];

const KIND_LABEL: Record<(typeof TREE_KINDS)[number], string> = {
  atom: 'Atoms',
  component: 'Components',
  page: 'Pages',
};

export function ProjectTree({
  app,
  session,
  snap,
  surface,
  onOpenAsset,
  onOpenDesignDomain,
}: {
  app: AppService;
  session: EditorSession;
  snap: EditorSnapshot;
  surface: EditorSurface;
  onOpenAsset: (id: string) => void;
  onOpenDesignDomain: (domain: DesignDomain) => void;
}) {
  const [query, setQuery] = useState('');
  const [renameAssetId, setRenameAssetId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
      TREE_KINDS.map((kind) => {
        const assets = snap.catalog.filter((asset) => asset.kind === kind);
        const labelHit = Boolean(needle) && KIND_LABEL[kind].toLowerCase().includes(needle);
        const visibleAssets =
          needle && !labelHit ? assets.filter((asset) => assetMatches(asset, needle)) : assets;
        return {
          kind,
          assets: visibleAssets,
          show: !needle || labelHit || visibleAssets.length > 0,
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

  async function create(kind: (typeof TREE_KINDS)[number]) {
    const mapKind = assetKindToCatalogMap(kind);
    if (!mapKind) return;
    const definition = blankCatalogDefinition(kind, snap.catalog);
    try {
      await app.createDefinition(mapKind, definition);
      setQuery('');
      setExpanded((prev) => ({ ...prev, [kind]: true }));
    } catch (failure) {
      session.setNotice(
        failure instanceof Error ? failure.message : 'Could not create asset',
        'error',
      );
    }
  }

  function openAssetContext(assetId: string, anchorEl: HTMLElement) {
    setAssetContextMenu({ assetId, anchor: anchorEl.getBoundingClientRect() });
  }

  const contextAsset = assetContextMenu
    ? snap.catalog.find((candidate) => candidate.id === assetContextMenu.assetId)
    : undefined;

  return (
    <section className="side-block side-block-tree" aria-label="Project">
      <h2>Project</h2>
      <label className="field tree-search">
        <span>Search</span>
        <SearchField
          id="asset-search"
          name="asset-search"
          value={query}
          placeholder="Name or id"
          onChange={setQuery}
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
              onCreate={() => void create(group.kind)}
            >
              <AssetRows
                assets={group.assets}
                snap={snap}
                session={session}
                activeRef={activeRef}
                onOpenAsset={onOpenAsset}
                contextAssetId={contextAssetId}
                onContextAsset={openAssetContext}
              />
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
              onRename={(id) => {
                onOpenAsset(id);
                setRenameAssetId(id);
              }}
              onDelete={(id) => {
                void app.deleteDefinition(id).catch((failure) => {
                  session.setNotice(
                    failure instanceof Error ? failure.message : 'Could not delete asset',
                    'error',
                  );
                });
              }}
              onClose={() => setAssetContextMenu(null)}
            />,
            document.body,
          )
        : null}
      {renameAssetId ? (
        <RenameAssetDialog
          key={renameAssetId}
          app={app}
          asset={snap.catalog.find((asset) => asset.id === renameAssetId)!}
          onClose={() => setRenameAssetId(null)}
        />
      ) : null}
    </section>
  );
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

function assetMatches(asset: { name: string; id: string; slug?: string }, needle: string): boolean {
  return (
    asset.name.toLowerCase().includes(needle) ||
    asset.id.toLowerCase().includes(needle) ||
    (asset.slug?.toLowerCase().includes(needle) ?? false)
  );
}
