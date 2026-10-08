'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '../../domain/auth/client';
import { connectProject, loadProject } from '../../domain/project/client';
import { logProjectFailure } from '../../domain/project/diagnostics';
import { ManagementHome } from '../management/ManagementHome';
import { ProjectWorkspaceBar } from '../management/ProjectWorkspaceBar';
import { EditorShell } from '../shell/EditorShell';
import { ProjectViewer } from './ProjectViewer';

type Connection = ReturnType<typeof connectProject>;
interface PendingLeave {
  proceed: () => void;
  cancel?: () => void;
}

export function ProjectWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const projectId = params.get('project');
  const [connection, setConnection] = useState<Connection | null>(null);
  const current = useRef<Connection | null>(null);
  const activeUrl = useRef('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null);
  const [saving, setSaving] = useState(false);

  const replaceConnection = useCallback((next: Connection | null) => {
    current.current?.destroy();
    current.current = next;
    setConnection(next);
  }, []);

  useEffect(() => () => current.current?.destroy(), []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!current.current?.hasPendingChanges()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  useEffect(() => {
    if (current.current?.project.id === projectId) return;
    const abort = new AbortController();
    const apply = () => {
      setPendingLeave(null);
      setError(null);
      if (!projectId) {
        replaceConnection(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      void loadProject(abort.signal, projectId)
        .then((project) => {
          if (abort.signal.aborted) return;
          replaceConnection(connectProject(project));
          activeUrl.current = window.location.pathname + window.location.search;
        })
        .catch((failure: unknown) => {
          if (abort.signal.aborted) return;
          logProjectFailure(failure, { phase: 'load', projectId: projectId ?? undefined });
          setError(failure instanceof Error ? failure.message : 'Could not open project');
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    };
    if (current.current?.hasPendingChanges()) {
      setPendingLeave({ proceed: apply, cancel: () => router.replace(activeUrl.current) });
    } else apply();
    return () => abort.abort();
  }, [projectId, attempt, replaceConnection, router]);

  useEffect(() => {
    if (connection?.project.id === projectId)
      activeUrl.current = pathname + '?' + params.toString();
  }, [connection, projectId, pathname, params]);

  function navigate(proceed: () => void) {
    if (current.current?.hasPendingChanges()) setPendingLeave({ proceed });
    else proceed();
  }

  function openProject(id: string) {
    const query = new URLSearchParams();
    query.set('project', id);
    navigate(() => router.push(pathname + '?' + query));
  }

  function manageProjects() {
    navigate(() => router.push(pathname));
  }

  function signOut() {
    navigate(() => {
      void authClient.signOut().then((result) => {
        if (result.error)
          setError(result.error instanceof Error ? result.error.message : 'Could not sign out');
        else {
          replaceConnection(null);
          router.replace(pathname);
        }
      });
    });
  }

  async function leave(save: boolean) {
    if (!pendingLeave) return;
    setSaving(true);
    try {
      if (save) {
        await current.current?.saveAllChanges();
        if (current.current?.hasPendingChanges())
          throw new Error('More changes were made while saving. Save again before leaving.');
      } else {
        // Discard only the active in-memory session; source files and recovered drafts stay intact.
        replaceConnection(null);
      }
      const proceed = pendingLeave.proceed;
      setPendingLeave(null);
      proceed();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save project');
    } finally {
      setSaving(false);
    }
  }

  const access = connection?.project.access;
  return (
    <>
      {connection && !loading ? (
        <>
          <ProjectWorkspaceBar
            projectName={connection.project.name ?? connection.project.id}
            organisationName={connection.project.organisationName ?? 'Organisation'}
            role={access?.role ?? 'editor'}
            onManageProjects={manageProjects}
            onSignOut={signOut}
          />
          {access?.canWrite === false ? (
            <ProjectViewer session={connection.session} />
          ) : (
            <EditorShell
              session={connection.session}
              app={connection.app}
              persistPendingChanges={connection.persistPendingChanges}
            />
          )}
        </>
      ) : loading ? (
        <main className="schema-stage">
          <h1>Loading project…</h1>
        </main>
      ) : (
        <ManagementHome
          onOpenProject={openProject}
          onSignOut={signOut}
          invitationToken={params.get('invite') ?? undefined}
        />
      )}
      {error ? (
        <div role="alert" className="notice notice-error">
          {error}{' '}
          <button type="button" onClick={() => setAttempt(attempt + 1)}>
            Retry
          </button>
        </div>
      ) : null}
      {pendingLeave ? (
        <div className="management-dialog-backdrop">
          <section
            className="management-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-project-title"
          >
            <h2 id="leave-project-title">Unsaved project changes</h2>
            <p>
              Save your changes before leaving this project, or discard the changes in this session.
            </p>
            {error ? <p role="alert">{error}</p> : null}
            <button type="button" disabled={saving} onClick={() => void leave(true)}>
              {saving ? 'Saving…' : 'Save and leave'}
            </button>{' '}
            <button type="button" disabled={saving} onClick={() => void leave(false)}>
              Discard and leave
            </button>{' '}
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                pendingLeave.cancel?.();
                setPendingLeave(null);
                setError(null);
              }}
            >
              Keep editing
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
