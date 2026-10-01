import { Type } from '@sinclair/typebox';
import { tokenPathSchema } from './schema-layout.js';
import { tokenTypeSchema } from './schema-fonts.js';

export const componentTokenSchema = Type.Object(
  {
    type: tokenTypeSchema,
    value: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const componentTokensSchema = Type.Record(tokenPathSchema, componentTokenSchema, {
  minProperties: 1,
});
