import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { card, exampleCatalogDefinitions, exampleCatalogLayers } from '@facadeur/examples';
import { ResizableInspector } from '../../../src/ui/shell/ResizableInspector';
import { RightRail } from '../../../src/ui/sidebar/properties/RightRail';
import { createStorybookEditor } from '../../fixtures/editor';
import {
  STORYBOOK_SCHEMA_FORM_PARAMETER,
  type StorybookSchemaFormConfig,
} from '../../lib/schema-form';

const definitions = exampleCatalogDefinitions();
const nameCounts = new Map<string, number>();
for (const definition of definitions) {
  nameCounts.set(definition.name, (nameCounts.get(definition.name) ?? 0) + 1);
}
const assetOptions = definitions.map((definition) => ({
  value: definition.uuid,
  label: `${definition.kind} · ${definition.name}${nameCounts.get(definition.name)! > 1 ? ` · ${definition.uuid.slice(-4)}` : ''}`,
}));
const layersByAsset = Object.fromEntries(
  definitions.map((definition) => [
    definition.uuid,
    exampleCatalogLayers(definition).map(({ uuid, label }) => ({ value: uuid, label })),
  ]),
);
const schemaForm = {
  fields: [
    { type: 'select', name: 'assetId', label: 'Asset', options: assetOptions },
    {
      type: 'select',
      name: 'layerUuid',
      label: 'Layer',
      optionsFrom: { arg: 'assetId', values: layersByAsset },
    },
  ],
} satisfies StorybookSchemaFormConfig;

function RightSidebarPreview({ assetId, layerUuid }: { assetId: string; layerUuid: string }) {
  const definition = definitions.find((item) => item.uuid === assetId) ?? card;
  const selectedLayer = exampleCatalogLayers(definition).some(({ uuid }) => uuid === layerUuid)
    ? layerUuid
    : definition.root.uuid;
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
  args: { assetId: card.uuid, layerUuid: card.root.uuid },
  argTypes: {
    assetId: { control: false },
    layerUuid: { control: false },
  },
  parameters: {
    [STORYBOOK_SCHEMA_FORM_PARAMETER]: schemaForm,
  },
} satisfies Meta<typeof RightSidebarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inspector: Story = {};
