import { describe, expect, it } from 'vitest';
import { CoreController } from '@facadeur/core';
import { catalogAssetSummaries } from '../../src/domain/catalog/asset-list';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';

const imageAtomUuid = exampleIds.components.image.definition;

describe('catalogAssetSummaries', () => {
  it('lists example atoms with stable ids', () => {
    const assets = catalogAssetSummaries(new CoreController(createExampleCatalog()));
    expect(assets.some((asset) => asset.id === imageAtomUuid && asset.kind === 'atom')).toBe(true);
  });

  it('uses schema title when stored name is a uuid', () => {
    const catalog = createExampleCatalog();
    const atom = catalog.atoms[imageAtomUuid]!;
    catalog.atoms[imageAtomUuid] = { ...atom, name: imageAtomUuid };
    const assets = catalogAssetSummaries(new CoreController(catalog));
    expect(assets.find((asset) => asset.id === imageAtomUuid)?.name).toBe('Image');
  });

  it('sorts assets by display name', () => {
    const catalog = createExampleCatalog();
    const assets = catalogAssetSummaries(new CoreController(catalog));
    const names = assets.map((asset) => asset.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });
});
