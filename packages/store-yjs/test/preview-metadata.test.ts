import { describe, expect, it } from 'vitest';
import { toNested, type DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';

describe('preview and variant metadata persistence', () => {
  it('saves samples separately and supports undo/redo for both metadata maps', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text' }],
      root: { id: 'root', type: 'text' },
    };
    const store = createDocumentStore(file);
    store.execute({ type: 'setPreviewData', previewData: { fields: { value: 'Example' } } });
    store.execute({ type: 'setVariantLabels', labels: { default: 'Text' } });
    expect(toNested(store.getDocument()).variantLabels).toEqual({ default: 'Text' });
    store.undo();
    expect(store.getDocument().variantLabels).toBeUndefined();
    expect(store.getDocument().previewData?.fields?.value).toBe('Example');
    store.undo();
    expect(store.getDocument().previewData).toBeUndefined();
    store.redo();
    expect(store.getDocument().previewData?.fields?.value).toBe('Example');
    expect(store.getDocument().fields[0]?.default).toBeUndefined();
  });

  it('round-trips instance bindings, conditions and event payload sources', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'parent',
      name: 'Parent',
      kind: 'component',
      fields: [
        { name: 'value', type: 'text' },
        { name: 'invalid', type: 'boolean' },
      ],
      events: [{ name: 'commit', payload: { value: 'text' } }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'input',
            fieldBindings: { value: 'value' },
            variantRules: [{ when: { path: 'invalid', truthy: true }, variant: 'error' }],
          },
          {
            id: 'native',
            type: 'text',
            eventBindings: [{ event: 'commit', name: 'input', payload: { value: 'value' } }],
          },
        ],
      },
    };
    const store = createDocumentStore(file);
    const result = toNested(store.getDocument());
    expect(result.root).toEqual(file.root);
    store.execute({ type: 'setProp', nodeId: 'control', prop: 'variantRules', value: null });
    const node = store.getDocument().nodes.control;
    expect(node?.type === 'instance' ? node.variantRules : undefined).toBeUndefined();
    store.undo();
    expect(toNested(store.getDocument()).root).toEqual(file.root);
  });

  it('round-trips event contracts and typed data mappings through history', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'event-data',
      name: 'Event data',
      kind: 'atom',
      events: [
        {
          name: 'commit',
          data: {
            fields: [
              { name: 'value', type: { kind: 'type', type: 'string' } },
              { name: 'count', type: { kind: 'type', type: 'number' } },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'text',
        eventBindings: [
          {
            event: 'commit',
            name: 'change',
            data: [
              { path: 'value', source: { kind: 'native', path: 'currentTarget.value' } },
              { path: 'count', source: { kind: 'literal', value: 3 } },
            ],
          },
        ],
      },
    };
    const store = createDocumentStore(file);
    expect(toNested(store.getDocument()).root).toEqual(file.root);
    expect(toNested(store.getDocument()).events).toEqual(file.events);
    store.execute({
      type: 'setProp',
      nodeId: 'root',
      prop: 'eventBindings',
      value: [
        {
          event: 'commit',
          name: 'change',
          data: [
            { path: 'value', source: { kind: 'native', path: 'currentTarget.value' } },
            { path: 'count', source: { kind: 'literal', value: 4 } },
          ],
        },
      ],
    });
    store.undo();
    expect(toNested(store.getDocument()).root).toEqual(file.root);
    store.redo();
    expect(
      (toNested(store.getDocument()).root as { eventBindings?: unknown }).eventBindings,
    ).toEqual([
      {
        event: 'commit',
        name: 'change',
        data: [
          { path: 'value', source: { kind: 'native', path: 'currentTarget.value' } },
          { path: 'count', source: { kind: 'literal', value: 4 } },
        ],
      },
    ]);
  });
});
