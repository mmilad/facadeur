import { useCallback, useEffect, useRef, useState } from 'react';
import { activeBreakpoints, findNodeByUuid } from '@facadeur/core';
import {
  EDITOR_NAVIGATION_PARAMS,
  hasEditorNavigationSelection,
  parseEditorNavigation,
  writeEditorNavigation,
} from '../../../domain/navigation/editor-navigation';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import {
  DESIGN_DOMAIN_ITEMS,
  EDITOR_VIEW_ITEMS,
  type EditorSurface,
} from '../../design/design-domain';
import type { EditorNavigationAdapter } from './navigation-adapter';

const surfaces = new Set<string>([
  ...EDITOR_VIEW_ITEMS.map((item) => item.id),
  ...DESIGN_DOMAIN_ITEMS.map((item) => item.id),
  'schemas',
  'props',
]);

const isSurface = (value: string) => surfaces.has(value);

export function useEditorNavigation(
  session: EditorSession,
  snap: EditorSnapshot,
  navigation: EditorNavigationAdapter,
): { surface: EditorSurface; setSurface: (surface: EditorSurface) => void } {
  const { pathname, search, push, replace } = navigation;
  const query = search;
  const searchParams = new URLSearchParams(query);
  const parsed = parseEditorNavigation(searchParams, { isSurface });
  const [surface, setSurfaceState] = useState<EditorSurface>(() => parsed.surface as EditorSurface);
  const initialized = useRef(false);
  const initialSelection = useRef({
    documentId: snap.openId,
    layerId: snap.selectedCatalogNodeUuid ?? undefined,
    viewportId: snap.selectedViewportId ?? undefined,
    surface: 'editor',
  });
  const canonicalize = useRef(false);
  const initialSyncDone = useRef(false);
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

    if (shouldApplySelection && requested.documentId) {
      const exists = next.catalog.some((asset) => asset.id === requested.documentId);
      if (exists && requested.documentId !== next.openId) {
        session.openAsset(requested.documentId, 'root');
        next = session.getSnapshot();
      }
    }

    if (shouldApplySelection) {
      const requestedLayer = requested.layerId;
      const currentLayer = next.selectedCatalogNodeUuid;
      if (requestedLayer) {
        const root = next.openDefinition?.root;
        const nodeId = root
          ? findNodeByUuid(root, requestedLayer)
            ? requestedLayer
            : root.uuid
          : null;
        if (nodeId !== currentLayer) {
          session.selectNode(nodeId);
          next = session.getSnapshot();
        }
      }

      const viewportId = requested.viewportId;
      const breakpointExists = Boolean(
        viewportId &&
        activeBreakpoints(snap.design.breakpoints).some((item) => item.uuid === viewportId),
      );
      const wantedViewport = breakpointExists ? viewportId! : null;
      if (wantedViewport !== next.selectedViewportId) {
        session.selectViewport(wantedViewport);
        next = session.getSnapshot();
      }
    }

    if (surface !== requested.surface) {
      setSurfaceState(requested.surface as EditorSurface);
    }

    initialized.current = true;
  }, [query, session]);

  useEffect(() => {
    if (!initialized.current) return;
    const pendingNavigation = pending.current;
    if (pendingNavigation) {
      if (query === pendingNavigation.from) return;
      pending.current = null;
    }
    if (session.getSnapshot().revision !== snap.revision) return;
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      const hasEditorParam =
        Object.values(EDITOR_NAVIGATION_PARAMS).some((key) => searchParams.get(key)) ||
        searchParams.has('variant');
      if (!hasEditorParam) {
        canonicalize.current = false;
        return;
      }
    }
    const current = parseEditorNavigation(searchParams, { isSurface });
    const desired = {
      documentId: snap.openId,
      layerId: snap.selectedCatalogNodeUuid ?? undefined,
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
    const shouldPush =
      !canonicalize.current &&
      (current.surface !== desired.surface || current.documentId !== desired.documentId);
    canonicalize.current = false;
    if (shouldPush) push(target);
    else replace(target);
  }, [
    pathname,
    query,
    push,
    replace,
    session,
    snap.selectedCatalogNodeUuid,
    snap.openId,
    snap.revision,
    snap.selectedRenderId,
    snap.selectedViewportId,
    surface,
  ]);

  const setSurface = useCallback((next: EditorSurface) => setSurfaceState(next), []);
  return { surface, setSurface };
}
