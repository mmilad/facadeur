import { Type } from '@sinclair/typebox';
import { fieldValueSchema } from '../fields';
import { uuidSchema } from './uuid';

export const previewDataSchema = Type.Object(
  {
    fields: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.Unknown())),
  },
  { additionalProperties: false },
);

export const fieldExposureSchema = Type.Union([
  Type.Object({ mode: Type.Literal('flat') }, { additionalProperties: false }),
  Type.Object(
    {
      mode: Type.Literal('grouped'),
      groupName: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      mode: Type.Literal('manual'),
      fields: Type.Record(Type.String({ minLength: 1 }), Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
]);

export const nodeConfigSchema = Type.Object(
  {
    definitionRef: Type.Optional(uuidSchema),
    previewData: Type.Optional(previewDataSchema),
    fieldExposure: Type.Optional(fieldExposureSchema),
  },
  { additionalProperties: false },
);

export const definitionConfigSchema = Type.Object(
  {
    previewData: Type.Optional(previewDataSchema),
    fieldExposure: Type.Optional(fieldExposureSchema),
  },
  { additionalProperties: false },
);
