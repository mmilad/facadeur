'use client';

import { createId, findParent } from '@facadeur/core';
import { placementAllowed, refusalMessage, toolAllowed } from '../../domain/editing';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createAppService, type AppService } from '../../app-service/index';
import { createInMemoryCatalogPort } from '../../domain/project/in-memory-catalog-port';
import {
  openJsonFile,
  parseDocumentText,
  documentToJson,
  download,
} from '../../domain/assets/files';
import { isEditableTarget } from '../../domain/keyboard';
import type { EditorSession } from '../../domain/session';
import {
  EDITOR_VIEW_ITEMS,
  isCatalogDocumentView,
  isDesignDomain,
  isSettingsTokenDomain,
} from '../sidebar/design/design-domain';
import { CatalogCodeStage } from '../stage/CatalogCodeStage';
import { CatalogPreviewDataStage } from '../stage/CatalogPreviewDataStage';
import { CatalogSchemaStage } from '../stage/CatalogSchemaStage';
import { CatalogSchemasPanel } from '../sidebar/design/CatalogSchemasPanel';
import { DesignDomainStage } from '../stage/DesignDomainStage';
import { SettingsSections } from '../sidebar/design/SettingsSections';
import { CatalogLayersPanel } from '../sidebar/layers/CatalogLayersPanel';
import { ProjectTree } from '../sidebar/layers/ProjectTree';
import { RightRail } from '../sidebar/properties/RightRail';
import { StageCanvas } from '../stage/StageCanvas';
import { ResizableInspector } from './ResizableInspector';
import { ResizableLeftRail } from './ResizableLeftRail';
import { ToolBar } from './ToolBar';
import { UnsavedIndicator } from './UnsavedIndicator';
import { KindBadge } from './KindBadge';
import { DocumentBreadcrumb } from './DocumentBreadcrumb';
import { ZoomControls } from './ZoomControls';
import { useEditorNavigation } from './useEditorNavigation';

