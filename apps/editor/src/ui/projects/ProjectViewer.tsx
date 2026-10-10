'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { SelectField } from '@facadeur/form';
import { createAppService } from '../../app-service';
import { createInMemoryCatalogPort } from '../../domain/project/in-memory-catalog-port';
import { readOnlySession } from '../../domain/project/read-only-session';
import type { EditorSession } from '../../domain/session';
import { StageCanvas } from '../stage/StageCanvas';

export function ProjectViewer({ session }: { session: EditorSession }) {
  const viewer = useMemo(() => readOnlySession(session), [session]);
  const app = useMemo(
    () =>
      createAppService({
        core: viewer.core,
        session: viewer,
        catalogPort: createInMemoryCatalogPort(() => viewer.core.getSnapshot().catalog),
      }),
    [viewer],
  );
  const snap = useSyncExternalStore(viewer.subscribe, viewer.getSnapshot, viewer.getSnapshot);
  return (
    <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <label htmlFor="viewer-document">Document</label>
        <SelectField
          id="viewer-document"
          aria-label="Document"
          value={snap.openId}
          options={snap.catalog.map((document) => ({
            value: document.id,
            label: document.name,
          }))}
          onChange={(id) => viewer.openAsset(id)}
        />
        <span className="meta">View only</span>
        <button type="button" className="text-button" onClick={() => viewer.fit()}>
          Fit preview
        </button>
      </header>
      {snap.notice ? (
        <p role="status" className="notice">
          {snap.notice.text}
        </p>
      ) : null}
      <StageCanvas
        app={app}
        session={viewer}
        openId={snap.openId}
        generation={snap.generation}
        designRevision={snap.designRevision}
        selectedRenderId={snap.selectedRenderId}
        focusViewportId={snap.focusViewportId}
        selectedViewportId={snap.selectedViewportId}
        tool="select"
        readOnly
      />
    </main>
  );
}
