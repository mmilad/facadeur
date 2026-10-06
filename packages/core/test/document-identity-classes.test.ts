import { describe, expect, it } from 'vitest';
import { applyCommand, toFlat, toNested, validateCatalog, type DocumentFile } from '@facadeur/core';

const child: DocumentFile = {
  version: 1,
  id: 'button',
  name: 'Button',
  kind: 'atom',
  root: { id: 'root', type: 'frame', tag: 'button' },
};
const host: DocumentFile = {
  version: 1,
  id: 'host',
  name: 'Host',
  kind: 'component',
  root: {
    id: 'root',
    type: 'frame',
    children: [{ id: 'action', type: 'instance', component: 'button' }],
  },
};

describe('document identity and class lists', () => {
  it('renames the public identifier while keeping references and round-trip metadata stable', () => {
    const renamed = applyCommand(toFlat(child), {
      type: 'setDocumentMetadata',
      name: 'Action',
      slug: 'primary-action',
    });
    expect(renamed.id).toBe('button');
    expect(toNested(renamed)).toMatchObject({
      id: 'button',
      name: 'Action',
      slug: 'primary-action',
    });
    expect(validateCatalog([host, toNested(renamed)])[0]?.root).toEqual(host.root);
    expect(child.name).toBe('Button');
  });
  it('rejects duplicate identifiers and malformed names', () => {
    const context = { schemaResolverContext: { documents: new Map([['host', host]]) } };
    expect(() =>
      applyCommand(
        toFlat(child),
        { type: 'setDocumentMetadata', name: 'Action', slug: 'host' },
        context,
      ),
    ).toThrow('already in use');
    expect(() =>
      applyCommand(toFlat(child), { type: 'setDocumentMetadata', name: ' ', slug: 'valid' }),
    ).toThrow('needs a name');
    expect(() => validateCatalog([host, { ...child, slug: 'host' }])).toThrow(
      'Duplicate document identifier',
    );
  });
  it('round-trips native and instance classes, deduplicates them and isolates mutable arrays', () => {
    const values = ['hover:bg-blue-600', 'w-[calc(100%-2rem)]', 'hover:bg-blue-600'];
    let document = applyCommand(toFlat(host), {
      type: 'setProp',
      nodeId: 'root',
      prop: 'classes',
      value: values,
    });
    document = applyCommand(document, {
      type: 'setProp',
      nodeId: 'action',
      prop: 'classes',
      value: ['flex'],
    });
    values.push('hidden');
    expect(toFlat(toNested(document))).toEqual(document);
    expect(document.nodes.root?.classes).toEqual(['hover:bg-blue-600', 'w-[calc(100%-2rem)]']);
    expect(document.nodes.action?.classes).toEqual(['flex']);
    expect(() =>
      applyCommand(document, {
        type: 'setProp',
        nodeId: 'root',
        prop: 'classes',
        value: ['two classes'],
      }),
    ).toThrow('without whitespace');
    expect(
      applyCommand(document, { type: 'setProp', nodeId: 'action', prop: 'classes', value: [] })
        .nodes.action?.classes,
    ).toBeUndefined();
  });
});
