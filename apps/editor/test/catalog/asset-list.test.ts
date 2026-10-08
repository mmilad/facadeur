import { describe, expect, it } from 'vitest';
import { catalogAssetSummaries } from '../../src/domain/catalog/asset-list';
import { IMAGE_ATOM_UUID, seedProjectCatalog } from '@facadeur/api/server';

describe('catalogAssetSummaries', () => {
  it('lists seeded atoms with stable ids', () => {
    const assets = catalogAssetSummaries(seedProjectCatalog());
    expect(assets.some((asset) => asset.id === IMAGE_ATOM_UUID && asset.kind === 'atom')).toBe(true);
  });

  it('uses schema title when stored name is a uuid', () => {
    const catalog = seedProjectCatalog();
    const atom = catalog.atoms[IMAGE_ATOM_UUID]!;
    catalog.atoms[IMAGE_ATOM_UUID] = { ...atom, name: IMAGE_ATOM_UUID };
    const assets = catalogAssetSummaries(catalog);
    expect(assets.find((asset) => asset.id === IMAGE_ATOM_UUID)?.name).toBe('Image');
  });

  it('sorts assets by display name', () => {
    const catalog = seedProjectCatalog();
    const assets = catalogAssetSummaries(catalog);
    const names = assets.map((asset) => asset.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });
});
