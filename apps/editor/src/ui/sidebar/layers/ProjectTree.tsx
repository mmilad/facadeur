import { defaultKinds, defaultNestingRules, type DefaultKind } from '@facadeur/core';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { blankAsset } from '../../../domain/new-asset.js';
import { ownsVariantContract } from '../../../domain/variant-edit.js';
import { createNamedVariant, renameNamedVariant } from '../../../domain/variant-actions.js';
import { VariantActionButton } from '../../controls/variants/VariantActionButton.js';
import type { AssetSummary, EditorSession, EditorSnapshot } from '../../../domain/session.js';
import {
  DESIGN_DOMAIN_ITEMS,
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
  const [contextAssetId, setContextAssetId] = useState<string | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);
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
    if (!contextAssetId) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextAssetId(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [contextAssetId]);

  const designLabelHit = needle.length > 0 && 'design'.includes(needle);
  const designItems = useMemo(
    () =>
      DESIGN_DOMAIN_ITEMS.filter(
        (item) =>
          !needle ||
          designLabelHit ||
          item.label.toLowerCase().includes(needle) ||
          item.keys.some((key) => key.includes(needle)),
      ),
    [designLabelHit, needle],
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
    needle.length > 0 && designItems.length === 0 && groups.every((group) => !group.show);

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
    setContextAssetId(null);
  }

  function renameVariant(assetId: string, name: string, label: string) {
    const asset = snap.catalog.find((candidate) => candidate.id === assetId);
    if (!asset) return;
    if (session.getSnapshot().openId !== assetId) onOpenAsset(assetId);
    renameNamedVariant(session, name, label);
  }

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
        {!needle || designItems.length > 0 ? (
          <TreeGroup
            id="design"
            label="Design"
            open={isOpen('design', needle, expanded)}
            onToggle={() => toggle('design')}
          >
            {designItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={surface === item.id ? 'asset is-active' : 'asset'}
                data-design-domain={item.id}
                aria-pressed={surface === item.id}
                onClick={() => onOpenDesignDomain(item.id)}
              >
                <span className="asset-name">{item.label}</span>
              </button>
            ))}
          </TreeGroup>
        ) : null}
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
                onContextAsset={(assetId) => setContextAssetId(assetId)}
                onCreateVariant={createVariant}
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
                      onContextAsset={(assetId) => setContextAssetId(assetId)}
                      onCreateVariant={createVariant}
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
    </section>
  );
}

function AssetRows({
  assets,
  snap,
  session,
  activeRef,
  onOpenAsset,
  expandedVariants,
  onToggleVariants,
  contextAssetId,
  onContextAsset,
  onCreateVariant,
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
  onContextAsset: (assetId: string) => void;
  onCreateVariant: (assetId: string) => void;
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
            draggable={canPlace(snap, asset.kind, asset.id)}
            onDragStart={(event) => startAssetDrag(session, event, asset.id)}
            onDragEnd={() => session.endDrag()}
            onClick={() => onOpenAsset(asset.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              onContextAsset(asset.id);
            }}
          >
            <span className="asset-name">{asset.name}</span>
            <span className="asset-id">{asset.id}</span>
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
        {contextAssetId === asset.id ? (
          <div className="asset-context-menu" role="menu" aria-label={`${asset.name} actions`}>
            {canHaveVariants ? (
              <button type="button" role="menuitem" onClick={() => onCreateVariant(asset.id)}>
                Create variant
              </button>
            ) : null}
          </div>
        ) : null}
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
