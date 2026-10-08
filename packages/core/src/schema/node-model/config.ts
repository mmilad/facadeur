import { Type } from '@sinclair/typebox';
import { fieldValueSchema } from '../fields';
import { uuidSchema } from './uuid';

export const previewDataSchema = Type.Object(
  {
    fields: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.Unknown())),
  },
  { additionalProperties: false },
);

export const nodeConfigSchema = Type.Object(
  {
    definitionRef: Type.Optional(uuidSchema),
    previewData: Type.Optional(previewDataSchema),
  },
  { additionalProperties: false },
);

export const definitionConfigSchema = Type.Object(
  {
    previewData: Type.Optional(previewDataSchema),
  },
  { additionalProperties: false },
);
