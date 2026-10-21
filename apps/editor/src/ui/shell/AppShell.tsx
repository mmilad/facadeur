'use client';

import { useMemo } from 'react';
import { renderDesignCss } from '@facadeur/style-engine';
import type { EditorSnapshot } from '../../domain/session';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';
import type { ReactNode } from 'react';
import type { EditorSurface } from '../design/design-domain';
import { isCatalogDocumentView, isDesignDomain } from '../design/design-domain';
import { CatalogLayersPanel } from '../sidebar/left/CatalogLayersPanel';
import { ProjectTree } from '../sidebar/left/ProjectTree';
import { RightRail } from '../sidebar/right/RightRail';
import { ResizableInspector } from './ResizableInspector';
import { ResizableLeftRail } from './ResizableLeftRail';
import { ToolBar } from './ToolBar';
import { UnsavedIndicator } from './UnsavedIndicator';
import { KindBadge } from './KindBadge';
import { DocumentTitle } from './DocumentTitle';
import { ZoomControls } from './ZoomControls';
import { EditorSubnav } from './navigation/EditorSubnav';

export function AppShell({
  snap,
  documentTitle,
  mainContent,
  surface,
  onEvent,
  connectionStatus,
}: {
  snap: EditorSnapshot;
  documentTitle: string;
  mainContent: ReactNode;
  surface: EditorSurface;
  onEvent: (event: EditorEvent) => void;
  connectionStatus?: string;
}) {
  const designSurface = isDesignDomain(surface);
  const editorCanvas = surface === 'editor';
  const activeKind = snap.openDefinition?.kind ?? snap.workspace;
  const designStyles = useMemo(
    () =>
      renderDesignCss(
        { tokens: snap.design.tokens, breakpoints: snap.design.breakpoints },
        { selector: '.design-domain-stage' },
      ),
    [snap.design.tokens, snap.design.breakpoints],
  );

  return (
    <div className="app">
      <style>{designStyles}</style>
      <header className="topbar">
        <div className="brand">facadeur</div>
        <DocumentTitle title={documentTitle} />
        <KindBadge kind={activeKind} />
        {editorCanvas ? (
          <ToolBar onEvent={onEvent} tool={snap.tool} kind={activeKind} icons={snap.design.icons} />
        ) : null}
        <div className="topbar-spacer" />
        {connectionStatus ? (
          <span className="meta" role="status">
            {connectionStatus}
          </span>
        ) : null}
        {editorCanvas ? <ZoomControls onEvent={onEvent} label={snap.zoomLabel} /> : null}
        {editorCanvas ? (
          <button
            type="button"
            className="text-button"
            onClick={() => onEvent({ type: EditorEventType.CanvasFit, data: {} })}
          >
            Reset view
          </button>
        ) : null}
        <UnsavedIndicator designDirty={snap.designDirty} />
        <button
          type="button"
          className="text-button"
          onClick={() => onEvent({ type: EditorEventType.CatalogExport, data: {} })}
        >
          Export catalog
        </button>
        <button
          type="button"
          className="text-button"
          data-save="catalog"
          onClick={() => onEvent({ type: EditorEventType.CatalogPersist, data: {} })}
        >
          Copy catalog JSON
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
      <EditorSubnav surface={surface} onEvent={onEvent} />
      <div className="workspace">
        <aside className="side side-left">
          {designSurface || surface === 'schemas' ? (
            <div className="design-project-navigation">
              <ProjectTree model={snap.sidebar.project} surface={surface} onEvent={onEvent} />
            </div>
          ) : (
            <ResizableLeftRail
              project={
                <ProjectTree model={snap.sidebar.project} surface={surface} onEvent={onEvent} />
              }
              layers={
                editorCanvas ? (
                  <CatalogLayersPanel model={snap.sidebar.layers} onEvent={onEvent} />
                ) : null
              }
            />
          )}
        </aside>
        {mainContent}
        {designSurface || surface === 'schemas' || isCatalogDocumentView(surface) ? null : (
          <ResizableInspector>
            <RightRail
              model={snap.sidebar.inspector}
              definition={snap.openDefinition}
              onEvent={onEvent}
            />
          </ResizableInspector>
        )}
      </div>
    </div>
  );
}
