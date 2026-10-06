'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { readOnlySession } from '../../domain/project/read-only-session.js';
import type { EditorSession } from '../../domain/session.js';
import { CodeStage } from '../stage/CodeStage.js';
import { StageCanvas } from '../stage/StageCanvas.js';

export function ProjectViewer({ session }: { session: EditorSession }) {
  const viewer = useMemo(() => readOnlySession(session), [session]);
  const snap = useSyncExternalStore(viewer.subscribe, viewer.getSnapshot, viewer.getSnapshot);
  const [showCode, setShowCode] = useState(false);
  return (
    <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <label>
          Document{' '}
          <select value={snap.openId} onChange={(event) => viewer.openAsset(event.target.value)}>
            {snap.catalog.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </select>
        </label>
        <span className="meta">View only</span>
        <button type="button" className="text-button" onClick={() => setShowCode(!showCode)}>
          {showCode ? 'Preview' : 'Generated code'}
        </button>
        <button type="button" className="text-button" onClick={() => viewer.fit()}>
          Fit preview
        </button>
      </header>
      {snap.notice ? (
        <p role="status" className="notice">
          {snap.notice.text}
        </p>
      ) : null}
      {showCode ? (
        <CodeStage session={viewer} snap={snap} />
      ) : (
        <StageCanvas
          session={viewer}
          openId={snap.openId}
          generation={snap.generation}
          designRevision={snap.designRevision}
          selectedRenderId={snap.selectedRenderId}
          focusViewportId={snap.focusViewportId}
          selectedViewportId={snap.selectedViewportId}
          chromeRevision={snap.revision}
          activeVariantName={snap.activeVariantName}
          tool="select"
          readOnly
        />
      )}
    </main>
  );
}
