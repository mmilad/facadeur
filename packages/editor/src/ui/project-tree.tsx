import { defaultKinds, defaultNestingRules, type DefaultKind } from '@facadeur/core';
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { blankAsset } from '../new-asset.js';
import type { EditorSession, EditorSnapshot } from '../session.js';
import type { InspectorPanel } from './panels.js';

const KIND_LABEL: Record<DefaultKind, string> = {
  atom: 'Atoms',
  component: 'Components',
  section: 'Sections',
  page: 'Pages',
};

const DESIGN_ITEMS = [
  { id: 'tokens' as const, label: 'Tokens', keys: ['tokens', 'token'] },
  { id: 'fonts' as const, label: 'Schriften', keys: ['schriften', 'schrift', 'fonts', 'font'] },
];

export function ProjectTree({
  session,
  snap,
  panel,
  onOpenAsset,
  onOpenDesign,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  panel: InspectorPanel;
  onOpenAsset: (id: string) => void;
  onOpenDesign: (panel: 'tokens' | 'fonts') => void;
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const needle = query.trim().toLowerCase();
  const openKind = snap.catalog.find((asset) => asset.id === snap.openId)?.kind;

  useEffect(() => {
    if (!openKind) return;
    setExpanded((prev) => (prev[openKind] === false ? { ...prev, [openKind]: true } : prev));
  }, [openKind, snap.openId]);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [snap.openId, expanded, needle]);

  const designLabelHit = needle.length > 0 && 'design'.includes(needle);
  const designItems = useMemo(
    () =>
      DESIGN_ITEMS.filter(
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
        const visible =
          needle && !labelHit ? assets.filter((asset) => assetMatches(asset, needle)) : assets;
        return { kind, assets: visible, show: !needle || labelHit || visible.length > 0 };
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
                className={panel === item.id ? 'asset is-active' : 'asset'}
                data-design={item.id}
                aria-pressed={panel === item.id}
                onClick={() => onOpenDesign(item.id)}
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
              {group.assets.map((asset) => {
                const open = asset.id === snap.openId;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    ref={open ? activeRef : undefined}
                    className={open ? 'asset is-active' : 'asset'}
                    data-asset-id={asset.id}
                    aria-current={open ? 'true' : undefined}
                    draggable={canPlace(snap, asset.kind, asset.id)}
                    onDragStart={(event) => startAssetDrag(session, event, asset.id)}
                    onDragEnd={() => session.endDrag()}
                    onClick={() => onOpenAsset(asset.id)}
                  >
                    <span className="asset-name">{asset.name}</span>
                    <span className="asset-id">{asset.id}</span>
                  </button>
                );
              })}
            </TreeGroup>
          ) : null,
        )}
        {empty ? <p className="inspector-empty tree-empty">No assets match.</p> : null}
      </div>
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
            Neu anlegen
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
