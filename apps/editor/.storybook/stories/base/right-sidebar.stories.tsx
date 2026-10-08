import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResizableInspector } from '../../../src/ui/shell/ResizableInspector';
import { RightRail } from '../../../src/ui/sidebar/properties/RightRail';
import { createStorybookEditor } from '../../fixtures/editor';
import {
  EXAMPLE_CATALOG_IDS,
  exampleCatalog,
  exampleCatalogDefinitions,
  exampleCatalogLayers,
} from '@facadeur/examples';

const definitions = exampleCatalogDefinitions();
const defaultDefinition = exampleCatalog.components[EXAMPLE_CATALOG_IDS.card]!;

function RightSidebarPreview() {
  const [assetId, setAssetId] = useState(defaultDefinition.uuid);
  const definition = definitions.find((item) => item.uuid === assetId) ?? defaultDefinition;
  const layers = exampleCatalogLayers(definition);
  const [layerUuid, setLayerUuid] = useState(definition.root.uuid);
  const selectedLayer = layers.some((layer) => layer.uuid === layerUuid)
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <label className="eu-field">
          <span className="eu-field__label">Asset</span>
          <select
            className="eu-control"
            value={definition.uuid}
            onChange={(event) => {
              const next = definitions.find((item) => item.uuid === event.currentTarget.value);
              if (!next) return;
              setAssetId(next.uuid);
              setLayerUuid(next.root.uuid);
            }}
          >
            {definitions.map((item) => (
              <option key={item.uuid} value={item.uuid}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="eu-field">
          <span className="eu-field__label">Layer</span>
          <select
            className="eu-control"
            value={selectedLayer}
            onChange={(event) => setLayerUuid(event.currentTarget.value)}
          >
            {layers.map((layer) => (
              <option key={layer.uuid} value={layer.uuid}>
                {layer.label}
              </option>
            ))}
          </select>
        </label>
      </div>
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
} satisfies Meta<typeof RightSidebarPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inspector: Story = {};
