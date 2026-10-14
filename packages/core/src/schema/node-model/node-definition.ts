import { Type } from '@sinclair/typebox';
import { definitionConfigSchema } from './config';
import { nodeSchema } from './node';
import { schemaSourceSchema } from './schema-source';
import { styleRulesRefSchema } from './style';
import { uuidSchema } from './uuid';

export const nodeDefinitionKindSchema = Type.Union([
  Type.Literal('atom'),
  Type.Literal('component'),
  Type.Literal('page'),
]);

export const nodeDefinitionSchema = Type.Object(
  {
    uuid: uuidSchema,
    name: Type.String({ minLength: 1 }),
    kind: nodeDefinitionKindSchema,
    category: Type.Optional(
      Type.String({ minLength: 1, description: 'Optional slash-delimited category path.' }),
    ),
    schema: schemaSourceSchema,
    root: nodeSchema,
    style: Type.Optional(styleRulesRefSchema),
    config: Type.Optional(definitionConfigSchema),
  },
  { additionalProperties: false },
);

export type { NodeDefinitionModel } from '@facadeur/domain';
