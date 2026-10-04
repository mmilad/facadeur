'use client';

import { useEffect, useState } from 'react';
import { connectProject, loadProject } from '../domain/project/client.js';
import { logProjectFailure } from '../domain/project/diagnostics.js';
import { EditorShell } from '../ui/shell/EditorShell.js';

export function EditorBootstrap() {
  const [connection, setConnection] = useState<ReturnType<typeof connectProject> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let active: ReturnType<typeof connectProject> | null = null;
    let phase: 'load' | 'connect' = 'load';
    setError(null);
    setConnection(null);
    void loadProject(abort.signal)
      .then((project) => {
        if (abort.signal.aborted) return;
        phase = 'connect';
        active = connectProject(project);
        setConnection(active);
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) {
          logProjectFailure(error, { phase });
          setError(error instanceof Error ? error.message : 'Could not load the project');
        }
      });
    return () => {
      abort.abort();
      active?.destroy();
    };
  }, [attempt]);
  if (connection) return <ConnectedEditor connection={connection} />;
  return (
    <main className="schema-stage">
      <h1>{error ? 'Project unavailable' : 'Loading project…'}</h1>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <p>Check the browser console for details, then retry.</p>
          <button type="button" onClick={() => setAttempt(attempt + 1)}>
            Retry
          </button>
        </>
      ) : null}
    </main>
  );
}

function ConnectedEditor({ connection }: { connection: ReturnType<typeof connectProject> }) {
  return (
    <EditorShell
      session={connection.session}
      persistPendingChanges={connection.persistPendingChanges}
    />
  );
}
