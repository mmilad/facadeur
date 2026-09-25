import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  DocumentError,
  toFlat,
  validateTree,
  type DocumentFile,
  type FlatDocument,
} from '@facadeur/core';

function file(kind: DocumentFile['kind']): DocumentFile {
  return {
    version: 1,
    id: 'doc',
    name: 'Doc',
    kind,
    root: { id: 'root', type: 'frame', tag: 'div' },
  };
}

function component(): FlatDocument {
  return toFlat({
    version: 1,
    id: 'card',
    name: 'Card',
    kind: 'component',
    fields: [{ name: 'title', type: 'text', default: 'Title' }],
    variants: [{ name: 'tone', values: ['quiet', 'loud'], default: 'quiet' }],
    root: {
      id: 'root',
      type: 'frame',
      tag: 'article',
      children: [
        {
          id: 'title',
          type: 'text',
          tag: 'h2',
          text: 'Title',
          bindings: [{ field: 'title', target: 'text' }],
        },
      ],
    },
  });
}

describe('applyCommand', () => {
  it('does not mutate the input document', () => {
    const doc = component();
    const before = structuredClone(doc);
    applyCommand(doc, {
      type: 'insert',
      parentId: 'root',
      node: { id: 'note', type: 'text', text: 'Note' },
    });
    expect(doc).toEqual(before);
  });

  it('inserts a subtree, removes it, and moves siblings', () => {
    let doc = component();
    doc = applyCommand(doc, {
      type: 'insert',
      parentId: 'root',
      index: 0,
      node: {
        id: 'group',
        type: 'frame',
        children: [{ id: 'label', type: 'text', text: 'Label' }],
      },
    });
    expect(doc.nodes.root).toMatchObject({ children: ['group', 'title'] });
    expect(doc.nodes.group).toMatchObject({ type: 'frame', children: ['label'] });

    doc = applyCommand(doc, { type: 'move', nodeId: 'group', parentId: 'root', index: 1 });
    expect(doc.nodes.root).toMatchObject({ children: ['title', 'group'] });

    doc = applyCommand(doc, { type: 'remove', nodeId: 'group' });
    expect(doc.nodes.root).toMatchObject({ children: ['title'] });
    expect(doc.nodes.group).toBeUndefined();
    expect(doc.nodes.label).toBeUndefined();
  });

  it('wraps a node in a frame as one command and refuses the root', () => {
    let doc = component();
    doc = applyCommand(doc, { type: 'wrap', nodeId: 'title', frameId: 'around' });
    expect(doc.nodes.root).toMatchObject({ children: ['around'] });
    expect(doc.nodes.around).toMatchObject({ type: 'frame', name: 'Frame', children: ['title'] });
    expect(doc.nodes.title).toMatchObject({ type: 'text' });
    expect(() => applyCommand(doc, { type: 'wrap', nodeId: 'root' })).toThrow(/root/i);
  });

  it('lists a new layout token in tokenInterface.reads', () => {
    let doc = component();
    doc = applyCommand(doc, {
      type: 'setTokenInterface',
      tokenInterface: { reads: ['color.ink'] },
    });
    doc = applyCommand(doc, {
      type: 'setProp',
      nodeId: 'root',
      prop: 'layout',
      value: { gap: '{space.4}', direction: 'row' },
    });
    expect(doc.nodes.root).toMatchObject({ layout: { gap: '{space.4}', direction: 'row' } });
    expect(doc.tokenInterface?.reads).toEqual(['color.ink', 'space.4']);
  });

  it('treats a same-parent move index as the position after removal', () => {
    let doc = component();
    doc = applyCommand(doc, {
      type: 'insert',
      parentId: 'root',
      node: { id: 'extra', type: 'text', text: 'Extra' },
    });
    expect(doc.nodes.root).toMatchObject({ children: ['title', 'extra'] });
    doc = applyCommand(doc, { type: 'move', nodeId: 'title', parentId: 'root', index: 1 });
    expect(doc.nodes.root).toMatchObject({ children: ['extra', 'title'] });
  });

  it('updates props, style, fields, variants, and definitions', () => {
    let doc = component();
    doc = applyCommand(doc, {
      type: 'insert',
      parentId: 'root',
      node: { id: 'btn', type: 'instance', component: 'button' },
    });
    doc = applyCommand(doc, { type: 'setProp', nodeId: 'title', prop: 'text', value: 'Hello' });
    doc = applyCommand(doc, { type: 'setStyle', nodeId: 'title', property: 'color', value: 'red' });
    doc = applyCommand(doc, { type: 'setField', nodeId: 'btn', field: 'label', value: 'Go' });
    doc = applyCommand(doc, { type: 'setVariant', nodeId: 'btn', axis: 'tone', value: 'primary' });
    doc = applyCommand(doc, {
      type: 'defineField',
      field: { name: 'open', type: 'boolean', default: true },
    });
    doc = applyCommand(doc, {
      type: 'defineVariant',
      axis: { name: 'size', values: ['sm', 'md'], default: 'md' },
    });

    expect(doc.nodes.title).toMatchObject({ text: 'Hello', style: { color: 'red' } });
    expect(doc.nodes.btn).toMatchObject({
      fields: { label: 'Go' },
      variants: { tone: 'primary' },
    });
    expect(doc.fields.map((field) => field.name)).toEqual(['title', 'open']);
    expect(doc.variants.map((axis) => axis.name)).toEqual(['tone', 'size']);

    doc = applyCommand(doc, { type: 'setStyle', nodeId: 'title', property: 'color', value: null });
    doc = applyCommand(doc, { type: 'setField', nodeId: 'btn', field: 'label', value: null });
    doc = applyCommand(doc, { type: 'removeField', name: 'open' });
    doc = applyCommand(doc, { type: 'removeVariant', name: 'size' });
    expect(doc.nodes.title).not.toHaveProperty('style');
    expect(doc.nodes.btn).not.toHaveProperty('fields');
    expect(doc.fields.map((field) => field.name)).toEqual(['title']);
    expect(doc.variants.map((axis) => axis.name)).toEqual(['tone']);
  });

  it('assigns an id when insert omits one', () => {
    const doc = applyCommand(component(), {
      type: 'insert',
      parentId: 'root',
      node: { type: 'text', text: 'Generated' },
    });
    const root = doc.nodes.root;
    if (root?.type !== 'frame') throw new Error('expected frame');
    const generated = root.children.find((id) => id !== 'title');
    expect(generated).toMatch(/^n_/);
  });

  it('rejects edits that break nesting', () => {
    const atom = toFlat(file('atom'));
    expect(() =>
      applyCommand(atom, {
        type: 'insert',
        parentId: 'root',
        node: { id: 'btn', type: 'instance', component: 'button' },
      }),
    ).toThrow(DocumentError);

    const page = toFlat(file('page'));
    expect(() =>
      applyCommand(page, {
        type: 'insert',
        parentId: 'root',
        node: { id: 'heading', type: 'text', text: 'No' },
      }),
    ).toThrow(/cannot contain a text node/);

    expect(() =>
      applyCommand(
        page,
        {
          type: 'insert',
          parentId: 'root',
          node: { id: 'hero', type: 'instance', component: 'button' },
        },
        { resolveKind: () => 'atom' },
      ),
    ).toThrow(/cannot contain an instance of atom/);

    const withSection = applyCommand(
      page,
      {
        type: 'insert',
        parentId: 'root',
        node: { id: 'hero', type: 'instance', component: 'specimen-section' },
      },
      { resolveKind: (id) => (id === 'specimen-section' ? 'section' : undefined) },
    );
    expect(withSection.nodes.hero).toMatchObject({
      type: 'instance',
      component: 'specimen-section',
    });
  });

  it('rejects moving a node into its own subtree and editing an instance like an element', () => {
    let doc = component();
    doc = applyCommand(doc, {
      type: 'insert',
      parentId: 'root',
      node: { id: 'group', type: 'frame' },
    });
    expect(() =>
      applyCommand(doc, { type: 'move', nodeId: 'root', parentId: 'group', index: 0 }),
    ).toThrow(/root cannot be moved/);
    expect(() => applyCommand(doc, { type: 'remove', nodeId: 'root' })).toThrow(
      /cannot be removed/,
    );
    expect(() =>
      applyCommand(doc, {
        type: 'insert',
        parentId: 'root',
        node: {
          id: 'btn',
          type: 'instance',
          component: 'button',
          children: [{ type: 'text', text: 'x' }],
        },
      }),
    ).toThrow(/cannot have children/);

    doc = applyCommand(doc, {
      type: 'insert',
      parentId: 'root',
      node: { id: 'btn', type: 'instance', component: 'button' },
    });
    expect(() =>
      applyCommand(doc, { type: 'setStyle', nodeId: 'btn', property: 'color', value: 'red' }),
    ).toThrow(/style overrides/);
    expect(() =>
      applyCommand(doc, { type: 'setProp', nodeId: 'btn', prop: 'text', value: 'No' }),
    ).toThrow(/no "text"/);
  });

  it('accepts a custom kind when its nesting rule says so', () => {
    const doc = toFlat({
      version: 1,
      id: 'block',
      name: 'Block',
      kind: 'atom',
      root: { id: 'root', type: 'frame', children: [{ id: 'label', type: 'text', text: 'Hi' }] },
    });
    doc.kind = 'block';
    expect(() => validateTree(doc)).toThrow(/No nesting rule/);
    expect(() =>
      validateTree(doc, {
        rules: {
          block: {
            rootNodeTypes: ['frame'],
            nodeTypes: ['text'],
            instanceKinds: [],
          },
        },
      }),
    ).not.toThrow();
  });
});
