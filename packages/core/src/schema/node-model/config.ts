import { Type } from '@sinclair/typebox';
import { uuidSchema } from './uuid';
import { fieldValueSchema } from '../fields';

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
    definitionRefBinding: Type.Optional(
      Type.Object(
        { kind: Type.Literal('item'), path: Type.String({ minLength: 1 }) },
        { additionalProperties: false },
      ),
    ),
    composition: Type.Optional(
      Type.Union([
        Type.Object(
          {
            kind: Type.Literal('repeater'),
            source: Type.Optional(
              Type.Union([
                Type.Object(
                  { kind: Type.Literal('prop'), uuid: uuidSchema },
                  { additionalProperties: false },
                ),
                Type.Object(
                  { kind: Type.Literal('item'), path: Type.String({ minLength: 1 }) },
                  { additionalProperties: false },
                ),
              ]),
            ),
          },
          { additionalProperties: false },
        ),
        Type.Object(
          {
            kind: Type.Literal('switch'),
            source: Type.Optional(
              Type.Union([
                Type.Object(
                  { kind: Type.Literal('prop'), uuid: uuidSchema },
                  { additionalProperties: false },
                ),
                Type.Object(
                  { kind: Type.Literal('item'), path: Type.String({ minLength: 1 }) },
                  { additionalProperties: false },
                ),
              ]),
            ),
          },
          { additionalProperties: false },
        ),
        Type.Object({ kind: Type.Literal('slot') }, { additionalProperties: false }),
      ]),
    ),
    compositionCase: Type.Optional(Type.String({ minLength: 1 })),
    previewData: Type.Optional(previewDataSchema),
  },
  { additionalProperties: false },
);

export const definitionConfigSchema = Type.Object(
  {
    previewData: Type.Optional(previewDataSchema),
    fieldExposure: Type.Optional(Type.Record(uuidSchema, fieldExposureSchema)),
    staticFields: Type.Optional(
      Type.Record(
        Type.String({ minLength: 1 }),
        Type.Object(
          {
            isStatic: Type.Literal(true),
            value: Type.Optional(fieldValueSchema),
            expose: Type.Optional(Type.Boolean()),
          },
          { additionalProperties: false },
        ),
      ),
    ),
    instanceFieldConfigs: Type.Optional(
      Type.Record(
        uuidSchema,
        Type.Record(
          Type.String({ minLength: 1 }),
          Type.Object(
            {
              isStatic: Type.Literal(true),
              value: Type.Optional(fieldValueSchema),
              expose: Type.Optional(Type.Boolean()),
            },
            { additionalProperties: false },
          ),
        ),
      ),
    ),
  },
  { additionalProperties: false },
);
