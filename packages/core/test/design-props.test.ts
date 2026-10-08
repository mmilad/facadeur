import { describe, expect, it } from 'vitest';
import { createCatalogUuid } from '../src/document/ids';
import { upsertCatalogDesignProp, validateProjectCatalog } from '../src/index';

describe('catalog design props', () => {
  it('persists props on the catalog model', () => {
    const uuid = createCatalogUuid();
    const catalog = validateProjectCatalog(
      upsertCatalogDesignProp(
        { atoms: {}, components: {}, pages: {} },
        { uuid, name: 'Accent', value: '{color.brand.primary}' },
      ),
    );
    expect(catalog.props?.[uuid]?.name).toBe('Accent');
  });
});
