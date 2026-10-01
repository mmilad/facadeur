'use client';

import { createId, findParent } from '@facadeur/core';
import { placementAllowed, refusalMessage, toolAllowed } from '../../domain/editing.js';
import dynamic from 'next/dynamic';
import { useEffect, useSyncExternalStore } from 'react';
import { openJsonFile, parseDocumentText } from '../../domain/files.js';
import { isEditableTarget } from '../../domain/keyboard.js';
import type { EditorSession } from '../../domain/session.js';
import { EDITOR_VIEW_ITEMS, isDesignDomain } from '../sidebar/design/design-domain.js';
import { CodeStage } from '../stage/CodeStage.js';
import { DesignDomainStage } from '../stage/DesignDomainStage.js';
import { PreviewDataStage } from '../stage/PreviewDataStage.js';
import { SchemaStage } from '../stage/SchemaStage.js';

const SchemaLibraryStage = dynamic(
  () => import('../stage/SchemaLibraryStage.js').then((mod) => mod.SchemaLibraryStage),
  { ssr: false },
);
import { LayersPanel } from '../sidebar/layers/LayersPanel.js';
import { ProjectTree } from '../sidebar/layers/ProjectTree.js';
import { RightRail } from '../sidebar/properties/RightRail.js';
import { StageCanvas } from '../stage/StageCanvas.js';
import { ResizableInspector } from './ResizableInspector.js';
import { ResizableLeftRail } from './ResizableLeftRail.js';
import { ToolBar } from './ToolBar.js';
import { UnsavedIndicator } from './UnsavedIndicator.js';
import { HistoryButtons } from './HistoryButtons.js';
import { KindBadge } from './KindBadge.js';
import { DocumentBreadcrumb } from './DocumentBreadcrumb.js';
import { ZoomControls } from './ZoomControls.js';
import { useEditorNavigation } from './useEditorNavigation.js';

export function EditorShell({ session }: { session: EditorSession }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const { surface, setSurface } = useEditorNavigation(session, snap);
  const designSurface = isDesignDomain(surface);
  useEditorKeys(session, surface === 'editor');

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">facadeur</div>
        <DocumentBreadcrumb session={session} snap={snap} />
        <KindBadge kind={snap.document.kind} />
        {!designSurface ? (
          <ToolBar
            session={session}
            tool={snap.tool}
            kind={snap.document.kind}
            icons={snap.design.icons}
          />
        ) : null}
        <div className="topbar-spacer" />
        <HistoryButtons session={session} canUndo={snap.canUndo} canRedo={snap.canRedo} />
        {!designSurface ? <ZoomControls session={session} label={snap.zoomLabel} /> : null}
        {!designSurface ? (
          <button type="button" className="text-button" onClick={() => session.fit()}>
            Reset view
          </button>
        ) : null}
        <UnsavedIndicator
          documentDirty={!designSurface && snap.documentDirty}
          designDirty={snap.designDirty}
        />
        <button type="button" className="text-button" onClick={() => void onOpen(session)}>
          Open
        </button>
        <button
          type="button"
          className="text-button"
          data-save={designSurface ? 'design' : 'document'}
          onClick={() => void (designSurface ? session.saveDesign() : session.saveOpenDocument())}
        >
          {designSurface ? 'Save design' : 'Save'}
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
          className={designSurface ? 'editor-subnav-item is-active' : 'editor-subnav-item'}
          aria-current={designSurface ? 'page' : undefined}
          onClick={() => setSurface(designSurface ? surface : 'colors')}
        >
          Design
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
          {designSurface ? (
            <div className="design-project-navigation">
              <ProjectTree
                session={session}
                snap={snap}
                surface={surface}
                onOpenAsset={(id) => {
                  session.openAsset(id);
                  setSurface('editor');
                }}
                onOpenDesignDomain={setSurface}
              />
            </div>
          ) : (
            <ResizableLeftRail
              project={
                <ProjectTree
                  session={session}
                  snap={snap}
                  surface={surface}
                  onOpenAsset={(id) => {
                    session.openAsset(id);
                    if (isDesignDomain(surface)) setSurface('editor');
                  }}
                  onOpenDesignDomain={(domain) => setSurface(domain)}
                />
              }
              layers={<LayersPanel session={session} snap={snap} />}
            />
          )}
        </aside>
        {isDesignDomain(surface) ? (
          <DesignDomainStage session={session} snap={snap} domain={surface} />
        ) : surface === 'schemas' ? (
          <SchemaLibraryStage snap={snap} />
        ) : surface === 'schema' ? (
          <SchemaStage session={session} snap={snap} onOpenSchemas={() => setSurface('schemas')} />
        ) : surface === 'code' ? (
          <CodeStage session={session} snap={snap} />
        ) : surface === 'preview' ? (
          <PreviewDataStage session={session} snap={snap} />
        ) : (
          <StageCanvas
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
        {designSurface ||
        surface === 'schemas' ||
        surface === 'schema' ||
        surface === 'code' ||
        surface === 'preview' ? null : (
          <ResizableInspector>
            <RightRail session={session} snap={snap} surface={surface} />
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
