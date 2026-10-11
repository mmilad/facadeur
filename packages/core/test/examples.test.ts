import { describe, expect, it } from 'vitest';
import { validateProjectCatalog } from '@facadeur/core';
import { createExampleCatalog, exampleCatalogDefinitions } from '@facadeur/examples';

describe('examples', () => {
  it('validates the canonical example catalog and its UUID keyed resources', () => {
    const catalog = validateProjectCatalog(createExampleCatalog());
    const definitions = exampleCatalogDefinitions();

    expect(Object.keys(catalog.atoms).length).toBeGreaterThan(0);
    expect(Object.keys(catalog.components).length).toBeGreaterThan(0);
    expect(Object.keys(catalog.pages).length).toBeGreaterThan(0);
    expect(definitions).toHaveLength(
      Object.keys(catalog.atoms).length +
        Object.keys(catalog.components).length +
        Object.keys(catalog.pages).length,
    );
    for (const family of ['color', 'space', 'radius', 'shadow', 'type', 'font'] as const) {
      for (const [uuid, token] of Object.entries(catalog.tokens?.[family] ?? {})) {
        expect(token.uuid).toBe(uuid);
      }
    }
    expect(catalog.globalStyles?.breakpoints?.length).toBeGreaterThan(0);
    expect(catalog.globalStyles?.breakpoints?.every((breakpoint) => Boolean(breakpoint.uuid))).toBe(
      true,
    );
  });
});
