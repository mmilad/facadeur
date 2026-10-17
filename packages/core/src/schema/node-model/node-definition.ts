import { Type } from '@sinclair/typebox';
import { definitionConfigSchema } from './config';
import { nodeSchema } from './node';
import { schemaSourceSchema } from './schema-source';
import { uuidSchema } from './uuid';

const behaviorValueSchema = Type.Recursive((Self) =>
  Type.Union([
    Type.Object(
      { kind: Type.Literal('literal'), value: Type.Union([Type.Unknown(), Type.Null()]) },
      { additionalProperties: false },
    ),
    Type.Object(
      { kind: Type.Literal('state'), name: Type.String({ minLength: 1 }) },
      { additionalProperties: false },
    ),
    Type.Object(
      { kind: Type.Literal('state-after-transition'), name: Type.String({ minLength: 1 }) },
      { additionalProperties: false },
    ),
    Type.Object(
      { kind: Type.Literal('prop'), path: Type.String({ minLength: 1 }) },
      { additionalProperties: false },
    ),
    Type.Object(
      { kind: Type.Literal('event'), path: Type.String({ minLength: 1 }) },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        kind: Type.Literal('operation'),
        operator: Type.Union([
          Type.Literal('not'),
          Type.Literal('add'),
          Type.Literal('subtract'),
          Type.Literal('equals'),
          Type.Literal('toggle'),
        ]),
        values: Type.Array(Self, { minItems: 1 }),
      },
      { additionalProperties: false },
    ),
  ]),
);

const behaviorActionSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal('set-state'),
      name: Type.String({ minLength: 1 }),
      value: behaviorValueSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal('increment'),
      name: Type.String({ minLength: 1 }),
      amount: Type.Optional(Type.Number()),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal('emit'),
      name: Type.String({ minLength: 1 }),
      args: Type.Array(behaviorValueSchema),
    },
    { additionalProperties: false },
  ),
]);

const componentBehaviorSchema = Type.Object(
  {
    state: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.Unknown())),
    transitions: Type.Array(
      Type.Object(
        {
          nodeUuid: uuidSchema,
          event: Type.String({ minLength: 1 }),
          actions: Type.Array(behaviorActionSchema),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const nodeDefinitionKindSchema = Type.Union([
  Type.Literal('atom'),
  Type.Literal('component'),
  Type.Literal('page'),
]);

export const nodeDefinitionSchema = Type.Object(
  {
    uuid: uuidSchema,
    name: Type.String({ minLength: 1 }),
    kind: nodeDefinitionKindSchema,
    category: Type.Optional(
      Type.String({ minLength: 1, description: 'Optional slash-delimited category path.' }),
    ),
    schema: schemaSourceSchema,
    root: nodeSchema,
    behavior: Type.Optional(componentBehaviorSchema),
    config: Type.Optional(definitionConfigSchema),
  },
  { additionalProperties: false },
);

export type { NodeDefinitionModel } from '@facadeur/domain';
