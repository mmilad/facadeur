import { describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import {
  catalogLayerInsertEntries,
  catalogLayerInsertEntriesForLayer,
} from '../src/domain/catalog/catalog-layer-insert';
import { createEditorSession } from '../src/domain/session';
import type { LayerItem } from '../src/domain/catalog/layer-tree';

describe('Catalog layer insert choices', () => {
  it('derives available assets from the Catalog kind without a document adapter', () => {
    const assets = [
      { id: 'card', name: 'Card', kind: 'component' as const },
      { id: 'button', name: 'Button', kind: 'atom' as const },
      { id: 'link', name: 'Link', kind: 'atom' as const },
      { id: 'page', name: 'Page', kind: 'page' as const },
    ];

    expect(catalogLayerInsertEntries('atom', assets, 'button')).toEqual([]);
    expect(catalogLayerInsertEntries('component', assets, 'card')).toEqual([
      { kind: 'primitive', tool: 'frame', label: 'Frame' },
      { kind: 'structural', tool: 'repeater', label: 'Repeater' },
      { kind: 'structural', tool: 'switch', label: 'Switch' },
      { kind: 'structural', tool: 'slot', label: 'Children' },
      { kind: 'instance', assetId: 'button', label: 'Button' },
      { kind: 'instance', assetId: 'link', label: 'Link' },
    ]);
  });

  it('filters active context-menu choices using Catalog node nesting rules', () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    session.openAsset(exampleIds.components.card.definition);
    const snap = session.getSnapshot();
    const root = snap.openDefinition!.root;
    const rootItem = {
      id: root.uuid,
      address: root.uuid,
      documentId: snap.openId,
      name: root.name,
      type: 'frame',
      children: [],
      virtual: false,
      fieldEditable: false,
    } satisfies LayerItem;

    expect(
      catalogLayerInsertEntriesForLayer(snap, snap.catalog, rootItem, 'inside'),
    ).toContainEqual({
      kind: 'instance',
      assetId: exampleIds.components.button.definition,
      label: 'Button',
    });
    const insertions = catalogLayerInsertEntriesForLayer(snap, snap.catalog, rootItem, 'inside');
    expect(insertions).toContainEqual({ kind: 'structural', tool: 'slot', label: 'Children' });
    session.destroy();
  });
});
