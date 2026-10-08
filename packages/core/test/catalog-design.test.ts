import { describe, expect, it } from 'vitest';
import {
  applyCatalogDesignCommand,
  designSliceFromCatalog,
  emptyProjectCatalog,
} from '@facadeur/core';
import { createProjectTemplate } from '@facadeur/tokens';

describe('catalog design commands', () => {
  it('applies setToken on catalog.tokens', () => {
    const catalog = emptyProjectCatalog();
    const next = applyCatalogDesignCommand(catalog, {
      type: 'setToken',
      path: 'color.brand',
      token: { $type: 'color', $value: '#336699' },
    });
    expect(designSliceFromCatalog(next).tokens).toMatchObject({
      color: { brand: expect.objectContaining({ $value: expect.anything() }) },
    });
  });

  it('round-trips breakpoints through the design slice', () => {
    const template = createProjectTemplate();
    const catalog = {
      ...emptyProjectCatalog(),
      globalStyles: { breakpoints: template.breakpoints },
    };
    expect(designSliceFromCatalog(catalog).settings?.breakpoints?.length).toBeGreaterThan(0);
  });
});
