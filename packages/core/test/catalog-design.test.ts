import { describe, expect, it } from 'vitest';
import {
  applyCatalogDesignCommand,
  designSliceFromCatalog,
} from '@facadeur/core';
import { createExampleCatalog } from '@facadeur/examples';
const testUuid6 = globalThis.crypto.randomUUID();

describe('catalog design commands', () => {
  it('applies setToken on catalog.tokens', () => {
    const catalog = createExampleCatalog();
    const uuid = testUuid6;
    const next = applyCatalogDesignCommand(catalog, {
      type: 'setToken',
      family: 'color',
      token: {
        uuid,
        label: 'Brand',
        group: '',
        valueType: 'color',
        value: '#336699',
      },
    });
    expect(designSliceFromCatalog(next).tokens).toMatchObject({
      color: { [uuid]: expect.objectContaining({ uuid, label: 'Brand', value: '#336699' }) },
    });
  });

  it('round-trips breakpoints through the design slice', () => {
    const catalog = createExampleCatalog();
    expect(designSliceFromCatalog(catalog).settings?.breakpoints).toEqual(
      catalog.globalStyles?.breakpoints,
    );
  });
});
