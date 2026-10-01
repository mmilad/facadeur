import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { editorBreakpoints } from '../../domain/viewport-edit.js';
import {
  EDITOR_NAVIGATION_PARAMS,
  hasEditorNavigationSelection,
  parseEditorNavigation,
  writeEditorNavigation,
} from '../../domain/editor-navigation.js';
import type { EditorSession, EditorSnapshot } from '../../domain/session.js';
import {
  DESIGN_DOMAIN_ITEMS,
  EDITOR_VIEW_ITEMS,
  type EditorSurface,
} from '../sidebar/design/design-domain.js';

const surfaces = new Set<string>([
  ...EDITOR_VIEW_ITEMS.map((item) => item.id),
  ...DESIGN_DOMAIN_ITEMS.map((item) => item.id),
]);

const isSurface = (value: string) => surfaces.has(value);

export function useEditorNavigation(
  session: EditorSession,
  snap: EditorSnapshot,
): { surface: EditorSurface; setSurface: (surface: EditorSurface) => void } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const parsed = parseEditorNavigation(searchParams, { isSurface });
  const [surface, setSurfaceState] = useState<EditorSurface>(() => parsed.surface as EditorSurface);
  const initialized = useRef(false);
  const initialSelection = useRef({
    documentId: snap.openId,
    variantName: snap.activeVariantName ?? undefined,
    layerId: snap.nestedSelection?.renderId ?? snap.selectedNodeId ?? undefined,
    viewportId: snap.selectedViewportId ?? undefined,
    surface: 'editor',
  });
  const canonicalize = useRef(false);
  const initialSyncDone = useRef(false);
  const skipSync = useRef(false);
  const pending = useRef<{ from: string; to: string } | null>(null);

  useEffect(() => {
    const pendingNavigation = pending.current;
    if (pendingNavigation) {
      if (query === pendingNavigation.from) return;
      if (query === pendingNavigation.to) {
        pending.current = null;
        return;
      }
      pending.current = null;
    }

    const requested =
      initialized.current && !query
        ? initialSelection.current
        : parseEditorNavigation(searchParams, { isSurface });
    const shouldApplySelection = hasEditorNavigationSelection(requested);
    canonicalize.current = true;
    let next = session.getSnapshot();
    let changed = false;

    if (shouldApplySelection && requested.documentId) {
      const exists = next.catalog.some((asset) => asset.id === requested.documentId);
      if (exists && requested.documentId !== next.openId) {
        session.openAsset(requested.documentId, 'root');
        next = session.getSnapshot();
        changed = true;
      }
    }

    if (shouldApplySelection) {
      const variant = requested.variantName;
      const variantExists = Boolean(
        variant && next.document.variantPresets?.some((preset) => preset.name === variant),
      );
      const wantedVariant = variantExists ? variant! : null;
      if (wantedVariant !== next.activeVariantName) {
        session.setActiveVariant(wantedVariant);
        next = session.getSnapshot();
        changed = true;
      }

      const requestedLayer = requested.layerId;
      const currentLayer = next.nestedSelection?.renderId ?? next.selectedNodeId;
      if (requestedLayer?.includes('/')) {
        if (requestedLayer !== currentLayer) {
          session.selectRendered(requestedLayer);
          next = session.getSnapshot();
          changed = true;
        }
      } else {
        const nodeId =
          requestedLayer && next.activeDocument.nodes[requestedLayer] ? requestedLayer : null;
        if (nodeId !== currentLayer) {
          session.selectNode(nodeId);
          next = session.getSnapshot();
          changed = true;
        }
      }

      const viewportId = requested.viewportId;
      const breakpointExists = Boolean(
        viewportId &&
        editorBreakpoints(next.document, next.design).some((item) => item.id === viewportId),
      );
      const wantedViewport = breakpointExists ? viewportId! : null;
      if (wantedViewport !== next.selectedViewportId) {
        session.selectViewport(wantedViewport);
        next = session.getSnapshot();
        changed = true;
      }
    }

    if (surface !== requested.surface) {
      setSurfaceState(requested.surface as EditorSurface);
      changed = true;
    }

    initialized.current = true;
    if (changed) skipSync.current = true;
  }, [query, session]);

  useEffect(() => {
    if (!initialized.current) return;
    const pendingNavigation = pending.current;
    if (pendingNavigation) {
      if (query === pendingNavigation.from) return;
      pending.current = null;
    }
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      const hasEditorParam = Object.values(EDITOR_NAVIGATION_PARAMS).some((key) =>
        searchParams.get(key),
      );
      if (!hasEditorParam) {
        canonicalize.current = false;
        return;
      }
    }
    const current = parseEditorNavigation(searchParams, { isSurface });
    const desired = {
      documentId: snap.openId,
      variantName: snap.activeVariantName ?? undefined,
      layerId: snap.nestedSelection?.renderId ?? snap.selectedNodeId ?? undefined,
      viewportId: snap.selectedViewportId ?? undefined,
      surface,
    };
    const nextQuery = writeEditorNavigation(new URLSearchParams(query), desired).toString();
    if (nextQuery === query) {
      canonicalize.current = false;
      return;
    }
    const target = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const from = query;
    pending.current = { from, to: nextQuery };
    const push =
      !canonicalize.current &&
      (current.surface !== desired.surface || current.documentId !== desired.documentId);
    canonicalize.current = false;
    if (push) router.push(target, { scroll: false });
    else router.replace(target, { scroll: false });
  }, [
    pathname,
    query,
    router,
    snap.activeVariantName,
    snap.openId,
    snap.selectedNodeId,
    snap.selectedRenderId,
    snap.selectedViewportId,
    surface,
  ]);

  const setSurface = useCallback((next: EditorSurface) => setSurfaceState(next), []);
  return { surface, setSurface };
}
