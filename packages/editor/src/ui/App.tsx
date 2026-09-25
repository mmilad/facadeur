import { createId, findParent } from '@facadeur/core';
import { useEffect, useSyncExternalStore } from 'react';
import { documentToJson, openJsonFile, parseDocumentText, saveJsonFile } from '../files.js';
import { isEditableTarget } from '../keyboard.js';
import type { EditorSession } from '../session.js';
import { AssetList, Inspector, LayersPanel, ToolBar, WorkspaceTabs } from './panels.js';
import { StageCanvas } from './StageCanvas.js';

export function App({ session }: { session: EditorSession }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEditorKeys(session);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">facadeur</div>
        <WorkspaceTabs session={session} workspace={snap.workspace} />
        <div className="topbar-name">{snap.document.name}</div>
        <div className="topbar-spacer" />
        <button
          type="button"
          className="text-button"
          disabled={!snap.canUndo}
          onClick={() => session.undo()}
        >
          Undo
        </button>
        <button
          type="button"
          className="text-button"
          disabled={!snap.canRedo}
          onClick={() => session.redo()}
        >
          Redo
        </button>
        <span className="zoom-readout">{snap.zoomLabel}</span>
        <button type="button" className="text-button" onClick={() => session.fit()}>
          Reset view
        </button>
        <button type="button" className="text-button" onClick={() => void onOpen(session)}>
          Open
        </button>
        <button type="button" className="text-button" onClick={() => void onSave(session)}>
          Save
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
      <div className="workspace">
        <aside className="side side-left">
          <ToolBar session={session} tool={snap.tool} />
          <AssetList session={session} snap={snap} />
          <LayersPanel session={session} snap={snap} />
        </aside>
        <StageCanvas
          session={session}
          openId={snap.openId}
          generation={snap.generation}
          designRevision={snap.designRevision}
          selectedRenderId={snap.selectedRenderId}
          tool={snap.tool}
        />
        <aside className="side side-right">
          <Inspector session={session} snap={snap} />
        </aside>
      </div>
    </div>
  );
}

function useEditorKeys(session: EditorSession) {
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
      if (key === 'g' && event.altKey && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
        event.preventDefault();
        const snap = session.getSnapshot();
        const nodeId = snap.selectedNodeId;
        if (!nodeId || nodeId === snap.document.rootId) return;
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
      if (key === 'f') session.setTool('frame');
      else if (key === 't') session.setTool('text');
      else if (key === 'i') session.setTool('image');
      else if (key === 'v') session.setTool('select');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);
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

async function onSave(session: EditorSession) {
  const snap = session.getSnapshot();
  try {
    const result = await saveJsonFile({
      filename: session.filenameFor(snap.openId),
      text: documentToJson(snap.document),
      handle: session.fileHandle(snap.openId),
    });
    if (result.handle) session.rememberHandle(snap.openId, result.handle);
    const verb = result.via === 'download' ? 'Downloaded' : 'Saved';
    session.setNotice(`${verb} ${session.filenameFor(snap.openId)}`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    session.setNotice(error instanceof Error ? error.message : 'Could not save', 'error');
  }
}
