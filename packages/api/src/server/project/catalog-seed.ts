import type { NodeDefinitionModel, ProjectCatalogModel } from '@facadeur/core';
import { createExampleCatalog, EXAMPLE_CATALOG_IDS } from '@facadeur/examples';

/** Stable ids for starter catalog entries (rename display names freely). */
export const IMAGE_SCHEMA_UUID = EXAMPLE_CATALOG_IDS.imageSchema;
export const IMAGE_ATOM_UUID = EXAMPLE_CATALOG_IDS.image;
export const IMAGE_ROOT_UUID = EXAMPLE_CATALOG_IDS.imageRoot;

export function imageAtomDefinition(): NodeDefinitionModel {
  return createExampleCatalog().atoms[IMAGE_ATOM_UUID]!;
}

export function seedProjectCatalog(): ProjectCatalogModel {
  return createExampleCatalog();
}
