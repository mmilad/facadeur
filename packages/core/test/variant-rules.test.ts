import { describe, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile } from '@facadeur/core';

const child: DocumentFile = {
  version: 1,
  id: 'input',
  name: 'Input',
  kind: 'atom',
  variants: [{ name: 'error' }],
  root: { id: 'root', type: 'text' },
};
const parent: DocumentFile = {
  version: 1,
  id: 'parent',
  name: 'Parent',
  kind: 'component',
  fields: [{ name: 'invalid', type: 'boolean' }],
  root: {
    id: 'root',
    type: 'frame',
    children: [
      {
        id: 'control',
        type: 'instance',
        component: 'input',
        variantRules: [{ when: { path: 'invalid', truthy: true }, variant: 'error' }],
      },
    ],
  },
};

describe('conditional variant contract', () => {
  it('validates the owning field and the target variant', () => {
    expect(validateCatalog([parent, child])).toHaveLength(2);
    const invalid = structuredClone(parent);
    if (invalid.root.type !== 'frame' || invalid.root.children?.[0]?.type !== 'instance')
      throw new Error('fixture');
    invalid.root.children[0].variantRules = [
      { when: { path: 'unknown', truthy: true }, variant: 'error' },
    ];
    expect(() => validateCatalog([invalid, child])).toThrow();
    invalid.root.children[0].variantRules = [
      { when: { path: 'invalid', truthy: true }, variant: 'missing' },
    ];
    expect(() => validateCatalog([invalid, child])).toThrow();
  });
});
