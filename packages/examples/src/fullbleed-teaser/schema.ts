import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  title: 'Full-bleed teaser',
  required: ['title', 'imageSrc'],
  properties: {
    title: {
      type: 'string',
      title: 'Title',
    },
    body: {
      type: 'string',
      title: 'Body',
    },
    imageSrc: {
      type: 'string',
      title: 'Image source',
    },
    imageAlt: {
      type: 'string',
      title: 'Image alt',
    },
    ctaLabel: {
      type: 'string',
      title: 'CTA label',
    },
    ctaHref: {
      type: 'string',
      title: 'CTA href',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
