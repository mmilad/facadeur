/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { InspectorSidebarModel, LayerSidebarModel, ProjectSidebarModel } from '../src/domain/sidebar/types';
import { ProjectTree } from '../src/ui/sidebar/left/ProjectTree';
import { CatalogLayersPanel } from '../src/ui/sidebar/left/CatalogLayersPanel';
import { CatalogNodeInspector } from '../src/ui/sidebar/right/components/CatalogNodeInspector';

describe('sidebar UI contracts', () => {
  it('renders project DTOs and emits an asset ID', () => {
    const onOpenAsset = vi.fn();
    const model: ProjectSidebarModel = {
      assets: [{ id: 'asset-1', label: 'Card', kind: 'component' }],
      openId: 'asset-1',
      draggableAssetIds: [],
    };
    const view = render(
      <ProjectTree
        model={model}
        surface="editor"
        onOpenDesignDomain={vi.fn()}
        onIntent={onOpenAsset}
      />,
    );
    fireEvent.click(view.container.querySelector('[data-asset-id="asset-1"]')!);
    expect(onOpenAsset).toHaveBeenCalledWith({ type: 'asset.open', id: 'asset-1' });
  });

  it('renders layer DTOs and emits a minimal selection intent', () => {
    const onIntent = vi.fn();
    const layer: LayerSidebarModel = {
      title: 'Card',
      rootId: 'root',
      selectedId: null,
      selectedRenderId: null,
      draggedNodeId: null,
      layers: {
        id: 'root', address: 'node:root', label: 'root', type: 'layer', tagName: 'article',
        children: [], virtual: false, documentId: 'asset-1', canDelete: false,
        insertInside: [], insertBelow: [],
      },
    };
    render(<CatalogLayersPanel model={layer} onIntent={onIntent} />);
    fireEvent.click(screen.getByRole('button', { name: 'root article' }));
    expect(onIntent).toHaveBeenCalledWith({ type: 'layer.select', id: 'root' });
  });

  it('renders inspector form DTOs and emits a typed field value', () => {
    const onChange = vi.fn();
    const inspector: InspectorSidebarModel = {
      nodeId: 'root', formKey: 'asset-1:root', selectionKind: 'root',
      headerFields: [{ type: 'text', name: 'definition.name', label: 'Name' }],
      tabs: [{ id: 'style', label: 'Style', sections: [] }],
      values: { 'definition.name': 'Card' }, bindOptions: [],
    };
    render(<CatalogNodeInspector model={inspector} onChange={onChange} />);
    const name = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Updated card' } });
    fireEvent.blur(name);
    expect(onChange).toHaveBeenCalledWith('root', 'definition.name', 'Updated card');
  });
});
