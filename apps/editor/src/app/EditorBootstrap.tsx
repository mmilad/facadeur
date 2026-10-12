'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { validateProjectCatalog } from '@facadeur/core';
import { facadeurWorkspace } from '@facadeur/examples';
import { download } from '../domain/assets/files';
import { createEditorSession } from '../domain/session/create-editor-session';
import { EditorHost } from './EditorHost';
import type { EditorNavigationAdapter } from '../ui/shell/navigation/navigation-adapter';
import facadeurEditorCatalog from './facadeur-editor.catalog.json';

export function EditorBootstrap() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const navigation = useMemo<EditorNavigationAdapter>(
    () => ({
      pathname,
      search: params.toString(),
      push: (href) => router.push(href, { scroll: false }),
      replace: (href) => router.replace(href, { scroll: false }),
    }),
    [pathname, params, router],
  );
  const editor = useMemo(() => {
    const projectCatalog = validateProjectCatalog(structuredClone(facadeurEditorCatalog));
    const session = createEditorSession({ projectCatalog });
    session.openAsset(facadeurWorkspace.uuid);
    session.selectNode(facadeurWorkspace.root.uuid);
    return { session };
  }, []);

  useEffect(() => () => editor.session.destroy(), [editor]);

  return (
    <EditorHost
      session={editor.session}
      navigation={navigation}
      persistPendingChanges={async () =>
        download(
          'facadeur-editor.catalog.json',
          JSON.stringify(editor.session.core.getSnapshot().catalog, null, 2),
        )
      }
    />
  );
}
