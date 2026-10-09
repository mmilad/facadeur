import { Type } from '@sinclair/typebox';
import { fieldValueSchema } from '../fields';

export const domEventSchema = Type.Record(Type.String({ minLength: 1 }), Type.Unknown());

const domSpecFields = {
  tagName: Type.String({ minLength: 1, pattern: '^[A-Za-z][A-Za-z0-9-]*$' }),
  text: Type.Optional(Type.String()),
  attributes: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.String())),
  data: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.String())),
  properties: Type.Optional(Type.Record(Type.String({ minLength: 1 }), fieldValueSchema)),
  event: Type.Optional(domEventSchema),
};

export const domSpecSchema = Type.Object(domSpecFields, { additionalProperties: false });

export { domSpecFields };
