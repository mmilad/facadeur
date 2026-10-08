import { FormatRegistry } from '@sinclair/typebox';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!FormatRegistry.Has('uuid')) {
  FormatRegistry.Set('uuid', (value) => typeof value === 'string' && UUID.test(value));
}

export { uuidSchema } from './uuid';
export { schemaSourceSchema } from './schema-source';
export { domSpecSchema, domEventSchema } from './dom';
export { styleSpecSchema, styleRulesRefSchema } from './style';
export {
  previewDataSchema,
  nodeConfigSchema,
  definitionConfigSchema,
} from './config';
export { nodeSchema, NODE_MODEL_SCHEMA_ID, type NodeModel } from './node';
export {
  nodeDefinitionSchema,
  nodeDefinitionKindSchema,
  type NodeDefinitionModel,
} from './node-definition';
export { projectCatalogSchema, type ProjectCatalogModel } from './catalog';
export { projectCatalogJsonSchema } from './json-schema';
