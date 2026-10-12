'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createExampleCatalog, card } from '@facadeur/examples';
import { createEditorSession } from '../domain/session/create-editor-session';
import { EditorHost } from './EditorHost';
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
    return { session };
  }, []);

  useEffect(() => () => editor.session.destroy(), [editor]);

  return <EditorHost session={editor.session} navigation={navigation} />;
}