export function EditorShell({
  session,
  app: appProp,
  connectionStatus,
  persistPendingChanges,
}: {
  session: EditorSession;
  app?: AppService;
  connectionStatus?: string;
  persistPendingChanges?: () => Promise<void>;
}) {
  const app = useMemo(
    () =>
      appProp ??
      createAppService({
        core: session.core,
        session,
        catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
      }),
    [appProp, session],
  );
  const snap = useSyncExternalStore(
    app.subscribe.bind(app),
    app.getSnapshot.bind(app),
    app.getSnapshot.bind(app),
  );
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (globalThis as { __facadeurApp?: typeof app }).__facadeurApp = app;
    }
  }, [app]);
  const { surface, setSurface } = useEditorNavigation(session, snap);
  const designSurface = isDesignDomain(surface);
  const settingsSurface = isSettingsTokenDomain(surface) || surface === 'schemas';
  const editorCanvas = surface === 'editor';
  useEditorKeys(session, editorCanvas);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">facadeur</div>
        <DocumentBreadcrumb session={session} snap={snap} />
        <KindBadge kind={snap.document.kind} />
        {editorCanvas ? (
          <ToolBar
            session={session}
            tool={snap.tool}
            kind={snap.document.kind}
            icons={snap.design.icons}
          />
        ) : null}
        <div className="topbar-spacer" />
        {connectionStatus ? (
          <span className="meta" role="status">
            {connectionStatus}
          </span>
        ) : null}
        {editorCanvas ? <ZoomControls session={session} label={snap.zoomLabel} /> : null}
        {editorCanvas ? (
          <button type="button" className="text-button" onClick={() => session.fit()}>
            Reset view
          </button>
        ) : null}
        <UnsavedIndicator documentDirty={false} designDirty={snap.designDirty} />
        <button type="button" className="text-button" onClick={() => void onOpen(session)}>
          Open
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            download(
              'catalog.json',
              JSON.stringify(app.getCoreSnapshot().catalog, null, 2),
            )
          }
        >
          Export catalog
        </button>
        <button
          type="button"
          className="text-button"
          data-save="catalog"
          onClick={() =>
            void (persistPendingChanges ? persistPendingChanges() : app.persistCatalog())
          }
        >
          Save catalog
        </button>
      </header>
      {snap.notice ? (
        <p
          className={snap.notice.tone === 'error' ? 'notice notice-error' : 'notice'}
          role="status"
        >
          {snap.notice.text}
        </p>
      ) : null}
      <nav className="editor-subnav" aria-label="Editor views" data-testid="editor-subnav">
        <button
          type="button"
          className={settingsSurface ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
          aria-current={settingsSurface ? 'page' : undefined}
          data-subnav="settings"
          onClick={() => setSurface(settingsSurface ? surface : 'colors')}
        >
          Settings
        </button>
        <button
          type="button"
          data-surface="icons"
          className={surface === 'icons' ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
          aria-current={surface === 'icons' ? 'page' : undefined}
          onClick={() => setSurface('icons')}
        >
          Icons
        </button>
        {EDITOR_VIEW_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={surface === item.id ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
            aria-current={surface === item.id ? 'page' : undefined}
            data-surface={item.id}
            onClick={() => setSurface(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="workspace">
        <aside className="side side-left">
          {designSurface || surface === 'schemas' ? (
            <div className="design-project-navigation">
              <ProjectTree
                app={app}
                session={session}
                snap={snap}
                surface={surface}
                onOpenAsset={(id) => {
                  session.openAsset(id, 'root');
                  setSurface('editor');
                }}
                onOpenDesignDomain={setSurface}
              />
            </div>
          ) : (
            <ResizableLeftRail
              project={
                <ProjectTree
                  app={app}
                  session={session}
                  snap={snap}
                  surface={surface}
                  onOpenAsset={(id) => {
                    session.openAsset(id, 'root');
                    if (isDesignDomain(surface)) setSurface('editor');
                  }}
                  onOpenDesignDomain={(domain) => setSurface(domain)}
                />
              }
              layers={
                editorCanvas ? (
                  <CatalogLayersPanel app={app} session={session} snap={snap} />
                ) : null
              }
            />
          )}
        </aside>
        {surface === 'schemas' ? (
          <CatalogSchemasPanel
            app={app}
            session={session}
            surface={surface}
            onSelectSurface={setSurface}
          />
        ) : isDesignDomain(surface) ? (
          <DesignDomainStage
            session={session}
            snap={snap}
            domain={surface}
            onSelectDomain={setSurface}
          />
        ) : surface === 'schema' ? (
          <CatalogSchemaStage
            app={app}
            session={session}
            onOpenSchemas={() => setSurface('schemas')}
          />
        ) : surface === 'code' ? (
          <CatalogCodeStage app={app} generation={snap.generation} />
        ) : surface === 'preview' ? (
          <CatalogPreviewDataStage app={app} session={session} />
        ) : (
          <StageCanvas
            app={app}
            session={session}
            openId={snap.openId}
            generation={snap.generation}
            designRevision={snap.designRevision}
            selectedRenderId={snap.selectedRenderId}
            focusViewportId={snap.focusViewportId}
            selectedViewportId={snap.selectedViewportId}
            chromeRevision={snap.revision}
            activeVariantName={snap.activeVariantName}
            tool={snap.tool}
          />
        )}
        {designSurface || surface === 'schemas' || isCatalogDocumentView(surface) ? null : (
          <ResizableInspector>
            <RightRail app={app} session={session} snap={snap} surface={surface} />
          </ResizableInspector>
        )}
      </div>
    </div>
  );
}

/** @deprecated Use EditorShell — kept for tests importing App. */
export const App = EditorShell;

function useEditorKeys(session: EditorSession, canvasActive: boolean) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && (event.ctrlKey || event.metaKey) && !event.altKey) {
        event.preventDefault();
        if (event.shiftKey) session.redo();
        else session.undo();
        return;
      }
      if (!canvasActive) return;
      if (key === 'g' && event.altKey && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
        event.preventDefault();
        const snap = session.getSnapshot();
        const nodeId = snap.selectedNodeId;
        if (!nodeId || nodeId === snap.document.rootId) return;
        const parent = findParent(snap.document, nodeId);
        if (!parent || !placementAllowed(snap.document, parent.id, 'frame')) {
          session.setNotice(refusalMessage(snap.document.kind, 'frame'));
          return;
        }
        const frameId = createId();
        session.execute({ type: 'wrap', nodeId, frameId });
        if (session.getSnapshot().document.nodes[frameId]) session.selectNode(frameId);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (key === 'escape') {
        const snap = session.getSnapshot();
        if (snap.tool !== 'select') {
          session.setTool('select');
          return;
        }
        if (!snap.selectedNodeId) return;
        session.selectNode(findParent(snap.document, snap.selectedNodeId)?.id ?? null);
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        const snap = session.getSnapshot();
        const nodeId = snap.selectedNodeId;
        if (!nodeId || nodeId === snap.document.rootId || snap.nestedSelection) return;
        const parent = findParent(snap.document, nodeId);
        event.preventDefault();
        try {
          session.execute({ type: 'remove', nodeId });
          session.selectNode(parent?.id ?? null);
        } catch (error) {
          session.setNotice(
            error instanceof Error ? error.message : 'Could not remove layer',
            'error',
          );
        }
        return;
      }
      if (key === 'f' || key === 't' || key === 'i') {
        const tool = key === 'f' ? 'frame' : key === 't' ? 'text' : 'image';
        const snap = session.getSnapshot();
        if (!toolAllowed(snap.document.kind, tool)) {
          session.setNotice(refusalMessage(snap.document.kind, tool));
          return;
        }
        session.setTool(tool);
      } else if (key === 'v') session.setTool('select');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, canvasActive]);
}

async function onOpen(session: EditorSession) {
  try {
    const opened = await openJsonFile();
    if (!opened) return;
    const file = parseDocumentText(opened.text);
    session.loadDocument(file, opened.handle);
    if (session.getSnapshot().notice?.tone === 'error') return;
    session.setNotice(`Opened ${opened.name}`);
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Could not open the file', 'error');
  }
}
