import { Type } from '@sinclair/typebox';
import { uuidSchema } from './uuid';

/** Inline / override CSS declarations (camelCase keys). Values may include `{prop:uuid}` / `{token:uuid}` refs. */
export const styleSpecSchema = Type.Record(Type.String({ minLength: 1 }), Type.String());

export const styleRulesRefSchema = Type.Object(
  {
    kind: Type.Literal('ref'),
    uuid: uuidSchema,
  },
  { additionalProperties: false },
);
