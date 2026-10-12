'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { AppService } from '../app-service';
import { createAppService } from '../app-service';
import { createInMemoryCatalogPort } from '../domain/project/in-memory-catalog-port';
import { download } from '../domain/assets/files';
import type { EditorSession } from '../domain/session';
import { EditorEventType } from '../domain/sidebar/events';
import { createEditorEventHandler } from '../ui/shell/editor-event-handler';
import type { EditorNavigationAdapter } from '../ui/shell/navigation/navigation-adapter';
import { useEditorNavigation } from '../ui/shell/navigation/useEditorNavigation';
import { AppShell } from '../ui/shell/AppShell';
import { CatalogCodeStage } from '../ui/stage/CatalogCodeStage';
import { CatalogPreviewDataStage } from '../ui/stage/CatalogPreviewDataStage';
import { CatalogSchemaStage } from '../ui/stage/CatalogSchemaStage';
import { CatalogDesignPropsPanel } from '../ui/settings/catalog/CatalogDesignPropsPanel';
import { CatalogSchemasPanel } from '../ui/settings/catalog/CatalogSchemasPanel';
import { DesignDomainStage } from '../ui/stage/DesignDomainStage';
import { StageCanvas } from '../ui/stage/StageCanvas';
import { isDesignDomain } from '../ui/design/design-domain';
import { useEditorKeys } from './useEditorKeys';

export function EditorHost({
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
  const { surface, setSurface } = useEditorNavigation(session, snap, navigation);
  const onEvent = useMemo(() => {
    const dispatch = createEditorEventHandler({
      app,
      session,
      getSurface: () => surface,
      navigate: setSurface,
    });
    return (event: Parameters<typeof dispatch>[0]) => {
      if (event.type === EditorEventType.CatalogExport) {
        download('catalog.json', JSON.stringify(app.getCatalog(), null, 2));
        return;
      }
      if (event.type === EditorEventType.CatalogPersist && persistPendingChanges) {
        void persistPendingChanges().catch((error) => {
          session.setNotice(
            error instanceof Error ? error.message : 'Could not save catalog',
            'error',
          );
        });
        return;
      }
      dispatch(event);
    };
  }, [app, persistPendingChanges, session, setSurface, surface]);

  useEditorKeys({ session, canvasActive: surface === 'editor', onEvent });

  let mainContent: ReactNode;
  if (surface === 'schemas') {
    mainContent = <CatalogSchemasPanel schemas={app.getSchemas()} surface={surface} onEvent={onEvent} />;
  } else if (surface === 'props') {
    mainContent = <CatalogDesignPropsPanel entries={app.getDesignProps()} surface={surface} onEvent={onEvent} />;
  } else if (isDesignDomain(surface)) {
    mainContent = <DesignDomainStage snap={snap} domain={surface} onEvent={onEvent} />;
  } else if (surface === 'schema') {
    mainContent = <CatalogSchemaStage app={app} onEvent={onEvent} />;
  } else if (surface === 'code') {
    mainContent = <CatalogCodeStage app={app} generation={snap.generation} />;
  } else if (surface === 'preview') {
    mainContent = <CatalogPreviewDataStage app={app} onEvent={onEvent} />;
  } else {
    mainContent = (
      <StageCanvas
        app={app}
        session={session}
        onEvent={onEvent}
        openId={snap.openId}
        generation={snap.generation}
        designRevision={snap.designRevision}
        selectedRenderId={snap.selectedRenderId}
        focusViewportId={snap.focusViewportId}
        selectedViewportId={snap.selectedViewportId}
        tool={snap.tool}
      />
    );
  }

  return (
    <AppShell
      snap={snap}
      mainContent={mainContent}
      documentTitle={
        snap.openDefinition
          ? (app.getDefinitionDisplayName(snap.openDefinition.uuid) ?? snap.openDefinition.name)
          : 'Design'
      }
      surface={surface}
      onEvent={onEvent}
      connectionStatus={connectionStatus}
    />
  );
}


