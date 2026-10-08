import { DTCG_DEFS } from '../fonts';
import { projectCatalogSchema } from './catalog';

/** Plain JSON Schema for Ajv and external tools. */
export function projectCatalogJsonSchema(): Record<string, unknown> {
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/mmilad/facadeur/schema/project-catalog',
    ...(projectCatalogSchema as unknown as Record<string, unknown>),
    $defs: DTCG_DEFS,
  } as Record<string, unknown>;
  const properties = schema.properties as Record<string, unknown> | undefined;
  if (properties) {
    properties.tokens = { $ref: '#/$defs/dtcgNode' };
  }
  return schema;
}
