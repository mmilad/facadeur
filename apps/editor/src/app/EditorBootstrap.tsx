'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { connectProject, loadProject } from '../domain/project/client.js';
import { EditorShell } from '../ui/shell/EditorShell.js';

export function EditorBootstrap() {
  const [connection, setConnection] = useState<ReturnType<typeof connectProject> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let active: ReturnType<typeof connectProject> | null = null;
    setError(null);
    setConnection(null);
    void loadProject(abort.signal)
      .then((project) => {
        if (abort.signal.aborted) return;
        active = connectProject(project);
        setConnection(active);
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setError(error instanceof Error ? error.message : 'Could not load the project');
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
          <p>Start the project server with the editor using pnpm dev.</p>
          <button type="button" onClick={() => setAttempt(attempt + 1)}>
            Retry
          </button>
        </>
      ) : null}
    </main>
  );
}

function ConnectedEditor({ connection }: { connection: ReturnType<typeof connectProject> }) {
  const status = useSyncExternalStore(
    connection.subscribe,
    connection.getStatus,
    connection.getStatus,
  );
  return <EditorShell session={connection.session} connectionStatus={status} />;
}
