import { describe, expect, it } from 'vitest';
import { applyCatalogDesignCommand } from '@facadeur/core';
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
    expect(next.tokens).toMatchObject({
      color: { [uuid]: expect.objectContaining({ uuid, label: 'Brand', value: '#336699' }) },
    });
    expect(next.icons).toEqual(catalog.icons);
  });

  it('writes breakpoints directly to global catalog styles', () => {
    const catalog = createExampleCatalog();
    const breakpoints = [...(catalog.globalStyles?.breakpoints ?? [])].reverse();
    const next = applyCatalogDesignCommand(catalog, { type: 'setBreakpoints', breakpoints });

    expect(next.globalStyles?.breakpoints).toEqual(breakpoints);
    expect(next.icons).toEqual(catalog.icons);
  });
});
