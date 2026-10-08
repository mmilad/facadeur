import type { JsonSchemaObject } from '@facadeur/domain';

export const schemaUuid = '550e8400-e29b-41d4-a716-000000000001';

export const schema = {
  type: 'object',
  title: 'Image',
  required: ['src'],
  properties: {
    src: {
      type: 'string',
      title: 'Source',
    },
    alt: {
      type: 'string',
      title: 'Alt text',
    },
    ratio: {
      type: 'string',
      title: 'Ratio',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
