import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    eyebrow: {
      type: 'string',
      'x-facadeur-prop-id': '550e8400-e29b-41d4-a716-000000000201',
    },
    title: {
      type: 'string',
      'x-facadeur-prop-id': '550e8400-e29b-41d4-a716-000000000202',
    },
    body: {
      type: 'string',
      'x-facadeur-prop-id': '550e8400-e29b-41d4-a716-000000000203',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
