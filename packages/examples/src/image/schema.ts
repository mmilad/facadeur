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
      'x-facadeur-prop-id': '550e8400-e29b-41d4-a716-000000000101',
    },
    alt: {
      type: 'string',
      title: 'Alt text',
      'x-facadeur-prop-id': '550e8400-e29b-41d4-a716-000000000102',
    },
    ratio: {
      type: 'string',
      title: 'Ratio',
      'x-facadeur-prop-id': '550e8400-e29b-41d4-a716-000000000103',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
