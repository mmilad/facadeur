import { Type } from '@sinclair/typebox';
import { fieldValueSchema } from '../fields';
import { nodeConfigSchema } from './config';
import { domSpecFields } from './dom';
import { schemaSourceSchema } from './schema-source';
import { styleSpecSchema } from './style';
import { uuidSchema } from './uuid';

export const NODE_MODEL_SCHEMA_ID = 'https://github.com/mmilad/facadeur/schema/node-model/node';

export const nodeSchema = Type.Recursive((Self) =>
  Type.Object(
    {
      uuid: uuidSchema,
      name: Type.Optional(Type.String({ minLength: 1 })),
      dom: Type.Object(
        {
          ...domSpecFields,
          children: Type.Optional(Type.Array(Self)),
        },
        { additionalProperties: false },
      ),
      style: Type.Optional(styleSpecSchema),
      schema: Type.Optional(schemaSourceSchema),
      data: Type.Optional(Type.Record(Type.String({ minLength: 1 }), fieldValueSchema)),
      config: Type.Optional(nodeConfigSchema),
    },
    { additionalProperties: false },
  ),
);

export type { Node as NodeModel } from '@facadeur/domain';
