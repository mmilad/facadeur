import { Type } from '@sinclair/typebox';
import { fieldValueSchema } from '../fields';
import { nodeConfigSchema } from './config';
import { domSpecFields } from './dom';
import { schemaSourceSchema } from './schema-source';
import { uuidSchema } from './uuid';

const styleDeclarationsSchema = Type.Record(Type.String({ minLength: 1 }), Type.String());
const styleStatesSchema = Type.Object(
  {
    hover: Type.Optional(styleDeclarationsSchema),
    'focus-visible': Type.Optional(styleDeclarationsSchema),
    disabled: Type.Optional(styleDeclarationsSchema),
  },
  { additionalProperties: false },
);
const styleLayerSchema = Type.Object(
  {
    declarations: Type.Optional(styleDeclarationsSchema),
    states: Type.Optional(styleStatesSchema),
  },
  { additionalProperties: false },
);
const nodeClassStyleSchema = Type.Object(
  {
    declarations: Type.Optional(styleDeclarationsSchema),
    states: Type.Optional(styleStatesSchema),
    variants: Type.Optional(
      Type.Record(
        Type.String({ minLength: 1 }),
        Type.Record(Type.String({ minLength: 1 }), styleLayerSchema),
      ),
    ),
    breakpoints: Type.Optional(Type.Record(uuidSchema, styleLayerSchema)),
  },
  { additionalProperties: false },
);
const nodeClassSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    generated: Type.Optional(Type.Literal(true)),
    condition: Type.Optional(
      Type.Object(
        {
          kind: Type.Literal('prop-equals'),
          propUuid: uuidSchema,
          value: Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]),
        },
        { additionalProperties: false },
      ),
    ),
    style: Type.Optional(nodeClassStyleSchema),
  },
  { additionalProperties: false },
);

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
      classes: Type.Optional(Type.Array(nodeClassSchema)),
      schema: Type.Optional(schemaSourceSchema),
      data: Type.Optional(Type.Record(Type.String({ minLength: 1 }), fieldValueSchema)),
      config: Type.Optional(nodeConfigSchema),
    },
    { additionalProperties: false },
  ),
);

export type { Node as NodeModel } from '@facadeur/domain';
