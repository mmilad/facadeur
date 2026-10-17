'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { validateProjectCatalog } from '@facadeur/core';
import { facadeurTreeNode, facadeurWorkspace, icon } from '@facadeur/examples';
import { createEditorSession } from '../domain/session/create-editor-session';
import type { EditorSession } from '../domain/session';
import { EditorHost } from './EditorHost';
import type { EditorNavigationAdapter } from '../ui/shell/navigation/navigation-adapter';
import facadeurEditorCatalog from './facadeur-editor.catalog.json';

export function EditorBootstrap() {
  const session = useMemo(createInitialSession, []);

  useEffect(() => () => session.destroy(), [session]);

  return (
    <Suspense fallback={<p className="boot-error">Loading editor…</p>}>
      <EditorNavigationHost session={session} />
    </Suspense>
  );
}

function EditorNavigationHost({ session }: { session: EditorSession }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const navigation = useMemo<EditorNavigationAdapter>(
    () => ({
      pathname,
      search: params.toString(),
      push: (href) => window.history.pushState(null, '', href),
      replace: (href) => window.history.replaceState(null, '', href),
    }),
    [pathname, params],
  );

  return (
    <EditorHost
      session={session}
      navigation={navigation}
      persistPendingChanges={async () => {
        const clipboard = navigator.clipboard;
        if (!clipboard?.writeText) throw new Error('Clipboard access is unavailable');
        await clipboard.writeText(JSON.stringify(session.core.getSnapshot().catalog, null, 2));
      }}
    />
  );
}

function createInitialSession() {
  const seedCatalog = structuredClone(facadeurEditorCatalog);
  const catalog = {
    ...seedCatalog,
    atoms: { ...seedCatalog.atoms, [icon.uuid]: icon },
    components: { ...seedCatalog.components, [facadeurTreeNode.uuid]: facadeurTreeNode },
  };
  const projectCatalog = validateProjectCatalog(catalog);
  const session = createEditorSession({ projectCatalog });
  session.openAsset(facadeurWorkspace.uuid);
  session.selectNode(facadeurWorkspace.root.uuid);
  return session;
}
