'use client';

import { useSearchParams } from 'next/navigation';
import { authClient } from '../domain/auth/client';
import { AuthScreen } from '../ui/management/AuthScreen';
import { ProjectWorkspace } from '../ui/projects/ProjectWorkspace';

export function EditorBootstrap() {
  const auth = authClient.useSession();
  const params = useSearchParams();
  if (auth.isPending)
    return (
      <main className="schema-stage">
        <h1>Loading account…</h1>
      </main>
    );
  if (!auth.data)
    return (
      <AuthScreen
        onAuthenticated={() => void auth.refetch()}
        invitationToken={params.get('invite') ?? undefined}
      />
    );
  return <ProjectWorkspace key={auth.data.user.id} />;
}
