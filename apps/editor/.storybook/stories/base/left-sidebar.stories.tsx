import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { card } from '@facadeur/examples';
import { createStorybookEditor } from '../../fixtures/editor';
import { CatalogLayersPanel } from '../../../src/ui/sidebar/left/CatalogLayersPanel';
import { ProjectTree } from '../../../src/ui/sidebar/left/ProjectTree';
import type { EditorSurface } from '../../../src/ui/sidebar/design/design-domain';
import { ResizableLeftRail } from '../../../src/ui/shell/ResizableLeftRail';

function LeftSidebarPreview() {
  const editor = useMemo(() => createStorybookEditor(card.uuid, card.root.uuid), []);
  const subscribe = useMemo(() => editor.app.subscribe.bind(editor.app), [editor.app]);
  const getSnapshot = useMemo(() => editor.app.getSnapshot.bind(editor.app), [editor.app]);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [surface, setSurface] = useState<EditorSurface>('editor');

  useEffect(() => () => editor.session.destroy(), [editor.session]);

  return (
    <aside className="side side-left" style={{ height: 720 }}>
      <ResizableLeftRail
        layers={
          <CatalogLayersPanel
            model={snap.sidebar.layers}
            onIntent={(intent) => void editor.app.dispatchSidebarIntent(intent)}
          />
        }
        project={
          <ProjectTree
            model={snap.sidebar.project}
            surface={surface}
            onOpenDesignDomain={setSurface}
            onIntent={(intent) => void editor.app.dispatchSidebarIntent(intent)}
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
