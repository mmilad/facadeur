import { describe, expect, it } from 'vitest';
import { createCatalogUuid } from '../src/document/ids';
import { upsertCatalogDesignProp, validateProjectCatalog } from '../src/index';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('catalog design props', () => {
  it('persists props on the catalog model', () => {
    const uuid = createCatalogUuid();
    const catalog = validateProjectCatalog(
      upsertCatalogDesignProp(
        { atoms: {}, components: {}, pages: {} },
        { uuid, name: 'Accent', value: fixtureTokenRef(fixtureIds.tokens.color.accent.default) },
      ),
    );
    expect(catalog.props?.[uuid]?.name).toBe('Accent');
  });
});
