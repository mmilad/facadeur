import { SearchField } from '@facadeur/form';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AssetContextMenu } from './AssetContextMenu';
import { AssetCategoryDialog } from './AssetCategoryDialog';
import { RenameAssetDialog } from './RenameAssetDialog';
import { AssetRows } from './AssetRows';
import type { ProjectSidebarModel, SidebarAsset } from '../../../domain/sidebar/types';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';
import { SIDEBAR_DESIGN_ITEMS, type EditorSurface } from '../../design/design-domain';

const TREE_KINDS = ['atom', 'component', 'page'] as const;

const KIND_LABEL: Record<(typeof TREE_KINDS)[number], string> = {
  atom: 'Atoms',
  component: 'Components',
  page: 'Pages',
};

export function ProjectTree({
  model,
  surface,
  onEvent,
}: {
  model: ProjectSidebarModel;
  surface: EditorSurface;
  onEvent: (event: EditorEvent) => void;
}) {
  const [query, setQuery] = useState('');
  const [renameAssetId, setRenameAssetId] = useState<string | null>(null);
  const [categoryAssetId, setCategoryAssetId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [assetContextMenu, setAssetContextMenu] = useState<{
    assetId: string;
    anchor: DOMRect;
  } | null>(null);
  const contextAssetId = assetContextMenu?.assetId ?? null;
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const needle = query.trim().toLowerCase();
  const openAsset = model.assets.find((asset) => asset.id === model.openId);
  const openKind = openAsset?.kind;
  const openCategoryPath =
    openAsset?.kind === 'component' ? categorySegments(openAsset.category).join('/') : '';

  useEffect(() => {
    if (!openKind) return;
    setExpanded((prev) => (prev[openKind] === false ? { ...prev, [openKind]: true } : prev));
  }, [openKind, model.openId]);

  useEffect(() => {
    if (!openCategoryPath) return;
    const parts = openCategoryPath.split('/');
    setExpanded((prev) => {
      const next = { ...prev };
      for (let index = 1; index <= parts.length; index += 1) {
        next[categoryGroupId(parts.slice(0, index).join('/'))] = true;
      }
      return next;
    });
  }, [model.openId, openCategoryPath]);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [model.openId, expanded, needle]);

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
    if (assetContextMenu && !model.assets.some((asset) => asset.id === assetContextMenu.assetId)) {
      setAssetContextMenu(null);
    }
  }, [assetContextMenu, model.assets]);

  useEffect(() => {
    if (categoryAssetId && !model.assets.some((asset) => asset.id === categoryAssetId)) {
      setCategoryAssetId(null);
    }
  }, [categoryAssetId, model.assets]);

  useEffect(() => {
    setAssetContextMenu((current) =>
      current && current.assetId !== model.openId ? null : current,
    );
  }, [model.openId]);

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
        const assets = model.assets.filter((asset) => asset.kind === kind);
        const labelHit = Boolean(needle) && KIND_LABEL[kind].toLowerCase().includes(needle);
        const visibleAssets =
          needle && !labelHit ? assets.filter((asset) => assetMatches(asset, needle)) : assets;
        return {
          kind,
          assets: visibleAssets,
          show: !needle || labelHit || visibleAssets.length > 0,
        };
      }),
    [needle, model.assets],
  );
  const componentCategoryTree = useMemo(
    () =>
      buildComponentCategoryTree(groups.find((group) => group.kind === 'component')?.assets ?? []),
    [groups],
  );

  const empty =
    needle.length > 0 && sidebarDesignItems.length === 0 && groups.every((group) => !group.show);

  function toggle(id: string) {
    if (needle) return;
    setExpanded((prev) => ({ ...prev, [id]: prev[id] === false }));
  }

  function create(kind: (typeof TREE_KINDS)[number]) {
    onEvent({ type: EditorEventType.AssetCreate, data: { kind } });
    setQuery('');
    setExpanded((prev) => ({ ...prev, [kind]: true }));
  }

  function openAssetContext(assetId: string, anchorEl: HTMLElement) {
    setAssetContextMenu({ assetId, anchor: anchorEl.getBoundingClientRect() });
  }

  const contextAsset = assetContextMenu
    ? model.assets.find((candidate) => candidate.id === assetContextMenu.assetId)
    : undefined;
  const categoryAsset = categoryAssetId
    ? model.assets.find((candidate) => candidate.id === categoryAssetId)
    : undefined;

  function categoryRows(nodes: readonly ComponentCategoryNode[]): ReactNode {
    return nodes.map((node) => {
      const id = categoryGroupId(node.path);
      return (
        <TreeGroup
          key={id}
          id={id}
          label={node.label}
          open={isOpen(id, needle, expanded)}
          onToggle={() => toggle(id)}
        >
          {node.assets.length ? (
            <AssetRows
              assets={node.assets}
              openId={model.openId}
              draggableAssetIds={model.draggableAssetIds}
              activeRef={activeRef}
              onEvent={onEvent}
              contextAssetId={contextAssetId}
              onContextAsset={openAssetContext}
            />
          ) : null}
          {categoryRows(node.children)}
        </TreeGroup>
      );
    });
  }

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
            onClick={() =>
              onEvent({ type: EditorEventType.SurfaceNavigate, data: { surfaceId: item.id } })
            }
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
              {group.kind === 'component' ? (
                <>
                  {categoryRows(componentCategoryTree.categories)}
                  {componentCategoryTree.uncategorized.length ? (
                    <TreeGroup
                      id="component-uncategorized"
                      label="Uncategorized"
                      open={isOpen('component-uncategorized', needle, expanded)}
                      onToggle={() => toggle('component-uncategorized')}
                    >
                      <AssetRows
                        assets={componentCategoryTree.uncategorized}
                        openId={model.openId}
                        draggableAssetIds={model.draggableAssetIds}
                        activeRef={activeRef}
                        onEvent={onEvent}
                        contextAssetId={contextAssetId}
                        onContextAsset={openAssetContext}
                      />
                    </TreeGroup>
                  ) : null}
                </>
              ) : (
                <AssetRows
                  assets={group.assets}
                  openId={model.openId}
                  draggableAssetIds={model.draggableAssetIds}
                  activeRef={activeRef}
                  onEvent={onEvent}
                  contextAssetId={contextAssetId}
                  onContextAsset={openAssetContext}
                />
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
              onRename={(id) => {
                onEvent({ type: EditorEventType.AssetOpen, data: { assetId: id } });
                setRenameAssetId(id);
              }}
              onSetCategory={setCategoryAssetId}
              onDelete={(id) =>
                onEvent({ type: EditorEventType.AssetDelete, data: { assetId: id } })
              }
              onClose={() => setAssetContextMenu(null)}
            />,
            document.body,
          )
        : null}
      {renameAssetId ? (
        <RenameAssetDialog
          key={renameAssetId}
          asset={model.assets.find((asset) => asset.id === renameAssetId)!}
          onRename={(id, name) =>
            onEvent({ type: EditorEventType.AssetRename, data: { assetId: id, name } })
          }
          onClose={() => setRenameAssetId(null)}
        />
      ) : null}
      {categoryAsset ? (
        <AssetCategoryDialog
          key={categoryAsset.id}
          asset={categoryAsset}
          onSetCategory={(assetId, category) =>
            onEvent({ type: EditorEventType.AssetCategorySet, data: { assetId, category } })
          }
          onClose={() => setCategoryAssetId(null)}
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

function assetMatches(asset: SidebarAsset, needle: string): boolean {
  return (
    asset.label.toLowerCase().includes(needle) ||
    asset.id.toLowerCase().includes(needle) ||
    (asset.category?.toLowerCase().includes(needle) ?? false) ||
    (asset.slug?.toLowerCase().includes(needle) ?? false)
  );
}

interface ComponentCategoryNode {
  label: string;
  path: string;
  assets: SidebarAsset[];
  children: ComponentCategoryNode[];
  childMap: Map<string, ComponentCategoryNode>;
}

function buildComponentCategoryTree(assets: readonly SidebarAsset[]) {
  const categories = new Map<string, ComponentCategoryNode>();
  const uncategorized: SidebarAsset[] = [];

  for (const asset of assets) {
    const parts = categorySegments(asset.category);
    if (!parts.length) {
      uncategorized.push(asset);
      continue;
    }
    let currentPath = '';
    let current: ComponentCategoryNode | undefined;
    let siblings = categories;
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      current = siblings.get(part);
      if (!current) {
        current = { label: part, path: currentPath, assets: [], children: [], childMap: new Map() };
        siblings.set(part, current);
      }
      siblings = current.childMap;
    }
    current!.assets.push(asset);
  }

  const finalize = (nodes: Map<string, ComponentCategoryNode>) =>
    [...nodes.values()]
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((node) => {
        node.children = finalize(node.childMap);
        return node;
      });

  return { categories: finalize(categories), uncategorized };
}

function categorySegments(category: string | undefined) {
  return (category ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
}

function categoryGroupId(path: string) {
  return `component-category:${path}`;
}
