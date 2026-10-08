import type { NodeDefinitionModel, ProjectCatalogModel } from '@facadeur/core';
import { createExampleCatalog, image, imageSchemaUuid } from '@facadeur/examples';

/** Stable ids for starter catalog entries (rename display names freely). */
export const IMAGE_SCHEMA_UUID = imageSchemaUuid;
export const IMAGE_ATOM_UUID = image.uuid;
export const IMAGE_ROOT_UUID = image.root.uuid;

export function imageAtomDefinition(): NodeDefinitionModel {
  return createExampleCatalog().atoms[IMAGE_ATOM_UUID]!;
}

export function seedProjectCatalog(): ProjectCatalogModel {
  return createExampleCatalog();
}
