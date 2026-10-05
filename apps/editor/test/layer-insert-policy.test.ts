import { describe, expect, it } from 'vitest';
import { toFlat } from '@facadeur/core';
import { layerInsertEntries, layerInsertEntriesForLayer } from '../src/domain/layer-insert-policy';
import type { EditorSnapshot } from '../src/domain/session';
import { dataFieldsForNode } from '../src/ui/controls/data';

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
  it('includes the target parent repeat scope for nested inserts', () => {
    const document = toFlat({
      version: 1,
      id: 'list',
      name: 'List',
      kind: 'component',
      fields: [
        {
          name: 'items',
          type: 'array',
          items: {
            type: 'object',
            fields: [{ name: 'children', type: 'array', items: { type: 'text' } }],
          },
        },
      ],
      root: { id: 'root', type: 'frame', repeat: { path: 'items', as: 'item' } },
    });
    const fields = dataFieldsForNode(document, 'root', document.fields, true);
    expect(fields.find((field) => field.name === 'item')?.items?.fields?.[0]?.name).toBe(
      'children',
    );
    expect(dataFieldsForNode(document, 'root').some((field) => field.name === 'item')).toBe(false);
  });

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
      { kind: 'primitive', tool: 'frame', label: 'Frame' },
      { kind: 'structural', tool: 'repeater', label: 'Repeater' },
      { kind: 'structural', tool: 'switch', label: 'Switch' },
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
