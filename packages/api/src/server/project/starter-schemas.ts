import type { NamedSchema } from '@facadeur/core';

/** Shared media contracts seeded into every new project. */
export const starterSchemas: NamedSchema[] = [
  {
    id: 'image',
    name: 'Image',
    description: 'Image source, alt text, and aspect ratio.',
    schema: {
      type: 'object',
      title: 'Image',
      required: ['src'],
      properties: {
        src: { type: 'string', title: 'Source' },
        alt: { type: 'string', title: 'Alt text' },
        ratio: { type: 'string', title: 'Ratio' },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'video',
    name: 'Video',
    description: 'Video source, poster frame, and aspect ratio.',
    schema: {
      type: 'object',
      title: 'Video',
      required: ['src'],
      properties: {
        src: { type: 'string', title: 'Source' },
        poster: { type: 'string', title: 'Poster' },
        ratio: { type: 'string', title: 'Ratio' },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'fullbleed-teaser',
    name: 'Full-bleed teaser',
    description: 'Hero image, copy, and call to action.',
    schema: {
      type: 'object',
      title: 'Full-bleed teaser',
      required: ['title', 'imageSrc'],
      properties: {
        title: { type: 'string', title: 'Title' },
        body: { type: 'string', title: 'Body' },
        imageSrc: { type: 'string', title: 'Image source' },
        imageAlt: { type: 'string', title: 'Image alt' },
        ctaLabel: { type: 'string', title: 'CTA label' },
        ctaHref: { type: 'string', title: 'CTA href' },
      },
      additionalProperties: false,
    },
  },
];

export function starterSchemaLibrary() {
  return {
    schemas: starterSchemas,
    assignments: { image: 'image' as const },
  };
}
