import { Type } from '@sinclair/typebox';
import { uuidSchema } from './uuid';

export const schemaSourceSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal('ref'),
      uuid: uuidSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal('inline'),
      schema: Type.Record(Type.String(), Type.Unknown()),
    },
    { additionalProperties: false },
  ),
]);
