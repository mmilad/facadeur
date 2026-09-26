import { describe, expect, it } from 'vitest';
import { validateCatalog } from '@facadeur/core';
import { blankAsset } from '../src/domain/new-asset.js';

describe('blankAsset', () => {
  it('names a new frame document and avoids ids already in the catalog', () => {
    const first = blankAsset('component', []);
    expect(first).toMatchObject({
      version: 1,
      id: 'new-component',
      name: 'New component',
      kind: 'component',
      root: { id: 'root', type: 'frame', name: 'Frame' },
    });

    const second = blankAsset('component', [first]);
    expect(second.id).toBe('new-component-2');
    expect(second.name).toBe('New component 2');
    expect(validateCatalog([first, second]).map((doc) => doc.id)).toEqual([
      'new-component',
      'new-component-2',
    ]);
  });

  it('keeps a page root as a frame', () => {
    const page = blankAsset('page', [{ id: 'new-page', name: 'Something else' }]);
    expect(page.id).not.toBe('new-page');
    expect(page.root.type).toBe('frame');
    expect(validateCatalog([page])).toHaveLength(1);
  });
});
