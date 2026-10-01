import { describe, expect, it } from 'vitest';
import { toFlat, type DocumentFile } from '@facadeur/core';
import { resolveInstanceVariantContext } from '../src/domain/instance-variant-context.js';

const target: DocumentFile = {
  version: 1,
  id: 'target',
  name: 'Target',
  kind: 'component',
  variants: [
    { name: 'default' },
    { name: 'compact', overrides: { nodes: { root: { text: 'Compact' } } } },
  ],
  root: { id: 'root', type: 'text', text: 'Default' },
};

function owner(overrides: Record<string, unknown> = {}): DocumentFile {
  return {
    version: 1,
    id: 'owner',
    name: 'Owner',
    kind: 'component',
    fields: [{ name: 'compact', type: 'boolean', default: false }],
    root: {
      id: 'root',
      type: 'frame',
      children: [
        {
          id: 'instance',
          type: 'instance',
          component: 'target',
          ...overrides,
        },
      ],
    },
  };
}

describe('selected instance variant context', () => {
  it('resolves an explicit fixed nested preset', () => {
    const ownerDocument = toFlat(owner({ variants: { variant: 'compact' } }));
    const selected = ownerDocument.nodes.instance;
    if (!selected || selected.type !== 'instance') throw new Error('fixture');
    const result = resolveInstanceVariantContext({
      ownerDocument,
      instance: selected,
      targetDocument: toFlat(target),
    });

    expect(result.variantName).toBe('compact');
    expect(result.source).toBe('fixed');
    expect(result.document.nodes.root).toMatchObject({ text: 'Compact' });
  });

  it('uses the first matching rule against owner preview data', () => {
    const ownerDocument = toFlat(
      owner({
        variantRules: [{ when: { path: 'compact', truthy: true }, variant: 'compact' }],
      }),
    );
    const selected = ownerDocument.nodes.instance;
    if (!selected || selected.type !== 'instance') throw new Error('fixture');
    const result = resolveInstanceVariantContext({
      ownerDocument: { ...ownerDocument, previewData: { fields: { compact: true } } },
      instance: selected,
      targetDocument: toFlat(target),
    });

    expect(result.variantName).toBe('compact');
    expect(result.source).toBe('rule');
    expect(result.data.compact).toBe(true);
  });

  it('materializes owner preset instance data before resolving nested rules', () => {
    const document = owner();
    document.variants = [
      {
        name: 'compact-owner',
        overrides: { nodes: { instance: { variants: { variant: 'compact' } } } },
      },
    ];
    const ownerDocument = toFlat(document);
    const baseInstance = ownerDocument.nodes.instance;
    if (!baseInstance || baseInstance.type !== 'instance') throw new Error('fixture');
    const result = resolveInstanceVariantContext({
      ownerDocument,
      ownerVariantName: 'compact-owner',
      instance: baseInstance,
      targetDocument: toFlat(target),
    });

    expect(result.variantName).toBe('compact');
    expect(result.source).toBe('preset');
    expect(result.ownerInstance.variants).toEqual({ variant: 'compact' });
  });
});
