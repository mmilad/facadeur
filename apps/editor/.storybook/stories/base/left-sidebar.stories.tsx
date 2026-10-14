import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { card } from '@facadeur/examples';
import { createStorybookEditor } from '../../fixtures/editor';
import { createEditorEventHandler } from '../../../src/ui/shell/editor-event-handler';
import { CatalogLayersPanel } from '../../../src/ui/sidebar/left/CatalogLayersPanel';
import { ProjectTree } from '../../../src/ui/sidebar/left/ProjectTree';
import type { EditorSurface } from '../../../src/ui/design/design-domain';
import { ResizableLeftRail } from '../../../src/ui/shell/ResizableLeftRail';

function LeftSidebarPreview() {
  const editor = useMemo(() => createStorybookEditor(card.uuid, card.root.uuid), []);
  const subscribe = useMemo(() => editor.app.subscribe.bind(editor.app), [editor.app]);
  const getSnapshot = useMemo(() => editor.app.getSnapshot.bind(editor.app), [editor.app]);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [surface, setSurface] = useState<EditorSurface>('editor');

  useEffect(() => () => editor.session.destroy(), [editor.session]);

  const handleSidebarEvent = createEditorEventHandler({
    app: editor.app,
    session: editor.session,
    getSurface: () => surface,
    navigate: setSurface,
  });

  return (
    <aside className="side side-left" style={{ height: 720 }}>
      <ResizableLeftRail
        layers={<CatalogLayersPanel model={snap.sidebar.layers} onEvent={handleSidebarEvent} />}
        project={
          <ProjectTree
            model={snap.sidebar.project}
            surface={surface}
            onEvent={handleSidebarEvent}
          />
        }
      />
    </aside>
  );
}

const meta = {
  title: 'Base/Left Sidebar',
  component: LeftSidebarPreview,
} satisfies Meta<typeof LeftSidebarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
