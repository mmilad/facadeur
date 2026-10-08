import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResizableInspector } from '../../../src/ui/shell/ResizableInspector';
import { RightRail } from '../../../src/ui/sidebar/properties/RightRail';
import { createStorybookEditor } from '../../fixtures/editor';
import {
  catalogPresetLabels,
  catalogPresetOptions,
  defaultCatalogPreset,
  resolveCatalogPreset,
} from '../../controls';

function RightSidebarPreview({ preset }: { preset: string }) {
  const { definition, layerUuid: selectedLayer } = resolveCatalogPreset(preset);
  const editor = useMemo(
    () => createStorybookEditor(definition.uuid, selectedLayer),
    [definition.uuid, selectedLayer],
  );
  const subscribe = useMemo(() => editor.app.subscribe.bind(editor.app), [editor.app]);
  const getSnapshot = useMemo(() => editor.app.getSnapshot.bind(editor.app), [editor.app]);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => () => editor.session.destroy(), [editor.session]);

  return (
    <div style={{ minHeight: 620, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 560 }}>
        <ResizableInspector>
          <RightRail app={editor.app} session={editor.session} snap={snap} surface="editor" />
        </ResizableInspector>
      </div>
    </div>
  );
}

const meta = {
  title: 'Base/Right Sidebar',
  component: RightSidebarPreview,
  args: { preset: defaultCatalogPreset.id },
  argTypes: {
    preset: {
      control: { type: 'select' },
      options: catalogPresetOptions,
      labels: catalogPresetLabels,
      description: 'Select an example asset and one of its layers.',
    },
  },
} satisfies Meta<typeof RightSidebarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inspector: Story = {};
