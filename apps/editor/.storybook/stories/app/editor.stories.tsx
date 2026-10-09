import { useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { card, exampleCatalog } from '@facadeur/examples';
import type { InspectorFieldChangedEvent } from '../../../src/app-service';
import { EditorShell } from '../../../src/ui/shell/EditorShell';
import { createStorybookEditor } from '../../fixtures/editor';
import { useStorybookNavigation, type StorybookNavigationEvent } from '../../lib/app/navigation';

function EditorAppPreview({
  onNavigation,
  onInspectorChange,
}: {
  onNavigation: (event: StorybookNavigationEvent) => void;
  onInspectorChange: (event: InspectorFieldChangedEvent) => void;
}) {
  const editor = useMemo(() => createStorybookEditor(card.uuid, card.root.uuid), []);
  const navigation = useStorybookNavigation(onNavigation);
  console.log('EditorAppPreview', exampleCatalog);
  useEffect(() => {
    Object.assign(window, { __facadeurExampleCatalog: exampleCatalog });
    return () => {
      Reflect.deleteProperty(window, '__facadeurExampleCatalog');
    };
  }, []);

  useEffect(() => editor.app.inspector.subscribe(onInspectorChange), [editor, onInspectorChange]);

  useEffect(() => () => editor.session.destroy(), [editor.session]);

  return (
    <div style={{ height: '100vh', minHeight: 640 }}>
      <EditorShell session={editor.session} app={editor.app} navigation={navigation} />
    </div>
  );
}

const meta = {
  title: 'App/Editor',
  component: EditorAppPreview,
  args: {
    onNavigation: fn<(event: StorybookNavigationEvent) => void>(),
    onInspectorChange: fn<(event: InspectorFieldChangedEvent) => void>(),
  },
  argTypes: {
    onNavigation: { control: false },
    onInspectorChange: { control: false },
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof EditorAppPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Catalog: Story = {};
