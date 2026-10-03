import { describe, expect, it } from 'vitest';
import { toFlat } from '@facadeur/core';
import { layerInsertEntries, layerInsertEntriesForLayer } from '../src/domain/layer-insert-policy';
import type { EditorSnapshot } from '../src/domain/session';

function snap(partial: {
  document: EditorSnapshot['document'];
  catalog: EditorSnapshot['catalog'];
  openId?: string;
}): EditorSnapshot {
  return {
    openId: partial.openId ?? partial.document.id,
    document: partial.document,
    catalog: partial.catalog,
  } as EditorSnapshot;
}

describe('layer insert policy', () => {
  it('offers no insert entries when editing an atom', () => {
    const document = toFlat({
      version: 1,
      id: 'button',
      name: 'Button',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'button' },
    });
    const entries = layerInsertEntries(
      snap({
        document,
        catalog: [{ id: 'button', name: 'Button', kind: 'atom' }],
      }),
    );
    expect(entries).toEqual([]);
  });

  it('offers atom instances when editing a component', () => {
    const document = toFlat({
      version: 1,
      id: 'card',
      name: 'Card',
      kind: 'component',
      root: { id: 'root', type: 'frame', children: [] },
    });
    const entries = layerInsertEntries(
      snap({
        document,
        catalog: [
          { id: 'card', name: 'Card', kind: 'component' },
          { id: 'button', name: 'Button', kind: 'atom' },
          { id: 'link', name: 'Link', kind: 'atom' },
        ],
        openId: 'card',
      }),
    );
    expect(entries).toEqual([
      { kind: 'instance', assetId: 'button', label: 'Button' },
      { kind: 'instance', assetId: 'link', label: 'Link' },
    ]);
  });

  it('filters insert targets by nesting rules', () => {
    const document = toFlat({
      version: 1,
      id: 'card',
      name: 'Card',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'label', type: 'text', text: 'Hi' }],
      },
    });
    const entries = layerInsertEntriesForLayer(
      snap({
        document,
        catalog: [{ id: 'button', name: 'Button', kind: 'atom' }],
        openId: 'card',
      }),
      {
        id: 'label',
        address: 'root/label',
        documentId: 'card',
        name: 'label',
        type: 'text',
        children: [],
        virtual: false,
        fieldEditable: false,
      },
      'below',
    );
    expect(entries.some((entry) => entry.kind === 'instance')).toBe(true);
  });
});
