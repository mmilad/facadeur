import { useLayoutEffect, useState, type RefObject } from 'react';
import {
  layerInsertEntriesForLayer,
  type LayerInsertEntry,
} from '../../../domain/layer-insert-policy';
import type { LayerItem } from '../../../domain/selection/selection-model';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import {
  canDeleteLayer,
  canInsertBelowLayer,
  canInsertInsideLayer,
  deleteLayer,
  insertLayerEntry,
} from './layer-context-actions';

type InsertPlacement = 'inside' | 'below';

const MENU_MIN_WIDTH = 168;
const FLYOUT_WIDTH = 148;

export function LayerContextMenu({
  session,
  snap,
  item,
  anchor,
  menuRef,
  onClose,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  item: LayerItem;
  anchor: DOMRect;
  menuRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const [openSubmenu, setOpenSubmenu] = useState<InsertPlacement | null>(null);
  const [flyoutSide, setFlyoutSide] = useState<'left' | 'right'>('right');
  const showInside = canInsertInsideLayer(item, snap);
  const showBelow = canInsertBelowLayer(item, snap);
  const showDelete = canDeleteLayer(item, snap);
  const insideEntries = showInside ? layerInsertEntriesForLayer(snap, item, 'inside') : [];
  const belowEntries = showBelow ? layerInsertEntriesForLayer(snap, item, 'below') : [];
  const hasInsert = insideEntries.length > 0 || belowEntries.length > 0;
  const insertLabel = 'Insert';

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    setFlyoutSide(rect.right + FLYOUT_WIDTH > window.innerWidth ? 'left' : 'right');
  }, [anchor, menuRef, openSubmenu]);

  if (!hasInsert && !showDelete) return null;

  const left = Math.min(Math.max(8, anchor.left), window.innerWidth - MENU_MIN_WIDTH - 8);
  const top = Math.min(anchor.bottom + 4, window.innerHeight - 8);

  return (
    <div
      ref={menuRef}
      className="asset-context-menu layer-context-menu-floating"
      style={{ top, left, minWidth: MENU_MIN_WIDTH }}
      role="menu"
      aria-label={`${item.name} layer actions`}
      onMouseLeave={() => setOpenSubmenu(null)}
    >
      {insideEntries.length ? (
        <InsertSubmenu
          label={`${insertLabel} inside`}
          entries={insideEntries}
          flyoutSide={flyoutSide}
          open={openSubmenu === 'inside'}
          onOpen={() => setOpenSubmenu('inside')}
          onPick={(entry) => {
            insertLayerEntry(session, snap, item, entry, 'inside');
            onClose();
          }}
        />
      ) : null}
      {belowEntries.length ? (
        <InsertSubmenu
          label={`${insertLabel} below`}
          entries={belowEntries}
          flyoutSide={flyoutSide}
          open={openSubmenu === 'below'}
          onOpen={() => setOpenSubmenu('below')}
          onPick={(entry) => {
            insertLayerEntry(session, snap, item, entry, 'below');
            onClose();
          }}
        />
      ) : null}
      {showDelete ? (
        <button
          type="button"
          role="menuitem"
          className="layer-context-menu-danger"
          onClick={() => {
            deleteLayer(session, snap, item);
            onClose();
          }}
        >
          Delete layer
        </button>
      ) : null}
    </div>
  );
}

function InsertSubmenu({
  label,
  entries,
  flyoutSide,
  open,
  onOpen,
  onPick,
}: {
  label: string;
  entries: readonly LayerInsertEntry[];
  flyoutSide: 'left' | 'right';
  open: boolean;
  onOpen: () => void;
  onPick: (entry: LayerInsertEntry) => void;
}) {
  return (
    <div className="context-menu-sub" onMouseEnter={onOpen} onFocus={onOpen}>
      <button
        type="button"
        role="menuitem"
        className="context-menu-sub-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpen()}
      >
        <span>{label}</span>
        <span className="context-menu-sub-chevron" aria-hidden="true">
          {flyoutSide === 'right' ? '›' : '‹'}
        </span>
      </button>
      {open ? (
        <div
          className={
            flyoutSide === 'left' ? 'context-menu-flyout is-left' : 'context-menu-flyout is-right'
          }
          role="menu"
          aria-label={label}
        >
          {entries.map((entry) => (
            <button
              key={entry.kind === 'instance' ? entry.assetId : entry.tool}
              type="button"
              role="menuitem"
              onClick={() => onPick(entry)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
