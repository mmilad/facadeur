import { Type } from '@sinclair/typebox';
import { uuidSchema } from './uuid';

export const styleRulesRefSchema = Type.Object(
  {
    kind: Type.Literal('ref'),
    uuid: uuidSchema,
  },
  { additionalProperties: false },
);
