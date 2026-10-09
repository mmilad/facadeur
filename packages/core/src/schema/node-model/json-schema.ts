import { projectCatalogSchema } from './catalog';

/** Plain JSON Schema for Ajv and external tools. */
export function projectCatalogJsonSchema(): Record<string, unknown> {
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/mmilad/facadeur/schema/project-catalog',
    ...(projectCatalogSchema as unknown as Record<string, unknown>),
  } as Record<string, unknown>;
  return schema;
}
