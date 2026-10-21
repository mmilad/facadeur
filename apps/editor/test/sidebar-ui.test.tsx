/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  InspectorSidebarModel,
  LayerSidebarModel,
  ProjectSidebarModel,
} from '../src/domain/sidebar/types';
import { EditorEventType } from '../src/domain/sidebar/events';
import { ProjectTree } from '../src/ui/sidebar/left/ProjectTree';
import { CatalogLayersPanel } from '../src/ui/sidebar/left/CatalogLayersPanel';
import { CatalogNodeInspector } from '../src/ui/sidebar/right/components/CatalogNodeInspector';

describe('sidebar UI contracts', () => {
  it('renders project DTOs and emits an asset ID', () => {
    const onEvent = vi.fn();
    const model: ProjectSidebarModel = {
      assets: [{ id: 'asset-1', label: 'Card', kind: 'component' }],
      openId: 'asset-1',
      draggableAssetIds: [],
    };
    const view = render(<ProjectTree model={model} surface="editor" onEvent={onEvent} />);
    fireEvent.click(view.container.querySelector('[data-asset-id="asset-1"]')!);
    expect(onEvent).toHaveBeenCalledWith({
      type: EditorEventType.AssetOpen,
      data: { assetId: 'asset-1' },
    });
  });

  it('renders layer DTOs and emits a minimal selection intent', () => {
    const onEvent = vi.fn();
    const layer: LayerSidebarModel = {
      title: 'Card',
      rootId: 'root',
      selectedId: null,
      selectedRenderId: null,
      draggedNodeId: null,
      layers: {
        id: 'root',
        address: 'node:root',
        label: 'root',
        type: 'layer',
        tagName: 'article',
        children: [],
        virtual: false,
        documentId: 'asset-1',
        canDelete: false,
        insertInside: [],
        insertBelow: [],
      },
    };
    render(<CatalogLayersPanel model={layer} onEvent={onEvent} />);
    fireEvent.click(screen.getByRole('button', { name: 'root article' }));
    expect(onEvent).toHaveBeenCalledWith({
      type: EditorEventType.LayerSelect,
      data: { nodeId: 'root' },
    });
  });

  it('renders inspector form DTOs and emits a typed field value', () => {
    const onEvent = vi.fn();
    const inspector: InspectorSidebarModel = {
      nodeId: 'root',
      formKey: 'asset-1:root',
      definitionId: 'asset-1',
      selectionKind: 'root',
      layerStyle: { selector: '.root', declarations: {}, breakpoints: [], overrides: {} },
      layerStyles: [],
      headerFields: [{ type: 'text', name: 'definition.name', label: 'Name' }],
      tabs: [{ id: 'style', label: 'Style', sections: [] }],
      values: { 'definition.name': 'Card' },
      bindOptions: [],
      styleValueOptions: [],
    };
    render(<CatalogNodeInspector model={inspector} onEvent={onEvent} />);
    const name = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Updated card' } });
    fireEvent.blur(name);
    expect(onEvent).toHaveBeenCalledWith({
      type: EditorEventType.InspectorFieldChange,
      data: { nodeId: 'root', path: 'definition.name', value: 'Updated card' },
    });
  });
});
