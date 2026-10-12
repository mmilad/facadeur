'use client';

import {
  canAcceptCatalogChildren,
  createCatalogUuid,
  defaultNestingRules,
  findParentOfNode,
} from '@facadeur/core';
import type { NodeModel } from '@facadeur/core';
import { refusalMessage, toolAllowed } from '../../domain/editing';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createAppService, type AppService } from '../../app-service/index';
import { createInMemoryCatalogPort } from '../../domain/project/in-memory-catalog-port';
import { download } from '../../domain/assets/files';
import { isEditableTarget } from '../../domain/keyboard';
import type { EditorSession } from '../../domain/session';
import { isCatalogDocumentView, isDesignDomain } from '../design/design-domain';
import { CatalogCodeStage } from '../stage/CatalogCodeStage';
import { CatalogPreviewDataStage } from '../stage/CatalogPreviewDataStage';
import { CatalogSchemaStage } from '../stage/CatalogSchemaStage';
import { CatalogDesignPropsPanel } from '../settings/catalog/CatalogDesignPropsPanel';
import { CatalogSchemasPanel } from '../settings/catalog/CatalogSchemasPanel';
import { DesignDomainStage } from '../stage/DesignDomainStage';
import { CatalogLayersPanel } from '../sidebar/left/CatalogLayersPanel';
import { ProjectTree } from '../sidebar/left/ProjectTree';
import { RightRail } from '../sidebar/right/RightRail';
import { StageCanvas } from '../stage/StageCanvas';
import { ResizableInspector } from './ResizableInspector';
import { ResizableLeftRail } from './ResizableLeftRail';
import { ToolBar } from './ToolBar';
import { UnsavedIndicator } from './UnsavedIndicator';
import { KindBadge } from './KindBadge';
import { DocumentTitle } from './DocumentTitle';
import { ZoomControls } from './ZoomControls';
import { EditorSubnav } from './navigation/EditorSubnav';
import type { EditorNavigationAdapter } from './navigation/navigation-adapter';
import { useEditorNavigation } from './navigation/useEditorNavigation';

export function EditorShell({
  session,
  app: appProp,
  navigation,
  connectionStatus,
  persistPendingChanges,
}: {
  session: EditorSession;
  app?: AppService;
  navigation: EditorNavigationAdapter;
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
  const { surface, setSurface } = useEditorNavigation(session, snap, navigation);
  const designSurface = isDesignDomain(surface);
  const editorCanvas = surface === 'editor';
  useEditorKeys(app, session, editorCanvas);
  const activeKind = snap.openDefinition?.kind ?? snap.workspace;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">facadeur</div>
        <DocumentTitle app={app} snap={snap} />
        <KindBadge kind={activeKind} />
        {editorCanvas ? (
          <ToolBar session={session} tool={snap.tool} kind={activeKind} icons={snap.design.icons} />
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
        <UnsavedIndicator designDirty={snap.designDirty} />
        <button
          type="button"
          className="text-button"
          onClick={() => download('catalog.json', JSON.stringify(app.getCatalog(), null, 2))}
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
      <EditorSubnav surface={surface} onSelectSurface={setSurface} />
      <div className="workspace">
        <aside className="side side-left">
          {designSurface || surface === 'schemas' ? (
            <div className="design-project-navigation">
              <ProjectTree
                model={snap.sidebar.project}
                surface={surface}
                onOpenDesignDomain={setSurface}
                onIntent={(intent) => {
                  void app.dispatchSidebarIntent(intent);
                  if (intent.type === 'asset.open') setSurface('editor');
                }}
              />
            </div>
          ) : (
            <ResizableLeftRail
              project={
                <ProjectTree
                  model={snap.sidebar.project}
                  surface={surface}
                  onOpenDesignDomain={(domain) => setSurface(domain)}
                  onIntent={(intent) => {
                    void app.dispatchSidebarIntent(intent);
                    if (intent.type === 'asset.open' && isDesignDomain(surface)) setSurface('editor');
                  }}
                />
              }
              layers={
                editorCanvas ? (
                  <CatalogLayersPanel
                    model={snap.sidebar.layers}
                    onIntent={(intent) => void app.dispatchSidebarIntent(intent)}
                  />
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
        ) : surface === 'props' ? (
          <CatalogDesignPropsPanel
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
          <CatalogPreviewDataStage app={app} />
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
            tool={snap.tool}
          />
        )}
        {designSurface || surface === 'schemas' || isCatalogDocumentView(surface) ? null : (
          <ResizableInspector>
            <RightRail
              model={snap.sidebar.inspector}
              onChange={(nodeId, path, value) =>
                void app.dispatchSidebarIntent({ type: 'inspector.change', nodeId, path, value })
              }
            />
          </ResizableInspector>
        )}
      </div>
    </div>
  );
}

function useEditorKeys(app: AppService, session: EditorSession, canvasActive: boolean) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (!canvasActive) return;
      if (key === 'g' && event.altKey && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
        event.preventDefault();
        const snap = session.getSnapshot();
        const definition = snap.openDefinition;
        const nodeId = snap.selectedCatalogNodeUuid;
        if (!definition || !nodeId || nodeId === definition.root.uuid) return;
        const parentInfo = findParentOfNode(definition.root, nodeId);
        const acceptsFrame = defaultNestingRules[definition.kind].nodeTypes.includes('frame');
        if (!parentInfo || !acceptsFrame || !canAcceptCatalogChildren(parentInfo.parent)) {
          session.setNotice(refusalMessage(definition.kind, 'frame'));
          return;
        }
        const frameId = createCatalogUuid();
        const frame: NodeModel = { uuid: frameId, name: 'layer', dom: { tagName: 'div' } };
        app.insertCatalogNode(parentInfo.parent.uuid, parentInfo.index, frame);
        app.moveCatalogNode(nodeId, frameId, 0);
        session.selectNode(frameId);
        persistCatalogEdit(app);
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
        const definition = snap.openDefinition;
        const parent = definition
          ? findParentOfNode(definition.root, snap.selectedCatalogNodeUuid ?? '')?.parent.uuid
          : undefined;
        session.selectNode(parent ?? null);
        return;
      }
      if (key === 'delete' || key === 'backspace') {
        const snap = session.getSnapshot();
        const definition = snap.openDefinition;
        const nodeId = snap.selectedCatalogNodeUuid;
        if (!definition || !nodeId || nodeId === definition.root.uuid) return;
        const parent = findParentOfNode(definition.root, nodeId);
        event.preventDefault();
        try {
          app.removeCatalogNode(nodeId);
          session.selectNode(parent?.parent.uuid ?? definition.root.uuid);
          persistCatalogEdit(app);
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
        const kind = snap.openDefinition?.kind ?? snap.workspace;
        if (!toolAllowed(kind, tool)) {
          session.setNotice(refusalMessage(kind, tool));
          return;
        }
        session.setTool(tool);
      } else if (key === 'v') session.setTool('select');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app, session, canvasActive]);
}

function persistCatalogEdit(app: AppService) {
  void app.persistCatalog().catch((error) => {
    app.session.setNotice(
      error instanceof Error ? error.message : 'Could not save catalog',
      'error',
    );
  });
}
