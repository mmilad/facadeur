import type { JsonSchemaObject } from '@facadeur/domain';

export const propIds = {
  eyebrow: '550e8400-e29b-41d4-a716-000000000201',
  title: '550e8400-e29b-41d4-a716-000000000202',
  body: '550e8400-e29b-41d4-a716-000000000203',
} as const;

export const schema = {
  type: 'object',
  properties: {
    eyebrow: {
      type: 'string',
      'x-facadeur-prop-id': propIds.eyebrow,
    },
    title: {
      type: 'string',
      'x-facadeur-prop-id': propIds.title,
    },
    body: {
      type: 'string',
      'x-facadeur-prop-id': propIds.body,
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
