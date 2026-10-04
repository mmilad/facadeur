import { Type } from '@sinclair/typebox';
import { ID_PATTERN } from '../document/ids.js';
import { tokenPathSchema } from './layout.js';
import { tokenTypeSchema } from './fonts.js';

export const componentTokenSchema = Type.Object(
  {
    path: tokenPathSchema,
    type: tokenTypeSchema,
    value: Type.String({ minLength: 1 }),
    label: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const componentTokenIdSchema = Type.String({ pattern: ID_PATTERN.source });

export const componentTokensSchema = Type.Record(componentTokenIdSchema, componentTokenSchema, {
  minProperties: 1,
});
