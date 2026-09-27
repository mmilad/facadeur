import { describe, expect, it } from 'vitest';
import { resolveVariantDocument, validateCatalog, type DocumentFile } from '../src/index.js';

const specimen: DocumentFile = {
  version: 1,
  id: 'variant-specimen',
  name: 'Variant specimen',
  kind: 'component',
  fields: [{ name: 'label', type: 'text', default: 'Base' }],
  variants: [
    { name: 'default' },
    {
      name: 'compact',
      overrides: {
        fields: { label: 'Compact' },
        nodes: { lede: { text: 'Short' } },
        removed: ['body'],
        insertions: [
          {
            parent: 'root',
            index: 0,
            node: { id: 'badge', type: 'text', text: 'New' },
          },
        ],
      },
    },
  ],
  root: {
    id: 'root',
    type: 'frame',
    children: [
      { id: 'lede', type: 'text', text: 'Long' },
      { id: 'body', type: 'text', text: 'Body' },
    ],
  },
};

describe('variant overlays', () => {
  it('keep the base tree and resolve removed, changed, and inserted nodes', () => {
    expect(() => validateCatalog([specimen])).not.toThrow();

    const compact = resolveVariantDocument(specimen, 'compact');
    expect(specimen.root).toMatchObject({
      children: [{ id: 'lede' }, { id: 'body' }],
    });
    expect(compact.fields?.[0]?.default).toBe('Compact');
    expect(compact.root).toMatchObject({
      children: [
        { id: 'badge', type: 'text', text: 'New' },
        { id: 'lede', type: 'text', text: 'Short' },
      ],
    });
  });

  it('falls back to the base document for unknown or default variants', () => {
    expect(resolveVariantDocument(specimen, 'missing')).toEqual(specimen);
    expect(resolveVariantDocument(specimen, 'default')).toEqual(specimen);
  });
});
