'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createExampleCatalog, card } from '@facadeur/examples';
import { createAppService } from '../app-service';
import { createInMemoryCatalogPort } from '../domain/project/in-memory-catalog-port';
import { createEditorSession } from '../domain/session/create-editor-session';
import { EditorShell } from '../ui/shell/EditorShell';
import type { EditorNavigationAdapter } from '../ui/shell/navigation/navigation-adapter';

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
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    session.openAsset(card.uuid);
    session.selectNode(card.root.uuid);
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });
    return { app, session };
  }, []);

  useEffect(() => () => editor.session.destroy(), [editor]);

  return <EditorShell session={editor.session} app={editor.app} navigation={navigation} />;
}
